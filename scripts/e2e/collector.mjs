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

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const key = test => JSON.stringify([test.suite, test.name])
const validName = value => typeof value === 'string' && value.length > 0 && value.length < 512
const xml = value => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  .replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character])

/**
 * Collect a single native app run. A missing, partial or failed run fails CI, and so does
 * a skipped case unless `allowedSkips` lists its suite (`Suite`) or case (`Suite.testName`).
 */
export async function createCollector({ runId, out, platform, runtime, timeout = 45 * 60 * 1000, allowedSkips = [] }) {
  const skipAllowed = test => allowedSkips.includes(test.suite) || allowedSkips.includes(`${test.suite}.${test.name}`)
  fs.mkdirSync(out, { recursive: true })
  const results = new Map()
  let manifest
  let sequence = 0
  let finished = false
  let idleTimer
  let resolveStarted
  const started = new Promise(resolve => { resolveStarted = resolve })
  let resolveDone
  const done = new Promise(resolve => { resolveDone = resolve })
  const persist = (complete, reason) => {
    const tests = [...results.values()]
    const missing = manifest?.filter(test => !results.has(key(test))) ?? []
    const failures = tests.filter(test => test.status === 'failed').length
    const skipped = tests.filter(test => test.status === 'skipped').length
    const unexpectedSkips = tests.filter(test => test.status === 'skipped' && !skipAllowed(test)).length
    const success = complete && !!manifest?.length && missing.length === 0 && failures === 0 && unexpectedSkips === 0 && !reason
    const summary = { platform, runtime, complete, success, expected: manifest?.length ?? 0, received: tests.length, failures, skipped, unexpectedSkips, missing: missing.length, reason }
    fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2))
    const cases = tests.concat(missing.map(test => ({ ...test, status: 'failed', duration: 0, message: reason ?? 'Result missing' })))
    if (reason) cases.push({ suite: 'runner', name: 'completion', status: 'failed', duration: 0, message: reason })
    const failureCount = cases.filter(test => test.status === 'failed').length
    const body = cases.map(test => `<testcase classname="${xml(test.suite)}" name="${xml(test.name)}" time="${test.duration / 1000}">` +
      (test.status === 'failed' ? `<failure message="${xml(test.message ?? 'Test failed')}"/>` : test.status === 'skipped' ? `<skipped message="${xml(test.message ?? 'Skipped')}"/>` : '') + '</testcase>').join('\n')
    fs.writeFileSync(path.join(out, 'junit.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites><testsuite name="${xml(`${runtime}-${platform}`)}" tests="${cases.length}" failures="${failureCount}" skipped="${skipped}">\n${body}\n</testsuite></testsuites>\n`)
    return summary
  }
  const finish = reason => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    clearTimeout(idleTimer)
    resolveDone(persist(!reason, reason))
  }
  const server = http.createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Headers', 'content-type')
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return }
    if (request.method !== 'POST' || request.url !== '/events') { response.writeHead(404).end(); return }
    try {
      let body = ''
      for await (const chunk of request) {
        body += chunk
        if (body.length > 1024 * 1024) throw new Error('Event too large')
      }
      const event = JSON.parse(body)
      if (finished || event.runId !== runId || event.sequence !== sequence) throw new Error('Invalid run or sequence')
      if (event.type === 'start') {
        if (manifest || !Array.isArray(event.tests) || event.tests.length === 0 || event.tests.length > 10000 ||
            !event.tests.every(test => validName(test.suite) && validName(test.name)) ||
            new Set(event.tests.map(key)).size !== event.tests.length) throw new Error('Invalid manifest')
        manifest = event.tests.map(({ suite, name }) => ({ suite, name }))
      } else if (event.type === 'result') {
        const test = event.result
        if (!manifest || !test || !['passed', 'failed', 'skipped'].includes(test.status) ||
            !Number.isFinite(test.duration) || test.duration < 0 ||
            (test.message !== undefined && (typeof test.message !== 'string' || test.message.length > 4096)) ||
            results.has(key(test)) || !manifest.some(item => key(item) === key(test) ||
              (item.suite === test.suite && test.name === '[afterAll]' && test.status === 'failed'))) throw new Error('Invalid result')
        results.set(key(test), { suite: test.suite, name: test.name, status: test.status, duration: test.duration, message: test.message })
      } else if (event.type === 'complete') {
        if (!manifest || manifest.some(test => !results.has(key(test)))) throw new Error('Incomplete run')
      } else {
        throw new Error('Unknown event')
      }
      sequence++
      if (event.type === 'start') resolveStarted()
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => finish('Native app stopped reporting results for five minutes'), 5 * 60 * 1000)
      // Store only validated test metadata, never request bodies or authentication data.
      persist(false)
      response.writeHead(204).end()
      if (event.type === 'complete') finish()
    } catch {
      response.writeHead(400).end('Invalid test event')
    }
  })
  const timer = setTimeout(() => finish('Timed out waiting for complete native test results'), timeout)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  }).catch(error => { clearTimeout(timer); throw error })
  return {
    port: server.address().port,
    started,
    done,
    fail: reason => finish(reason),
    stop: async reason => {
      if (!finished) finish(reason ?? 'Test runner stopped before completion')
      await new Promise(resolve => server.close(resolve))
    }
  }
}
