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

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { randomUUID } from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import { createCollector } from './collector.mjs'
import { androidRunning, iosRunning, monitorProcess } from './process-monitor.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
let args
try {
  args = parseArgs({ args: process.argv.slice(2), allowPositionals: true, options: { 'allow-skip': { type: 'string', multiple: true } } })
} catch { args = undefined }
const [runtime, platform] = args?.positionals ?? []
if (!args || args.positionals.length !== 2 || !['rn', 'cordova'].includes(runtime) || !['ios', 'android'].includes(platform)) {
  console.error('Usage: yarn e2e <rn|cordova> <ios|android> [--allow-skip <Suite|Suite.testName>]...')
  process.exit(1)
}
const allowedSkips = [...(args.values['allow-skip'] ?? []), ...(process.env.E2E_ALLOW_SKIP ?? '').split(',')]
  .map(value => value.trim()).filter(Boolean)
const utils = path.join(root, 'exampleReactNative/src/tests/utils')
const credentialsFile = path.join(utils, 'credentials-private.json')
const configFile = path.join(utils, 'test-config-private.json')
const out = path.join(root, 'artifacts/e2e', `${runtime}-${platform}`)
let child
let collector
let serial
let stopMonitor = () => {}
let temporaryCredentials = false
const previousConfig = fs.existsSync(configFile) ? fs.readFileSync(configFile) : undefined

// Resolves with stdout, or an empty string when the command fails.
const output = (command, commandArgs) => new Promise(resolve =>
  execFile(command, commandArgs, { timeout: 15000 }, (error, stdout) => resolve(error ? '' : stdout)))

