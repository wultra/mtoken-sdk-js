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

// Verifies the packed React Native and Cordova tarballs before release.

import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import layout from './build-layout.cjs'

const { rootDir, rn, cordova } = layout
const require = createRequire(import.meta.url)

const target = process.argv[2] ?? 'all'
if (!['all', 'rn', 'cordova'].includes(target)) {
  throw new Error('Use: node scripts/verify-packages.mjs all|rn|cordova')
}
const verifyRN = target === 'rn' || target === 'all'
const verifyCordova = target === 'cordova' || target === 'all'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const sorted = values => [...values].sort()

function sameMembers(actual, expected, message) {
  const missing = expected.filter(name => !actual.includes(name))
  const extra = actual.filter(name => !expected.includes(name))
  assert(missing.length === 0 && extra.length === 0,
    `${message}${missing.length ? `\n  missing: ${missing.join(', ')}` : ''}${extra.length ? `\n  unexpected: ${extra.join(', ')}` : ''}`)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8', ...options })
  if (result.error) throw result.error
  assert(result.status === 0, `${command} ${args.join(' ')} failed:\n${result.stdout ?? ''}${result.stderr ?? ''}`)
  return result.stdout
}

// Extracts the single tarball for the package after validating its entry paths.
function extractPackage(packageDir, stageDir, workDir) {
  const { name, version } = readJson(path.join(packageDir, 'package.json'))
  const tarball = path.join(stageDir, `${name}-${version}.tgz`)
  assert(fs.existsSync(tarball), `Missing ${path.relative(rootDir, tarball)}, run the pack script first`)
  const entries = run('tar', ['-tzf', tarball]).split('\n').filter(Boolean)
  for (const entry of entries) {
    const normalized = path.posix.normalize(entry)
    assert(normalized.startsWith('package/') && !normalized.split('/').includes('..') && !path.isAbsolute(entry),
      `Unsafe tarball entry ${entry} in ${path.basename(tarball)}`)
    assert(!/(^|\/)(node_modules|\.build|src)(\/|$)/.test(normalized.slice('package/'.length)),
      `Unexpected entry ${entry} in ${path.basename(tarball)}`)
  }
  const destination = path.join(workDir, name)
  fs.mkdirSync(destination, { recursive: true })
  run('tar', ['-xzf', tarball, '-C', destination])
  const packageRoot = path.join(destination, 'package')
  const manifest = readJson(path.join(packageRoot, 'package.json'))
  assert(manifest.name === name && manifest.version === version,
    `${path.basename(tarball)} manifest is ${manifest.name}@${manifest.version}, expected ${name}@${version}`)
  assert(Object.keys(manifest.scripts ?? {}).length === 0, `${name} must not publish lifecycle scripts`)
  for (const file of ['README.md', 'LICENSE']) {
    assert(fs.existsSync(path.join(packageRoot, file)), `${name} is missing ${file}`)
  }
  const readme = fs.readFileSync(path.join(packageRoot, 'README.md'), 'utf8')
  assert(!readme.includes('## Developing this repository'), `${name} README contains the development section`)
  return { name, version, packageRoot, manifest, entries }
}

function assertNoPlaceholders(packageRoot, files) {
  for (const file of files) {
    const content = fs.readFileSync(path.join(packageRoot, file), 'utf8')
    assert(!content.includes('%%SDK_VERSION%%'), `${file} contains the %%SDK_VERSION%% placeholder`)
    assert(!content.includes('PLACEHOLDER_'), `${file} contains a build placeholder`)
  }
}

function parseDeclarations(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const diagnostics = source.parseDiagnostics ?? []
  assert(diagnostics.length === 0, `${file} has syntax errors: ${diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`)
  return source
}

function typecheck(files, options) {
  const program = ts.createProgram(files, {
    noEmit: true,
    strict: true,
    skipLibCheck: false,
    target: ts.ScriptTarget.ES2019,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    types: [],
    ...options
  })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert(diagnostics.length === 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file,
    getCurrentDirectory: () => rootDir,
    getNewLine: () => '\n'
  }))
  return program
}

// Returns the exported value names of a declaration module.
function declaredValueExports(file) {
  const program = typecheck([file], { skipLibCheck: true, types: ['react'] })
  const checker = program.getTypeChecker()
  const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(file))
  return checker.getExportsOfModule(moduleSymbol)
    .filter(symbol => {
      const resolved = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
      return resolved.flags & ts.SymbolFlags.Value
    })
    .map(symbol => symbol.name)
}

