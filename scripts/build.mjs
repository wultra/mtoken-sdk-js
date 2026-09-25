// Copyright 2024 Wultra s.r.o.
// Licensed under the Apache License, Version 2.0 (the "License");

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import { build as bundle } from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const shared = path.join(root, 'packages/lib-shared/js')
const rnPackage = path.join(root, 'packages/lib-rn')
const cdvPackage = path.join(root, 'packages/lib-cdv')
const temporary = path.join(root, '.build')
const target = process.argv[2] ?? 'all'
const pack = process.argv.includes('--pack')
const stageOnly = process.argv.includes('--stage')

if (!['all', 'rn', 'cdv'].includes(target)) {
  throw new Error('Use: node scripts/build.mjs all|rn|cdv [--pack|--stage]')
}
if (stageOnly && (target !== 'rn' || pack)) {
  throw new Error('--stage is available only for the React Native package')
}

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const version = readJson(path.join(root, 'package.json')).version
for (const directory of [rnPackage, cdvPackage]) {
  if (readJson(path.join(directory, 'package.json')).version !== version) {
    throw new Error(`Workspace version differs from root: ${directory}`)
  }
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(source, destination)
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(file) : entry.name.endsWith('.ts') ? [file] : []
  })
}

function stageSources(destination, cordova = false) {
  fs.rmSync(destination, { recursive: true, force: true })
  fs.cpSync(shared, destination, { recursive: true })
  for (const file of sourceFiles(destination)) {
    let content = fs.readFileSync(file, 'utf8').replaceAll('%%SDK_VERSION%%', version)
    if (cordova) {
      content = content
        .replace(/.+ @cordova-remove *[^\n]*/g, '')
        .replace(/.*import.+react-native-powerauth-mobile-sdk *[^\n]*/g, "import 'cordova-powerauth-mobile-sdk'\n")
        .replaceAll('react-native-powerauth-networking', 'cordova-powerauth-networking')
    }
    fs.writeFileSync(file, content)
  }
  if (cordova) {
    for (const file of sourceFiles(path.join(cdvPackage, 'src'))) {
      copyFile(file, path.join(destination, path.relative(path.join(cdvPackage, 'src'), file)))
    }
  }
}

function emitTypescript(files, options) {
  const program = ts.createProgram(files, options)
  const result = program.emit()
  const diagnostics = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics]
  if (diagnostics.length) {
    const host = {
      getCanonicalFileName: name => name,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    }
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host))
  }
}

