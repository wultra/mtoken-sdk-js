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
// See the License for the specific language governing permissions
// and limitations under the License.
//

import type {  MobileTokenResponse, UserOperation, OperationAttributeAmount, OperationAttributeKeyValue, OperationAttributeNote, OperationAttributeAmountConversion, OperationAttributeImage, OperationAttributeHeading } from 'react-native-mtoken-sdk';
import { AttributeType } from 'react-native-mtoken-sdk';
import { TestSuite } from './TestSuite';
import { TestSuite_Deserialization } from './TestSuite_Deserialization';
import { TestSuite_PACUtils } from './TestSuite_PACUtils';

export class TestExecutor {

    private suites = new Array<TestSuite>();

    constructor() {
        this.suites.push(new TestSuite_Deserialization());
        this.suites.push(new TestSuite_PACUtils());
    }

    async runAllTests() {
        console.log("")
        console.log("#######################")
        console.log("#    RUNNING TESTS")
        console.log("#######################")

        let totalTests = 0
        let succeededTests = 0

        for (const suite of this.suites) {
            totalTests += suite.testCount;
            succeededTests += await suite.runAllTests();
        }

        console.log("")
        console.log("####################################################")
        console.log(`#    ALL TESTS FINISHED. ${succeededTests}/${totalTests} SUCCEEDED.`)
        console.log("####################################################")
    }
}