function verifyReactNative(workDir) {
  const pkg = extractPackage(rn.packageDir, rn.stageDir, workDir)
  const { packageRoot, manifest } = pkg
  assert(manifest.main === 'lib/index.js' && manifest.types === 'lib/index.d.ts',
    `${pkg.name} must publish main lib/index.js and types lib/index.d.ts`)
  const files = pkg.entries.map(entry => entry.slice('package/'.length)).filter(entry => entry && !entry.endsWith('/'))
  sameMembers(sorted(files), sorted(['LICENSE', 'README.md', 'package.json', 'lib/index.js', 'lib/index.d.ts']),
    `${pkg.name} tarball contains unexpected files`)
  assertNoPlaceholders(packageRoot, ['lib/index.js', 'lib/index.d.ts'])

  const bundleFile = path.join(packageRoot, manifest.main)
  const bundle = fs.readFileSync(bundleFile, 'utf8')
  run(process.execPath, ['--check', '--input-type=module'], { input: bundle })
  const imports = sorted(new Set([...bundle.matchAll(/^import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"];?$/gm)].map(match => match[1])))
  const allowedImports = ['buffer', 'react-native', 'react-native-powerauth-mobile-sdk', 'react-native-powerauth-networking']
  assert(imports.every(name => allowedImports.includes(name)), `${pkg.name} imports unexpected modules: ${imports.join(', ')}`)
  assert(imports.includes('react-native-powerauth-mobile-sdk'), `${pkg.name} must import react-native-powerauth-mobile-sdk`)
  assert(/PowerAuth\.prototype\.createWultraMobileToken\s*=/.test(bundle), `${pkg.name} must install PowerAuth.createWultraMobileToken`)
  assert(!/cordova/i.test(bundle.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '')), `${pkg.name} contains Cordova code`)

  const exportBlocks = [...bundle.matchAll(/^export\s*\{([^}]*)\};?$/gm)]
  assert(exportBlocks.length === 1, `${pkg.name} must have a single export block`)
  const runtimeExports = exportBlocks[0][1].split(',').map(name => name.trim().split(/\s+as\s+/).pop()).filter(Boolean)

  const typesFile = path.join(packageRoot, manifest.types)
  const typesSource = fs.readFileSync(typesFile, 'utf8')
  assert(/declare module ['"]react-native-powerauth-mobile-sdk['"]/.test(typesSource),
    `${pkg.name} declarations must augment react-native-powerauth-mobile-sdk`)
  const declaredValues = declaredValueExports(typesFile)
  const undeclared = declaredValues.filter(name => !runtimeExports.includes(name))
  assert(undeclared.length === 0, `${pkg.name} declares values missing at runtime: ${undeclared.join(', ')}`)
  console.log(`Verified ${pkg.name}@${pkg.version} (${declaredValues.length} public values, ${runtimeExports.length} runtime exports)`)
  return { runtimeExports, declaredValues }
}

// Evaluates a Cordova module the way cordova.js does, independent of the package module type.
function evaluateCordovaModule(file, requireModule) {
  const module = { exports: {} }
  vm.runInThisContext(`(function (require, exports, module) {\n${fs.readFileSync(file, 'utf8')}\n})`, { filename: file })(
    requireModule, module.exports, module)
  return module.exports
}

// Loads the Cordova bundle with stubbed PowerAuth and Cordova platform globals.
function loadCordovaBundle(file, platformId) {
  const networkingModule = 'cordova-powerauth-networking.WultraPowerAuthNetworking'
  const saved = { PowerAuth: globalThis.PowerAuth, cordova: globalThis.cordova }
  class PowerAuth {}
  globalThis.PowerAuth = PowerAuth
  globalThis.cordova = { platformId }
  try {
    const networking = evaluateCordovaModule(require.resolve('cordova-powerauth-networking/lib/index.js'), request => {
      throw new Error(`Unexpected require(${request}) in cordova-powerauth-networking`)
    })
    const exports = evaluateCordovaModule(file, request => {
      if (request === networkingModule) return networking
      throw new Error(`Unexpected require(${request}) in the Cordova bundle`)
    })
    assert(typeof PowerAuth.prototype.createWultraMobileToken === 'function',
      `Cordova bundle did not install PowerAuth.createWultraMobileToken on ${platformId}`)
    return exports
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
}

function verifyCordovaPackage(workDir) {
  const pkg = extractPackage(cordova.packageDir, cordova.stageDir, workDir)
  const { packageRoot, manifest } = pkg
  assert(manifest.types === 'typings.d.ts', `${pkg.name} must publish types typings.d.ts`)
  assert(!manifest.main, `${pkg.name} must not declare main`)

  const pluginXml = fs.readFileSync(path.join(packageRoot, 'plugin.xml'), 'utf8')
  const plugin = pluginXml.match(/<plugin\b[^>]*\bid="([^"]+)"[^>]*\bversion="([^"]+)"/)
  assert(plugin && plugin[1] === pkg.name && plugin[2] === pkg.version,
    `plugin.xml must declare ${pkg.name}@${pkg.version}`)

  const bundleRelative = path.relative(cordova.stageDir, cordova.outputs.bundle).split(path.sep).join('/')
  const bundleFile = path.join(packageRoot, bundleRelative)
  const bundle = fs.readFileSync(bundleFile, 'utf8')
  const requires = sorted(new Set([...bundle.matchAll(/\brequire\(['"]([^'"]+)['"]\)/g)].map(match => match[1])))
  sameMembers(requires, ['cordova-powerauth-networking.WultraPowerAuthNetworking'], `${pkg.name} bundle requires unexpected modules`)

  let runtimeExports
  for (const platformId of ['android', 'ios']) {
    const exports = loadCordovaBundle(bundleFile, platformId)
    const names = Object.keys(exports).filter(name => name !== '__esModule')
    assert(names.every(name => exports[name] !== undefined), `${pkg.name} exports undefined values on ${platformId}`)
    runtimeExports ??= names
    sameMembers(sorted(names), sorted(runtimeExports), `${pkg.name} exports differ between platforms`)
  }

  const modules = [...pluginXml.matchAll(/<js-module\s+src="([^"]+)"\s+name="([^"]+)">\s*<clobbers\s+target="([^"]+)"\s*\/>\s*<\/js-module>/g)]
  const allModules = [...pluginXml.matchAll(/<js-module\b/g)]
  assert(modules.length === allModules.length, 'plugin.xml contains js-module entries without a matching clobbers target')
  const globalNames = modules.map(match => match[2]).filter(name => name !== cordova.pluginName)
  assert(modules[0]?.[2] === cordova.pluginName, `plugin.xml must declare ${cordova.pluginName} as the first module`)
  const notExported = globalNames.filter(name => !runtimeExports.includes(name))
  assert(notExported.length === 0, `plugin.xml modules are not exported by the bundle: ${notExported.join(', ')}`)
  const expectedModules = [cordova.pluginName, ...globalNames]
  const libFiles = fs.readdirSync(path.dirname(bundleFile)).filter(file => file.endsWith('.js'))
  sameMembers(sorted(libFiles), sorted(expectedModules.map(name => `${name}.js`)), `${pkg.name} lib files differ from plugin.xml modules`)
  for (const [, src, name, clobbers] of modules) {
    assert(src === `lib/${name}.js` && clobbers === name, `plugin.xml module ${name} has invalid src or clobbers target`)
    if (name === cordova.pluginName) continue
    const shim = fs.readFileSync(path.join(packageRoot, src), 'utf8')
    assert(shim === `module.exports = require("${pkg.name}.${cordova.pluginName}").${name};\n`, `${src} has unexpected content`)
  }
  assertNoPlaceholders(packageRoot, ['plugin.xml', 'typings.d.ts', bundleRelative])

  const typesFile = path.join(packageRoot, manifest.types)
  const types = parseDeclarations(typesFile)
  assert(!types.statements.some(statement => ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) ||
    ts.isExportAssignment(statement)), `${manifest.types} must be ambient (no top-level import or export)`)
  assert(!/\b[A-Za-z_]\w*\$\d+\b/.test(types.getFullText()), `${manifest.types} contains bundler-renamed declarations`)

  // Global declarations must type check against the Cordova PowerAuth and Networking declarations.
  const powerAuthTypes = require.resolve('cordova-powerauth-mobile-sdk/lib/index.d.ts')
  const probe = path.join(workDir, 'cordova-probe.ts')
  fs.writeFileSync(probe, [
    'declare const powerAuth: PowerAuth',
    'const token: WultraMobileToken = powerAuth.createWultraMobileToken("en")',
    'const operations: WMTOperations = token.operations',
    'const error: WMTException = new WMTException("message")',
    'export { operations, error }',
    ''
  ].join('\n'))
  const program = typecheck([powerAuthTypes, typesFile, probe], { skipLibCheck: true })
  const checker = program.getTypeChecker()
  const globals = new Set(checker.getSymbolsInScope(program.getSourceFile(probe), ts.SymbolFlags.Value).map(symbol => symbol.name))
  const undeclared = globalNames.filter(name => !globals.has(name))
  assert(undeclared.length === 0, `${manifest.types} does not declare runtime globals: ${undeclared.join(', ')}`)
  console.log(`Verified ${pkg.name}@${pkg.version} (${globalNames.length} globals, ${runtimeExports.length} runtime exports)`)
  return { runtimeExports, globalNames }
}

// Extract inside the repository so declarations resolve their dependencies from the root node_modules.
fs.mkdirSync(path.join(rootDir, '.build'), { recursive: true })
const workDir = fs.mkdtempSync(path.join(rootDir, '.build', 'verify-'))
try {
  const rnResult = verifyRN ? verifyReactNative(workDir) : undefined
  const cordovaResult = verifyCordova ? verifyCordovaPackage(workDir) : undefined
  if (rnResult && cordovaResult) {
    sameMembers(sorted(cordovaResult.runtimeExports), sorted(rnResult.runtimeExports),
      'Cordova runtime exports differ from React Native runtime exports')
    sameMembers(sorted(cordovaResult.globalNames), sorted(rnResult.declaredValues),
      'Cordova globals differ from React Native public values')
    console.log('Verified React Native and Cordova export parity')
  }
} finally {
  fs.rmSync(workDir, { recursive: true, force: true })
}
