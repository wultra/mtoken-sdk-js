//
// Copyright 2026 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createCollector } from './collector.mjs'

async function fixture(t, timeout = 10000, allowedSkips = []) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mtoken-collector-'))
  const collector = await createCollector({ runId: 'test-id', out, platform: 'ios', runtime: 'rn', timeout, allowedSkips })
  t.after(async () => { await collector.stop(); fs.rmSync(out, { recursive: true, force: true }) })
  let sequence = 0
  return { ...collector, out, send: (type, data = {}, extra = {}) => fetch(`http://127.0.0.1:${collector.port}/events`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId: 'test-id', sequence: sequence++, type, ...data, ...extra })
  }) }
}
const item = { suite: 'Suite', name: 'testOne' }

test('a complete native result writes passing JUnit and summary', async t => {
  const collector = await fixture(t)
  assert.equal((await collector.send('start', { tests: [item] })).status, 204)
  assert.equal((await collector.send('result', { result: { ...item, status: 'passed', duration: 12 } })).status, 204)
  assert.equal((await collector.send('complete')).status, 204)
  assert.equal((await collector.done).success, true)
  assert.match(fs.readFileSync(path.join(collector.out, 'junit.xml'), 'utf8'), /tests="1" failures="0"/)
})

for (const status of ['failed', 'skipped']) {
  test(`${status} cases cannot pass CI; messages are XML escaped`, async t => {
    const collector = await fixture(t)
    await collector.send('start', { tests: [item] })
    await collector.send('result', { result: { ...item, status, duration: 0, message: '<tag a="x">&\u0001' } })
    await collector.send('complete')
    assert.equal((await collector.done).success, false)
    const junit = fs.readFileSync(path.join(collector.out, 'junit.xml'), 'utf8')
    assert.match(junit, /&lt;tag a=&quot;x&quot;&gt;&amp;/)
    assert.ok(!junit.includes('\u0001'))
  })
}

test('missing tests or completion time out with failing JUnit', async t => {
  const collector = await fixture(t, 100)
  await collector.send('start', { tests: [item] })
  assert.equal((await collector.send('complete')).status, 400)
  const summary = await collector.done
  assert.equal(summary.success, false)
  assert.equal(summary.missing, 1)
  assert.match(fs.readFileSync(path.join(collector.out, 'junit.xml'), 'utf8'), /Result missing|Timed out/)
})

test('an empty application or a startup failure never passes', async t => {
  const collector = await fixture(t, 50)
  assert.equal((await collector.send('start', { tests: [] })).status, 400)
  assert.equal((await collector.done).success, false)
})

test('wrong run, sequence, duplicate or unknown cases are rejected', async t => {
  const collector = await fixture(t)
  assert.equal((await collector.send('start', { tests: [item] }, { runId: 'stale' })).status, 400)
  assert.equal((await collector.send('start', { tests: [item] }, { sequence: 0 })).status, 204)
  assert.equal((await collector.send('result', { result: { ...item, name: 'unknown', status: 'passed', duration: 0 } }, { sequence: 1 })).status, 400)
  assert.equal((await collector.send('result', { result: { ...item, status: 'passed', duration: 0 } }, { sequence: 1 })).status, 204)
  assert.equal((await collector.send('result', { result: { ...item, status: 'passed', duration: 0 } }, { sequence: 2 })).status, 400)
})

test('suite teardown failure is accepted as an extra failing case', async t => {
  const collector = await fixture(t)
  await collector.send('start', { tests: [item] })
  await collector.send('result', { result: { ...item, status: 'passed', duration: 0 } })
  await collector.send('result', { result: { ...item, name: '[afterAll]', status: 'failed', duration: 0 } })
  await collector.send('complete')
  const summary = await collector.done
  assert.equal(summary.failures, 1)
  assert.equal(summary.success, false)
})

for (const allowed of ['Suite', 'Suite.testOne']) {
  test(`skips explicitly allowed by "${allowed}" pass but stay visible`, async t => {
    const collector = await fixture(t, 10000, [allowed])
    await collector.send('start', { tests: [item] })
    await collector.send('result', { result: { ...item, status: 'skipped', duration: 0, message: 'provider absent' } })
    await collector.send('complete')
    const summary = await collector.done
    assert.equal(summary.success, true)
    assert.equal(summary.skipped, 1)
    assert.equal(summary.unexpectedSkips, 0)
    assert.deepEqual(collector.problems(), [])
    assert.match(fs.readFileSync(path.join(collector.out, 'junit.xml'), 'utf8'), /<skipped message="provider absent"/)
  })
}

test('allowed skips do not cover other suites, cases or failures', async t => {
  const collector = await fixture(t, 10000, ['Suite.testOther', 'Other'])
  const failed = { suite: 'Suite', name: 'testFailed' }
  await collector.send('start', { tests: [item, failed] })
  await collector.send('result', { result: { ...item, status: 'skipped', duration: 0 } })
  await collector.send('result', { result: { ...failed, status: 'failed', duration: 0 } })
  await collector.send('complete')
  const summary = await collector.done
  assert.equal(summary.success, false)
  assert.equal(summary.unexpectedSkips, 1)
  assert.deepEqual(collector.problems().map(test => [test.name, test.status]), [['testOne', 'skipped'], ['testFailed', 'failed']])
})

test('fail() ends a run in progress with a failing reason', async t => {
  const collector = await fixture(t)
  await collector.send('start', { tests: [item] })
  collector.fail('Native app process exited before the run completed')
  const summary = await collector.done
  assert.equal(summary.success, false)
  assert.equal(summary.missing, 1)
  assert.match(fs.readFileSync(path.join(collector.out, 'junit.xml'), 'utf8'), /Native app process exited/)
  assert.equal((await collector.send('result', { result: { ...item, status: 'passed', duration: 0 } })).status, 400)
})
