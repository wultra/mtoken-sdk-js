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
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.resolve(app, '..')
const pluginsDir = path.join(app, 'plugins')
const requireFromCordova = createRequire(createRequire(import.meta.url).resolve('cordova/package.json', { paths: [app] }))
const { plugman } = requireFromCordova('cordova-lib')

const plugins = [
  ['cordova-powerauth-mobile-sdk', path.join(app, 'node_modules/cordova-powerauth-mobile-sdk')],
  ['cordova-powerauth-networking', path.join(app, 'node_modules/cordova-powerauth-networking')],
  ['cordova-mtoken-sdk', path.join(root, 'packages/lib-cordova/build')],
]
const platforms = ['ios', 'android'].filter(platform =>
  fs.existsSync(path.join(app, 'platforms', platform)))

function isInstalled(platform, id) {
  const file = path.join(pluginsDir, `${platform}.json`)
  return fs.existsSync(file) &&
    Boolean(JSON.parse(fs.readFileSync(file, 'utf8')).installed_plugins?.[id])
}

for (const [id, source] of plugins) {
  if (!fs.existsSync(path.join(source, 'plugin.xml'))) {
    throw new Error(`Build or install ${id} before refreshing Cordova plugins`)
  }
}

// Remove dependents first, then refresh the staged copies and install dependencies first.
for (const [id] of [...plugins].reverse()) {
  for (const platform of platforms) {
    if (isInstalled(platform, id)) {
      await plugman.uninstall.uninstallPlatform(platform, path.join(app, 'platforms', platform),
        id, pluginsDir, { usePlatformWww: true })
    }
  }
}
for (const [id, source] of plugins) {
  const destination = path.join(pluginsDir, id)
  fs.rmSync(destination, { recursive: true, force: true })
  fs.cpSync(source, destination, { recursive: true, force: true })
  for (const platform of platforms) {
    await plugman.install(platform, path.join(app, 'platforms', platform),
      id, pluginsDir, { usePlatformWww: true, is_top_level: true, noregistry: true })
  }
}
