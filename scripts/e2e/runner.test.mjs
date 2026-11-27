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
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../../exampleCordova/package.json', import.meta.url))
const { build } = require('esbuild')
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../../exampleReactNative/src/tests/TestSuite.ts', import.meta.url))], bundle: true, format: 'esm', write: false })
const { TestSuite, TestTimeout } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

test('executes async hooks in order, awaits cleanup, and permits reruns', async () => {
  const calls = []
  class Suite extends TestSuite {
    async beforeAll() { calls.push('beforeAll') }
    async beforeEach() { calls.push('beforeEach') }
    async testCase() { this.assertEquals(1, 1); calls.push('test') }
    async afterEach(_name, success) { assert.equal(success, true); calls.push('afterEach') }
    async afterAll() { await Promise.resolve(); calls.push('afterAll') }
  }
  const suite = new Suite()
  for (let i = 0; i < 2; i++) {
    const results = []
    await suite.runAllTests(async result => { results.push(result) })
    assert.equal(results.length, 1)
    assert.equal(results[0].status, 'passed')
  }
  assert.deepEqual(calls, Array(2).fill(['beforeAll', 'beforeEach', 'test', 'afterEach', 'afterAll']).flat())
})

test('setup failure fails every case and still runs suite cleanup', async () => {
  let cleaned = false
  class Suite extends TestSuite {
    beforeAll() { throw new Error('secret SDK response') }
    testOne() { assert.fail('must not run') }
    testTwo() { assert.fail('must not run') }
    async afterAll() { cleaned = true }
  }
  const results = []
  await new Suite().runAllTests(async result => { results.push(result) })
  assert.equal(cleaned, true)
  assert.equal(results.length, 2)
  assert.ok(results.every(result => result.status === 'failed'))
  assert.ok(!JSON.stringify(results).includes('secret SDK response'))
})

test('per-test cleanup failure overrides a passing or skipped case', async () => {
  class Suite extends TestSuite {
    testPass() {}
    testSkip() { this.skip('optional provider absent') }
    afterEach() { throw new Error('cleanup failed') }
    afterAll() { throw new Error('suite cleanup failed') }
  }
  const results = []
  await new Suite().runAllTests(async result => { results.push(result) })
  assert.deepEqual(results.map(result => [result.name, result.status]), [['testPass', 'failed'], ['testSkip', 'failed'], ['[afterAll]', 'failed']])
})

test('failed beforeEach still cleans up and does not hide later test results', async () => {
  let cleanup = 0
  class Suite extends TestSuite {
    beforeEach(name) { if (name === 'testOne') throw new Error('failed') }
    testOne() { assert.fail('must not run') }
    testTwo() {}
    async afterEach() { cleanup++ }
  }
  const results = []
  await new Suite().runAllTests(async result => { results.push(result) })
  assert.equal(cleanup, 2)
  assert.deepEqual(results.map(result => result.status), ['failed', 'passed'])
})

test('timeout fails pending tests, runs cleanup, and aborts subsequent suites', async () => {
  let cleaned = false
  class Suite extends TestSuite {
    testHang() { return new Promise(() => {}) }
    testNext() { assert.fail('must not run') }
    async afterAll() { cleaned = true }
  }
  const results = []
  await assert.rejects(new Suite().runAllTests(async result => { results.push(result) }, 10), TestTimeout)
  assert.ok(results.every(result => result.status === 'failed'))
  assert.equal(cleaned, true)
})

test('assertions and explicit skips are recorded without assertion values', async () => {
  class Suite extends TestSuite {
    testFailure() { this.assertEquals('private value', 'other value') }
    testSkip() { this.skip('providerId not configured') }
  }
  const results = []
  await new Suite().runAllTests(async result => { results.push(result) })
  assert.deepEqual(results.map(result => result.status), ['failed', 'skipped'])
  assert.ok(!JSON.stringify(results).includes('private value'))
})

test('throwing a falsey value still fails the case', async () => {
  class Suite extends TestSuite {
    testUndefined() { throw undefined }
    testNull() { throw null }
    testZero() { throw 0 }
  }
  const results = []
  await new Suite().runAllTests(async result => { results.push(result) })
  assert.deepEqual(results.map(result => result.status), ['failed', 'failed', 'failed'])
})

test('existing null/undefined assertion compatibility is preserved', async () => {
  class Suite extends TestSuite {
    testAbsentHeader() { this.assertEquals(new Headers().get('user-agent'), undefined) }
  }
  const results = []
  await new Suite().runAllTests(async result => { results.push(result) })
  assert.equal(results[0].status, 'passed')
})
