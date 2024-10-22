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

import { type MobileTokenResponse } from 'react-native-powerauth-mobile-sdk';

export class TestExecutor {

    private suites = new Array<TestSuite>();

    constructor() {
        this.suites.push(new DeserializationTestSuite());
    }

    async runAllTests() {
        for (const suite of this.suites) {
            await suite.runAllTests();
        }
    }
}

class TestSuite {

    private testFcs = new Array<string>();
    protected suiteName: string;

    constructor() {

        this.suiteName = this.constructor.name.replace(/(Test|Suite)$/g, '');
        
        const anyThis = this as any

        // Retrieve all function names from the object and call them
        Object.getOwnPropertyNames(Object.getPrototypeOf(anyThis)).forEach(key => {
            console.log(key);
            if (typeof anyThis[key] === 'function' && key.startsWith("test")) {
                this.testFcs.push(key);
            }
        });
    }

    async runAllTests() {

        let successCount = 0;

        console.log(`Running test suite "${this.suiteName}"`);


        for (const test of this.testFcs) {
            console.log(`Running test "${test}"`);
            try {
                await (this as any)[test]();
                successCount++;
            } catch(e) {
                console.error(`Test ${test} failed: ${e}`);
            }
        }

        console.log(`Test suite "${this.suiteName}" finished with ${successCount}/${this.testFcs.length} success.\n-----------------------`)
    }

    protected assert(condition: boolean, message: string) {
        if (!condition) {
            throw new Error(message);
        }
    }
}

class DeserializationTestSuite extends TestSuite {
    
    async testEmptyList(): Promise<void> {
        const json = "{\"status\":\"OK\",\"responseObject\":[]}"
        const object = JSON.parse(json) as MobileTokenResponse<UserOperation>
        this.assert(object.status == "OK", "Empty list deserialization failed")
        this.assert(object.responseObject.length == 0, "Empty list deserialization failed")
    }
}

