//
// Copyright 2024 Wultra s.r.o.
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

const gulp = require("gulp");
const replace = require('gulp-replace');
const { build } = require("esbuild");
const { rimraf } = require('rimraf'); // folder cleaner
const exec = require('child_process').exec;
const dotenv = require('dotenv');
const fs = require('fs');
const stripImportExport = require("gulp-strip-import-export")

const tempDir = ".temp"
const rnTestAppDir = "../exampleReactNative"
const outFile = "www/js/index.js"

let cleanTemp = () => rimraf([ tempDir ])

// parse environment configuration
const privateFile = `${rnTestAppDir}/src/tests/utils/credentials-private.json`
const publicFile = `${rnTestAppDir}/src/tests/utils/credentials.json`
const jsonConfig = fs.readFileSync(fs.existsSync(privateFile) ? privateFile : publicFile)
// TODO: do better?
const credentialsFileContent = `
export class IntegrationCredentials {

    static async loadCredentials(): Promise<CredentialsObject> {
        return ${jsonConfig}
    }
}
`

const copyTestFiles = () =>
    gulp
        .src([`${rnTestAppDir}/src/tests/**/**.ts`], { base: rnTestAppDir })
        .pipe(replace(/import {[a-zA-Z }\n,]+from.*react-native-powerauth-mobile-sdk.*/g, ''))
        .pipe(replace(/import {[a-zA-Z }\n,]+from.*react-native-mtoken-sdk.*/g, ''))
        //.pipe(stripImportExport())
        .pipe(gulp.dest(tempDir));

const createCredentialsFile = () => {
    return new Promise(function(resolve) {
        fs.writeFileSync(`${tempDir}/src/tests/utils/IntegrationCredentials.ts`, credentialsFileContent)
        resolve()
    });
}

const copyAppFiles = () =>
    gulp
        .src(["src/App.tsx"], { base: "." })
        .pipe(gulp.dest(tempDir));

const compile = () => 
    build({
        entryPoints: [`${tempDir}/src/App.tsx`],
        outfile: outFile,
        bundle: true,
        target: "ios13",
        // minify: true // do not minify for easier debug
    })

// to make sure all files are copied in the proper place
const prepareIOS = () => exec("npx cordova prepare ios")

// patch testapp files
const patchNativeFiles = () =>
    gulp
        .src("patch-files/platforms/**/**", { base: "patch-files" })
        .pipe(gulp.dest("."))


gulp.task("default", gulp.series(
    cleanTemp,
    copyTestFiles,
    createCredentialsFile,
    copyAppFiles,
    compile,
    cleanTemp,
    prepareIOS,
    patchNativeFiles
));