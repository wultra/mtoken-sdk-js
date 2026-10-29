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

/**
 * Polls `probe` until stopped. Calls `onExit` once after `misses` consecutive
 * probes report the app as not running (probe errors count as misses).
 */
export function monitorProcess({ probe, onExit, interval = 5000, misses = 3 }) {
  let stopped = false
  let count = 0
  let timer
  const tick = async () => {
    let alive = false
    try { alive = await probe() } catch { alive = false }
    if (stopped) return
    count = alive ? 0 : count + 1
    if (count >= misses) {
      stopped = true
      onExit()
      return
    }
    timer = setTimeout(tick, interval)
  }
  timer = setTimeout(tick, interval)
  return () => {
    stopped = true
    clearTimeout(timer)
  }
}

export const androidRunning = stdout => /^\d+/.test(stdout.trim())

export const iosRunning = (stdout, appId) => stdout.split('\n').some(line => {
  const [pid, , label] = line.split('\t')
  return /^\d+$/.test(pid) && label?.startsWith(`UIKitApplication:${appId}[`)
})
