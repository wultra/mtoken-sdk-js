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

// Stages, builds, and packages the React Native and Cordova libraries.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import layout from './build-layout.cjs'

const { rootDir, rn, cordova } = layout
const modulesPlaceholder = '<!-- PLACEHOLDER_MODULES -->'

const readPackage = directory => JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(file) : entry.name.endsWith('.ts') ? [file] : []
  })
}

function sdkVersion() {
  const versions = [rootDir, rn.packageDir, cordova.packageDir].map(directory => readPackage(directory).version)
  if (new Set(versions).size !== 1) {
    throw new Error(`Package versions differ: root ${versions[0]}, RN ${versions[1]}, Cordova ${versions[2]}`)
  }
  return versions[0]
}

// Copies the shared sources and applies optional platform rewrites.
function stageSources(destination, rewrite = content => content) {
  fs.cpSync(layout.shared.jsDir, destination, { recursive: true })
  for (const file of sourceFiles(destination)) {
    fs.writeFileSync(file, rewrite(fs.readFileSync(file, 'utf8')))
  }
}

// Writes the published manifest, README without the development section, and LICENSE.
function stagePackageFiles(packageDir, stageDir, overrides) {
  const manifest = { ...readPackage(packageDir), ...overrides, scripts: {} }
  writeFile(path.join(stageDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8')
  const publishedReadme = readme.replace(/\n## Developing this repository\n[\s\S]*?(?=\n## License)/, '')
  if (publishedReadme === readme) throw new Error('README development section marker is missing')
  writeFile(path.join(stageDir, 'README.md'), publishedReadme)
  fs.copyFileSync(path.join(rootDir, 'LICENSE'), path.join(stageDir, 'LICENSE'))
}

function stageReactNative() {
  fs.rmSync(rn.stageDir, { recursive: true, force: true })
  stageSources(rn.sourceDir)
}

function stageCordova() {
  fs.rmSync(cordova.stageDir, { recursive: true, force: true })
  fs.rmSync(cordova.tempDir, { recursive: true, force: true })
  stageSources(cordova.sourceDir, content => content
    .replace(/.+ @cordova-remove *[^\n]*/g, '')
    .replace(/.*import.+react-native-powerauth-mobile-sdk *[^\n]*/g, "import 'cordova-powerauth-mobile-sdk'\n")
    .replaceAll('react-native-powerauth-networking', 'cordova-powerauth-networking'))
  fs.cpSync(path.join(cordova.packageDir, 'src'), cordova.sourceDir, { recursive: true })
}

// Cordova exposes the SDK as globals, so the bundled declarations must not be a module.
// Returns the public value exports declared by the bundled declarations.
function makeCordovaDeclarationsAmbient() {
  const file = cordova.outputs.types
  const networkingTypes = []
  const publicValues = []
  let declarations = fs.readFileSync(file, 'utf8')
    .replace(/^import ['"]cordova-powerauth-mobile-sdk['"];\n/gm, '')
    .replace(/^import (?:type )?\{([^}]+)\} from ['"]cordova-powerauth-networking['"];\n/gm, (_, names) => {
      networkingTypes.push(...names.split(',').map(name => name.trim().split(/\s+as\s+/)).filter(([name]) => name))
      return ''
    })
    .replace(/^export (type )?\{([^}]*)\};\n?/gm, (_, typeOnly, names) => {
      if (!typeOnly) publicValues.push(...names.split(',').map(name => name.trim().split(/\s+as\s+/).pop()).filter(Boolean))
      return ''
    })
  for (const [imported, local = imported] of networkingTypes) {
    declarations = declarations.replace(new RegExp(`\\b${local}\\b`, 'g'),
      `import("cordova-powerauth-networking").${imported}`)
  }
  // The bundler renames declarations that shadow globals, e.g. `PowerAuth$1`; restore them so they merge.
  for (const name of new Set(declarations.match(/\b[A-Za-z_]\w*\$\d+\b/g))) {
    const original = name.replace(/\$\d+$/, '')
    if (new RegExp(`^(?:declare )?(?:abstract )?(?:class|interface|type|enum|const|let|var|function|namespace) ${original}(?![\\w$])`, 'm').test(declarations)) {
      throw new Error(`Cordova declarations contain conflicting ${original} declarations`)
    }
    declarations = declarations.replace(new RegExp(`\\b${name.replace('$', '\\$')}\\b`, 'g'), original)
  }
  if (/^(?:import|export)\s/m.test(declarations)) {
    throw new Error(`Failed to create ambient declarations in ${path.relative(rootDir, file)}`)
  }
  fs.writeFileSync(file, declarations)
  return publicValues
}

// Generates the global module shims for public exports and expands the plugin.xml template.
function generateCordovaModules(version, publicValues) {
  const runtimeExports = JSON.parse(fs.readFileSync(cordova.exportsFile, 'utf8'))
  if (!Array.isArray(runtimeExports) || runtimeExports.length === 0 || runtimeExports.some(name => typeof name !== 'string')) {
    throw new Error('Rollup reported invalid Cordova runtime exports')
  }
  const missing = publicValues.filter(name => !runtimeExports.includes(name))
  if (missing.length > 0) throw new Error(`Cordova bundle does not export declared values: ${missing.join(', ')}`)
  const names = runtimeExports.filter(name => publicValues.includes(name))
  const packageName = readPackage(cordova.packageDir).name
  const libDir = path.dirname(cordova.outputs.bundle)
  for (const name of names) {
    writeFile(path.join(libDir, `${name}.js`),
      `module.exports = require("${packageName}.${cordova.pluginName}").${name};\n`)
  }
  const modules = [cordova.pluginName, ...names].map(name =>
    `    <js-module src="lib/${name}.js" name="${name}"><clobbers target="${name}" /></js-module>`).join('\n')
  const pluginXml = fs.readFileSync(path.join(cordova.packageDir, 'plugin.xml'), 'utf8')
  if (!pluginXml.includes(modulesPlaceholder)) throw new Error(`plugin.xml is missing ${modulesPlaceholder}`)
  writeFile(path.join(cordova.stageDir, 'plugin.xml'),
    pluginXml.replaceAll('%%SDK_VERSION%%', version).replace(modulesPlaceholder, modules))
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: rootDir, stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const target = process.argv[2] ?? 'all'
const flags = new Set(process.argv.slice(3))
if (!['all', 'rn', 'cordova'].includes(target)) {
  throw new Error('Use: node scripts/build.mjs all|rn|cordova [--pack]')
}
const buildRN = target === 'rn' || target === 'all'
const buildCordova = target === 'cordova' || target === 'all'

const version = sdkVersion()
if (buildRN) stageReactNative()
if (buildCordova) stageCordova()

run('yarn', ['rollup', '-c', '--silent'], { env: { ...process.env, BUILD_TARGET: target } })

if (buildRN) {
  stagePackageFiles(rn.packageDir, rn.stageDir, { main: 'lib/index.js', types: 'lib/index.d.ts' })
}
if (buildCordova) {
  generateCordovaModules(version, makeCordovaDeclarationsAmbient())
  stagePackageFiles(cordova.packageDir, cordova.stageDir, { types: 'typings.d.ts' })
  fs.rmSync(cordova.tempDir, { recursive: true, force: true })
}

if (flags.has('--pack')) {
  const env = { ...process.env, npm_config_cache: process.env.npm_config_cache ?? path.join(rootDir, '.build', 'npm-cache') }
  if (buildRN) run('npm', ['pack', '--ignore-scripts'], { cwd: rn.stageDir, env })
  if (buildCordova) run('npm', ['pack', '--ignore-scripts'], { cwd: cordova.stageDir, env })
}