function stageManifest(packageDirectory, destination, platform) {
  const manifest = readJson(path.join(packageDirectory, 'package.json'))
  if (platform === 'rn') {
    manifest.main = 'lib/index.js'
    manifest.types = 'lib/index.d.ts'
  } else {
    manifest.types = 'typings.d.ts'
  }
  manifest.scripts = {}
  fs.writeFileSync(path.join(destination, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
  const publishedReadme = readme.replace(/\n## Developing this repository\n[\s\S]*?(?=\n## License)/, '')
  if (publishedReadme === readme) throw new Error('README development section marker is missing')
  fs.writeFileSync(path.join(destination, 'README.md'), publishedReadme)
  copyFile(path.join(root, 'LICENSE'), path.join(destination, 'LICENSE'))
}

function packageTarball(directory) {
  const result = spawnSync('npm', ['pack', '--ignore-scripts'], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, npm_config_cache: process.env.npm_config_cache ?? path.join(temporary, 'npm-cache') },
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout)
  process.stdout.write(result.stdout)
}

function buildReactNative() {
  const sourceDir = path.join(temporary, 'rn/src')
  const destination = path.join(rnPackage, 'build')
  fs.rmSync(destination, { recursive: true, force: true })
  fs.mkdirSync(destination, { recursive: true })
  stageSources(sourceDir)
  emitTypescript(sourceFiles(sourceDir), {
    module: ts.ModuleKind.ES2015,
    noImplicitAny: false,
    removeComments: false,
    declaration: true,
    target: ts.ScriptTarget.ES5,
    skipLibCheck: true,
    lib: ['lib.es2016.d.ts'],
    rootDir: sourceDir,
    outDir: path.join(destination, 'lib'),
    strict: true,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    stripInternal: true,
  })
  stageManifest(rnPackage, destination, 'rn')
  if (pack) packageTarball(destination)
}

const cordovaExports = [
  'WultraMobileToken', 'WMTLogger', 'WMTLoggerVerbosity', 'WMTException',
  'WMTInbox', 'WMTKnownRestApiError', 'WMTUserAgent', 'WMTOperations',
  'WMTPACUtils', 'WMTQROperationParser', 'WMTSigningKey',
  'WMTQROperationDataVersion', 'WMTSignatureFactor',
  'WMTQROperationDataFieldType', 'WMTAttributeType', 'WMTAttributeAlertType',
  'WMTPush', 'WMTPushData', 'WMTAPNSEnvironment',
  'WMTUserOperationProximityCheck', 'WMTMobileTokenDataBuilder',
  'WMTPreApprovalScreensRecorder',
]

function buildCordovaDeclarations(sourceDir, destination) {
  const typeDir = path.join(temporary, 'cdv/types')
  fs.rmSync(typeDir, { recursive: true, force: true })
  const allFiles = sourceFiles(sourceDir)
  emitTypescript(allFiles, {
    declaration: true,
    emitDeclarationOnly: true,
    stripInternal: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    skipLibCheck: true,
    rootDir: sourceDir,
    outDir: typeDir,
  })
  const topFiles = fs.readdirSync(sourceDir).filter(name => name.startsWith('WMT') && name.endsWith('.ts')).sort()
  const nestedFiles = allFiles.filter(file => path.relative(sourceDir, file).includes(path.sep))
    .sort((a, b) => a.localeCompare(b))
  const ordered = ['PWAExtension.ts', 'WultraMobileToken.ts', ...topFiles, ...nestedFiles.map(file => path.relative(sourceDir, file))]
  const declarations = ordered.map(file => {
    const name = file.replace(/\.ts$/, '.d.ts')
    return fs.readFileSync(path.join(typeDir, name), 'utf8')
  }).join('\n')
  const ambient = declarations
    .replace(/^import .+ from .+\n(?:\n)?/gm, '')
    .replace(/^export /gm, '')
    .replace(/\bWPNNetworking\b/g, 'import("cordova-powerauth-networking").WPNNetworking')
    .replace(/.*import.+cordova-powerauth-mobile-sdk *[^\n]*/g, '')
  fs.writeFileSync(path.join(destination, 'typings.d.ts'), ambient)
}

async function buildCordova() {
  const sourceDir = path.join(temporary, 'cdv/src')
  const destination = path.join(cdvPackage, 'build')
  const libDir = path.join(destination, 'lib')
  fs.rmSync(destination, { recursive: true, force: true })
  fs.mkdirSync(libDir, { recursive: true })
  stageSources(sourceDir, true)
  const outfile = path.join(libDir, 'WultraMobileTokenPlugin.js')
  await bundle({
    entryPoints: [path.join(sourceDir, 'index.ts')],
    outfile,
    external: ['cordova-powerauth-mobile-sdk', 'cordova-powerauth-networking'],
    bundle: true,
    format: 'cjs',
    target: 'ios13',
  })
  fs.writeFileSync(outfile, fs.readFileSync(outfile, 'utf8')
    .replace(/.*require\("cordova-powerauth-mobile-sdk"\)*./g, '')
    .replaceAll('require("cordova-powerauth-networking")', 'require("cordova-powerauth-networking.WultraPowerAuthNetworking")'))
  buildCordovaDeclarations(sourceDir, destination)
  for (const name of cordovaExports) {
    fs.writeFileSync(path.join(libDir, `${name}.js`),
      `require("cordova-mtoken-sdk.WultraMobileTokenPlugin");\nmodule.exports = WultraMobileTokenPlugin.${name};`)
  }
  let plugin = fs.readFileSync(path.join(cdvPackage, 'plugin.xml'), 'utf8')
  plugin = plugin.replaceAll('%%SDK_VERSION%%', version)
  plugin = plugin.replace('<!-- PLACEHOLDER_MODULES -->',
    ['WultraMobileTokenPlugin', ...cordovaExports].map(name =>
      `    <js-module src="lib/${name}.js" name="${name}"><clobbers target="${name}" /></js-module>`).join('\n'))
  fs.writeFileSync(path.join(destination, 'plugin.xml'), plugin)
  stageManifest(cdvPackage, destination, 'cdv')
  if (pack) packageTarball(destination)
}

if (stageOnly) {
  stageSources(path.join(temporary, 'rn/src'))
} else {
  if (target === 'rn' || target === 'all') buildReactNative()
  if (target === 'cdv' || target === 'all') await buildCordova()
}
