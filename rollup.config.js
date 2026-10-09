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
import typescript from 'rollup-plugin-typescript2'
import { dts } from 'rollup-plugin-dts'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import layout from './scripts/build-layout.cjs'

const buildTarget = process.env.BUILD_TARGET ?? 'all'

const typescriptPlugin = (target, sourceGlob, compilerOptions = {}) => typescript({
  include: [sourceGlob],
  tsconfig: layout.tsconfig,
  tsconfigOverride: {
    compilerOptions: { declaration: false, module: 'ESNext', target, ...compilerOptions },
    include: [sourceGlob]
  },
  clean: true
})

const failOnWarning = (warning, warn) => {
  if (['UNRESOLVED_IMPORT', 'MISSING_EXPORT', 'CIRCULAR_DEPENDENCY'].includes(warning.code)) {
    throw new Error(warning.message)
  }
  warn(warning)
}

const writeCordovaExports = {
  name: 'write-cordova-exports',
  writeBundle(_, bundle) {
    const entries = Object.values(bundle).filter(output => output.type === 'chunk' && output.isEntry)
    if (entries.length !== 1) throw new Error(`Expected one Cordova entry chunk, found ${entries.length}`)
    fs.writeFileSync(layout.cordova.exportsFile, `${JSON.stringify(entries[0].exports.sort(), null, 2)}\n`)
  }
}

const rnExternal = ['buffer', 'react-native', 'react-native-powerauth-mobile-sdk', 'react-native-powerauth-networking']
const cordovaExternal = ['cordova-powerauth-mobile-sdk', 'cordova-powerauth-networking']
const dtsPlugin = () => dts({ compilerOptions: { stripInternal: true } })

const rn = [
  {
    input: layout.rn.input,
    external: rnExternal,
    onwarn: failOnWarning,
    output: { file: path.join(layout.rn.outputDir, 'index.js'), format: 'es' },
    plugins: [nodeResolve({ extensions: ['.js', '.ts'] }), typescriptPlugin('ES5', layout.rn.sourceGlob)]
  },
  {
    input: layout.rn.input,
    external: rnExternal,
    onwarn: failOnWarning,
    output: { file: path.join(layout.rn.outputDir, 'index.d.ts'), format: 'es' },
    plugins: [dtsPlugin()]
  }
]

const cordova = [
  {
    input: layout.cordova.input,
    external: cordovaExternal,
    onwarn: failOnWarning,
    // PowerAuth is imported only for its global Cordova types.
    treeshake: { moduleSideEffects: id => id !== 'cordova-powerauth-mobile-sdk' },
    output: {
      file: layout.cordova.outputs.bundle,
      format: 'cjs',
      exports: 'named',
      paths: { 'cordova-powerauth-networking': 'cordova-powerauth-networking.WultraPowerAuthNetworking' }
    },
    plugins: [
      nodeResolve({ browser: true, preferBuiltins: false, extensions: ['.js', '.ts'] }),
      commonjs(),
      // The Cordova extension assigns to the global PowerAuth prototype, so keep `this` untyped there.
      typescriptPlugin('ES2019', layout.cordova.sourceGlob, { noImplicitThis: false }),
      writeCordovaExports
    ]
  },
  {
    input: layout.cordova.input,
    external: cordovaExternal,
    onwarn: failOnWarning,
    output: { file: layout.cordova.outputs.types, format: 'es' },
    plugins: [dtsPlugin()]
  }
]

export default buildTarget === 'rn' ? rn : buildTarget === 'cordova' ? cordova : [...rn, ...cordova]
