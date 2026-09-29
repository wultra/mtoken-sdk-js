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
const requireFromApp = createRequire(path.join(app, 'package.json'))
const { ConfigParser, events } = requireFromApp('cordova-common')
const config = new ConfigParser(path.join(app, 'config.xml'))
const platforms = process.argv.slice(2)

if (!platforms.length || platforms.some(platform => !['ios', 'android'].includes(platform))) {
  throw new Error('Use: node scripts/add-platforms.mjs ios [android]')
}

for (const platform of platforms) {
  const destination = path.join(app, 'platforms', platform)
  if (fs.existsSync(destination)) continue
  fs.rmSync(path.join(app, 'plugins', `${platform}.json`), { force: true })
  const Api = requireFromApp(`cordova-${platform}/lib/Api`)
  await Api.createPlatform(destination, config, {}, events)
}
