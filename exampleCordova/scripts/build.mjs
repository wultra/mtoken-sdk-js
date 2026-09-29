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
import { spawnSync } from 'node:child_process'
import { build } from 'esbuild'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.resolve(app, '..')
const rnTests = path.join(root, 'exampleReactNative/src/tests')
const temporary = path.join(app, '.temp')
const platform = process.argv[2]

if (platform && !['ios', 'android'].includes(platform)) {
  throw new Error('Use: node scripts/build.mjs [ios|android]')
}

function copyTests(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name)
    const destination = path.join(to, entry.name)
    if (entry.isDirectory()) {
      copyTests(source, destination)
    } else if (entry.isFile()) {
      let content = fs.readFileSync(source, 'utf8')
      if (entry.name.endsWith('.ts')) {
        content = content
          .replace(/import {[a-zA-Z }\n,]+from.*react-native-powerauth-mobile-sdk.*/g, '')
          .replace(/import {[a-zA-Z }\n,]+from.*react-native-mtoken-sdk.*/g, '')
      }
      fs.writeFileSync(destination, content)
    }
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: app, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status})`)
}

try {
  fs.rmSync(temporary, { recursive: true, force: true })
  const testDestination = path.join(temporary, 'src/tests')
  copyTests(rnTests, testDestination)
  const credentialsDir = path.join(rnTests, 'utils')
  const privateCredentials = path.join(credentialsDir, 'credentials-private.json')
  const credentialJson = fs.readFileSync(
    fs.existsSync(privateCredentials) ? privateCredentials : path.join(credentialsDir, 'credentials.json'),
    'utf8',
  )
  JSON.parse(credentialJson)
  fs.writeFileSync(path.join(testDestination, 'utils/IntegrationCredentials.ts'),
    `export class IntegrationCredentials {\n` +
    `    static async loadCredentials(): Promise<CredentialsObject> {\n` +
    `        return ${credentialJson}\n` +
    `    }\n` +
    `}\n`)
  fs.copyFileSync(path.join(app, 'src/App.tsx'), path.join(temporary, 'src/App.tsx'))
  await build({
    entryPoints: [path.join(temporary, 'src/App.tsx')],
    outfile: path.join(app, 'www/js/index.js'),
    bundle: true,
    target: 'ios13',
  })
  if (platform === 'ios') {
    run('cordova', ['prepare', 'ios'])
    const patchDir = path.join(app, 'patch-files/platforms')
    if (fs.existsSync(patchDir)) fs.cpSync(patchDir, path.join(app, 'platforms'), { recursive: true, force: true })
  }
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