async function run(command, args, cwd = root, capture = false) {
  const proc = child = spawn(command, args, { cwd, env: process.env, stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit', timeout: 30 * 60 * 1000 })
  let output = ''
  proc.stdout?.on('data', chunk => { output += chunk })
  await new Promise((resolve, reject) => {
    proc.once('error', reject)
    proc.once('close', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} failed (${signal ?? code})`)))
  })
  child = undefined
  return output
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    child?.kill('SIGTERM')
    collector?.stop('Native test run interrupted')
    process.exitCode = 1
  })
}

try {
  if (process.env.MTOKEN_TEST_CREDENTIALS) {
    if (fs.existsSync(credentialsFile)) throw new Error('Refusing to overwrite existing private credentials; unset MTOKEN_TEST_CREDENTIALS to use the local file')
    let credentials
    try { credentials = JSON.parse(process.env.MTOKEN_TEST_CREDENTIALS) } catch { throw new Error('MTOKEN_TEST_CREDENTIALS must be valid JSON') }
    fs.writeFileSync(credentialsFile, JSON.stringify(credentials), { mode: 0o600 })
    temporaryCredentials = true
  }
  if (!fs.existsSync(credentialsFile)) throw new Error('Set MTOKEN_TEST_CREDENTIALS or create the ignored credentials-private.json; see E2E-Tests.md')
  let credentials
  try { credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8')) } catch { throw new Error('Private test credentials must be valid JSON') }
  for (const key of ['cloudServerUrl', 'cloudServerLogin', 'cloudServerPassword', 'cloudApplicationId', 'enrollmentUrl', 'sdkConfig']) {
    if (typeof credentials[key] !== 'string' || !credentials[key].trim()) throw new Error(`Missing PAC test configuration: ${key}`)
  }
  fs.rmSync(out, { recursive: true, force: true })
  if (runtime === 'rn') {
    // Run against the verified npm tarball instead of the workspace source used for development.
    await run('yarn', ['packReactNative'])
    const { name, version } = JSON.parse(fs.readFileSync(path.join(root, 'packages/lib-rn/package.json'), 'utf8'))
    const tarball = path.join(root, 'packages/lib-rn/build', `${name}-${version}.tgz`)
    const sdkDir = path.join(root, '.build/e2e/rn-sdk')
    fs.rmSync(sdkDir, { recursive: true, force: true })
    fs.mkdirSync(sdkDir, { recursive: true })
    await run('tar', ['-xzf', tarball, '-C', sdkDir])
    process.env.MTOKEN_E2E_SDK_PACKAGE = path.join(sdkDir, 'package')
  }
  const runId = randomUUID()
  collector = await createCollector({ runId, out, platform, runtime, allowedSkips })
  fs.writeFileSync(configFile, JSON.stringify({ runId, collectorUrl: `http://127.0.0.1:${collector.port}` }))

  const app = path.join(root, runtime === 'rn' ? 'exampleReactNative' : 'exampleCordova')
  let probe
  if (platform === 'android') {
    const devices = (await run('adb', ['devices'], root, true)).split('\n').filter(line => /\tdevice$/.test(line)).map(line => line.split('\t')[0])
    serial = process.env.ANDROID_SERIAL ?? (devices.length === 1 ? devices[0] : undefined)
    if (!serial || !devices.includes(serial)) throw new Error('Connect one Android emulator/device or select it with ANDROID_SERIAL')
    await run('adb', ['-s', serial, 'reverse', `tcp:${collector.port}`, `tcp:${collector.port}`])
  }
  if (runtime === 'cordova') {
    await run('yarn', ['build:cdv'])
    await run('node', ['scripts/add-platforms.mjs', platform], app)
    await run('node', ['scripts/install-plugins.mjs'], app)
    await run('yarn', ['build', platform], app)
  }

  if (platform === 'android') {
    if (runtime === 'rn') await run('./gradlew', [':app:assembleRelease', '--console=plain'], path.join(app, 'android'))
    else await run('yarn', ['exec', 'cordova', 'build', 'android', '--debug'], app)
    const apk = runtime === 'rn' ? 'android/app/build/outputs/apk/release/app-release.apk' : 'platforms/android/app/build/outputs/apk/debug/app-debug.apk'
    const appId = runtime === 'rn' ? 'com.examplereactnative' : 'com.wultra.mtokentest'
    await run('adb', ['-s', serial, 'install', '-r', path.join(app, apk)])
    await run('adb', ['-s', serial, 'shell', 'am', 'force-stop', appId])
    await run('adb', ['-s', serial, 'shell', 'monkey', '-p', appId, '-c', 'android.intent.category.LAUNCHER', '1'])
    probe = async () => androidRunning(await output('adb', ['-s', serial, 'shell', 'pidof', appId]))
  } else {
    const available = JSON.parse(await run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], root, true))
    const devices = Object.values(available.devices).flat()
    const device = process.env.E2E_IOS_UDID ? devices.find(item => item.udid === process.env.E2E_IOS_UDID) :
      devices.find(item => item.state === 'Booted' && item.name.includes('iPhone')) ?? devices.find(item => item.name.includes('iPhone'))
    if (!device) throw new Error('No iOS simulator available; install a runtime or set E2E_IOS_UDID')
    if (device.state !== 'Booted') await run('xcrun', ['simctl', 'boot', device.udid])
    await run('xcrun', ['simctl', 'bootstatus', device.udid, '-b'])
    const derived = path.join(root, '.build/e2e', `${runtime}-ios`)
    const name = runtime === 'rn' ? 'exampleReactNative' : 'MtokenTest'
    if (runtime === 'rn') await run('bundle', ['exec', 'pod', 'install'], path.join(app, 'ios'))
    const workspace = runtime === 'rn' ? `ios/${name}.xcworkspace` : `platforms/ios/${name}.xcworkspace`
    await run('xcodebuild', ['-workspace', workspace, '-scheme', name, '-configuration', 'Release', '-sdk', 'iphonesimulator',
      '-destination', `id=${device.udid}`, '-derivedDataPath', derived, 'CODE_SIGNING_ALLOWED=NO', 'build'], app)
    const bundle = path.join(derived, 'Build/Products/Release-iphonesimulator', `${name}.app`)
    const appId = (await run('/usr/libexec/PlistBuddy', ['-c', 'Print CFBundleIdentifier', path.join(bundle, 'Info.plist')], root, true)).trim()
    await run('xcrun', ['simctl', 'install', device.udid, bundle])
    await run('xcrun', ['simctl', 'launch', '--terminate-running-process', device.udid, appId])
    probe = async () => iosRunning(await output('xcrun', ['simctl', 'spawn', device.udid, 'launchctl', 'list']), appId)
  }
  // Detect a crashed or killed app within seconds instead of waiting for the collector deadline.
  stopMonitor = monitorProcess({ probe, onExit: () => collector.fail('Native app process exited before the run completed') })
  let startupTimer
  try {
    await Promise.race([collector.started, collector.done, new Promise((_, reject) => {
      startupTimer = setTimeout(() => reject(new Error('No native test run started within two minutes of launch')), 120000)
    })])
  } finally { clearTimeout(startupTimer) }
  const summary = await collector.done
  console.log(JSON.stringify(summary, null, 2))
  if (!summary.success) process.exitCode = 1
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  stopMonitor()
  child?.kill('SIGTERM')
  if (collector) {
    if (serial) await run('adb', ['-s', serial, 'reverse', '--remove', `tcp:${collector.port}`]).catch(() => {})
    await collector.stop()
  }
  if (previousConfig) fs.writeFileSync(configFile, previousConfig)
  else fs.rmSync(configFile, { force: true })
  if (temporaryCredentials) fs.rmSync(credentialsFile, { force: true })
}
