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

// Dependencies
const gulp = require("gulp") // gulp itself
const ts = require("gulp-typescript") // to be able to compile typescript
const replace = require('gulp-replace')
const concat = require('gulp-concat')
const stripImportExport = require("gulp-strip-import-export")
const { rimraf } = require('rimraf') // folder cleaner
const { build } = require("esbuild")
const fs = require('fs')
const exec = require('child_process').exec

// Out files
const buildDir = "build"
const tmpDir = ".build"

/***********************
* REACT-NATIVE SECTION *
************************/
{
    const RN_packageJson = "package.json"
    const RN_tsConfig = "tsconfig.json"
    const RN_buildDir = `${buildDir}/react-native`
    const RN_sources = "src/**/**.ts"
    const RN_libDir = "lib"

    const clearRN = () => rimraf([ RN_buildDir ])

    const compileRNTask = () =>
        gulp
            .src(RN_sources)
            .pipe(ts(RN_tsConfig))
            .pipe(gulp.dest(`${RN_buildDir}/${RN_libDir}`))

    const copyRNPackageJson = () => 
        gulp
            .src(RN_packageJson)
            .pipe(gulp.dest(RN_buildDir))

    const packRNPackage = () => exec(`pushd ${RN_buildDir} && npm pack`)

    var RN_buildTask = gulp.series(clearRN, compileRNTask, copyRNPackageJson, packRNPackage)
}

/***********************
*  CORDOVA.JS SECTION  *
************************/
{
    const CDV_patchSourcesDir = "cordova"
    const CDV_packageJson = `${CDV_patchSourcesDir}/package.json`
    const CDV_pluginXml = `${CDV_patchSourcesDir}/plugin.xml`
    const CDV_buildDir = `${buildDir}/cdv`
    const CDV_tempDir = `${tmpDir}/cdv`
    const CDV_libDir = "lib"
    const CDV_outFileDir = `${CDV_buildDir}/${CDV_libDir}`
    const CDV_pluginName = "WultraMobileTokenPlugin"
    const CDV_outFile = `${CDV_outFileDir}/${CDV_pluginName}.js`

    const clearCDVall = () => rimraf([ CDV_buildDir, CDV_tempDir ])
    const clearCDVtemp = () => rimraf([ CDV_tempDir ])

    const copyCDVSourceFiles = () =>
        gulp
            .src("src/**/**.ts", { base: ".", allowEmpty: true })
            // .pipe(replace(/.+ @cordova-remove *[^\n]*/g, "")) // remove lines with @cordova-remove
            .pipe(replace(/.*import.+react-native-powerauth-mobile-sdk *[^\n]*/g, "import 'cordova-powerauth-mobile-sdk'\n"))
            .pipe(gulp.dest(CDV_tempDir))

    const copyCDVPatchSourceFiles = () =>
        gulp
            .src([`${CDV_patchSourcesDir}/src/**.ts`], { base: CDV_patchSourcesDir })
            .pipe(gulp.dest(CDV_tempDir))

    const compileCDVTask = () => 
        build({
            entryPoints: [`${CDV_tempDir}/src/index.ts`],
            outfile: CDV_outFile,
            external: ["cordova-powerauth-mobile-sdk"],
            bundle: true,
            format: "cjs",
            target: "ios13",
            //minify: true
        })

    const patchCDVCompiledTask = () =>
        gulp
            .src(CDV_outFile)
            .pipe(replace(/.*require\("cordova-powerauth-mobile-sdk"\)*./g, ""))
            .pipe(gulp.dest(CDV_outFileDir))

    const createCDVDtsTask = () =>
        gulp
            .src([`${CDV_tempDir}/src/WultraMobileToken.ts`, `${CDV_tempDir}/src/WMT*.ts`, `${CDV_tempDir}/src/*/**.ts`])
            .pipe(ts({ declaration: true, emitDeclarationOnly: true }))
            .pipe(concat(`typings.d.ts`))
            .pipe(stripImportExport())
            .pipe(replace(/.*import.+cordova-powerauth-mobile-sdk *[^\n]*/g, ""))
            .pipe(gulp.dest(CDV_buildDir))

    // TODO: extract from the code
    const objectsToExport = [
        "WultraMobileToken",
        "WMTLogger",
        "WMTLoggerVerbosity",
        "WMTException",
        "WMTInbox",
        "WMTKnownRestApiError",
        "WMTUserAgent",
        "WMTOperations",
        "WMTPACUtils",
        "WMTQROperationParser",
        "WMTSigningKey",
        "WMTQROperationDataVersion",
        "WMTSignatureFactor",
        "WMTQROperationDataFieldType",
        "WMTAttributeType",
        "WMTPush"
    ]

    const exportModules = () => {
        return new Promise(function(resolve) {
            objectsToExport.forEach( v => {
                fs.writeFileSync(
                    `${CDV_outFileDir}/${v}.js`, 
                    // TODO: extract
                    `require("cordova-mtoken-sdk.${CDV_pluginName}");\nmodule.exports = ${CDV_pluginName}.${v};`
                );
            })
            resolve()
        });
    }

    const copyCDVStaticFiles = () => 
        gulp
            .src([CDV_packageJson, CDV_pluginXml])
            .pipe(
                replace(
                    "<!-- PLACEHOLDER_MODULES -->",
                    [CDV_pluginName, ...objectsToExport]
                        .map((v) => `    <js-module src="${CDV_libDir}/${v}.js" name="${v}"><clobbers target="${v}" /></js-module>`)
                        .join("\n")
                )
            )
            .pipe(gulp.dest(CDV_buildDir))
        
    const packCDVPackage = () => exec(`pushd ${CDV_buildDir} && npm pack`)

    // join cordova compile and modify for export task
    var CDV_buildTask = gulp.series(
        clearCDVall,
        copyCDVSourceFiles,
        copyCDVPatchSourceFiles,
        compileCDVTask,
        patchCDVCompiledTask,
        createCDVDtsTask,
        exportModules,
        copyCDVStaticFiles,
        packCDVPackage,
        clearCDVtemp
    )
}

/***********************
*   FINAL GULP TASKS   *
************************/

let cleanBuild = () => rimraf([ buildDir ])
let cleanTemp = () => rimraf([ tmpDir ])

// first, delete output folders, then compile cordova and capacitor in parallel
const buildAllTask = gulp.series(
    cleanBuild,
    cleanTemp,
    gulp.parallel(
        RN_buildTask,
        CDV_buildTask
    ),
    cleanTemp
)

gulp.task("default", buildAllTask)
gulp.task("rn", RN_buildTask)
gulp.task("cdv", CDV_buildTask)