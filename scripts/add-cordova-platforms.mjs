// Copyright 2024 Wultra s.r.o.
// Licensed under the Apache License, Version 2.0 (the "License");

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = path.join(root, 'exampleCordova')
const requireFromApp = createRequire(path.join(app, 'package.json'))
const { ConfigParser, events } = requireFromApp('cordova-common')
const config = new ConfigParser(path.join(app, 'config.xml'))
const platforms = process.argv.slice(2)

if (!platforms.length || platforms.some(platform => !['ios', 'android'].includes(platform))) {
  throw new Error('Use: node scripts/add-cordova-platforms.mjs ios [android]')
}

for (const platform of platforms) {
  const destination = path.join(app, 'platforms', platform)
  if (fs.existsSync(destination)) continue
  fs.rmSync(path.join(app, 'plugins', `${platform}.json`), { force: true })
  const Api = requireFromApp(`cordova-${platform}/lib/Api`)
  await Api.createPlatform(destination, config, {}, events)
}
