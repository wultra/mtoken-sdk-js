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
import { setTimeout as sleep } from 'node:timers/promises'
import { androidRunning, iosRunning, monitorProcess } from './process-monitor.mjs'

test('reports an exit only after consecutive misses, counting probe errors', async () => {
  const states = [true, false, true, false, 'error', false, true]
  let exits = 0
  let probes = 0
  monitorProcess({ interval: 1, misses: 3, onExit: () => exits++, probe: async () => {
    const state = states[probes++] ?? true
    if (state === 'error') throw new Error('adb offline')
    return state
  } })
  await sleep(100)
  assert.equal(exits, 1)
  assert.equal(probes, 6)
})

test('a stopped monitor never reports an exit', async () => {
  let exits = 0
  const stop = monitorProcess({ interval: 1, misses: 1, onExit: () => exits++, probe: async () => false })
  stop()
  await sleep(20)
  assert.equal(exits, 0)
})

test('Android probe requires a pid from pidof', () => {
  assert.equal(androidRunning('12345\n'), true)
  assert.equal(androidRunning(''), false)
  assert.equal(androidRunning('error: device offline'), false)
})

test('iOS probe requires a running UIKit job for the exact bundle id', () => {
  const list = 'PID\tStatus\tLabel\n96404\t0\tUIKitApplication:com.wultra.mtokentest[dc71][rb-legacy]\n' +
    '-\t9\tUIKitApplication:com.wultra.crashed[aa11][rb-legacy]\n'
  assert.equal(iosRunning(list, 'com.wultra.mtokentest'), true)
  assert.equal(iosRunning(list, 'com.wultra.mtoken'), false)
  assert.equal(iosRunning(list, 'com.wultra.crashed'), false)
  assert.equal(iosRunning('', 'com.wultra.mtokentest'), false)
})
