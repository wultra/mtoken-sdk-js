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
const gulp = require("gulp"); // gulp itself
const ts = require("gulp-typescript"); // to be able to compile typescript
const { rimraf } = require('rimraf'); // folder cleaner
const fs = require('fs');
const exec = require('child_process').exec;

// Out files
const buildDir = "build";
const tmpDir = ".build";

/***********************
* REACT-NATIVE SECTION *
************************/
{
    const RN_packageJson = "package.json";
    const RN_tsConfig = "tsconfig.json";
    const RN_buildDir = `${buildDir}/react-native`;
    const RN_sources = "src/**/**.ts";
    const RN_libDir = "lib";

    const clearRN = () => rimraf([ RN_buildDir ]);

    const compileRNTask = () =>
        gulp
            .src(RN_sources)
            .pipe(ts(RN_tsConfig))
            .pipe(gulp.dest(`${RN_buildDir}/${RN_libDir}`));

    const copyRNPackageJson = () => 
        gulp
            .src(RN_packageJson)
            .pipe(gulp.dest(RN_buildDir));

    const packRNPackage = () => exec(`pushd ${RN_buildDir} && npm pack`);

    var RN_buildTask = gulp.series(clearRN, compileRNTask, copyRNPackageJson, packRNPackage);
}

// first, delete output folders, then compile cordova and capacitor in parallel
const buildAllTask = gulp.series(
    //cleanBuild,
    //cleanTemp,
    gulp.parallel(
        RN_buildTask,
        //CAP_buildTask,
        //CDV_buildTask
    ),
    //cleanTemp
);

gulp.task("default", buildAllTask);
gulp.task("rn", RN_buildTask);