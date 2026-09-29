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

const path = require('node:path')

const rootDir = path.resolve(__dirname, '..')
const sharedDir = path.join(rootDir, 'packages', 'lib-shared')
const rnPackageDir = path.join(rootDir, 'packages', 'lib-rn')
const rnStageDir = path.join(rnPackageDir, 'build')
const cordovaPackageDir = path.join(rootDir, 'packages', 'lib-cordova')
const cordovaStageDir = path.join(cordovaPackageDir, 'build')
const cordovaTempDir = path.join(cordovaPackageDir, '.build')

module.exports = {
  rootDir,
  tsconfig: path.join(rootDir, 'tsconfig.json'),
  shared: {
    jsDir: path.join(sharedDir, 'js')
  },
  rn: {
    packageDir: rnPackageDir,
    stageDir: rnStageDir,
    sourceDir: path.join(rnStageDir, 'src'),
    input: path.join(rnStageDir, 'src', 'index.ts'),
    sourceGlob: 'packages/lib-rn/build/src/**/*.ts',
    outputDir: path.join(rnStageDir, 'lib')
  },
  cordova: {
    packageDir: cordovaPackageDir,
    stageDir: cordovaStageDir,
    tempDir: cordovaTempDir,
    sourceDir: path.join(cordovaTempDir, 'src'),
    input: path.join(cordovaTempDir, 'src', 'index.ts'),
    sourceGlob: 'packages/lib-cordova/.build/src/**/*.ts',
    exportsFile: path.join(cordovaTempDir, 'runtime-exports.json'),
    pluginName: 'WultraMobileTokenPlugin',
    outputs: {
      bundle: path.join(cordovaStageDir, 'lib', 'WultraMobileTokenPlugin.js'),
      types: path.join(cordovaStageDir, 'typings.d.ts')
    }
  }
}
