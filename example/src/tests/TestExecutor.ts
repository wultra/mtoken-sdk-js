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

import { type MobileTokenResponse, UserOperation } from 'react-native-powerauth-mobile-sdk';

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

    protected assertEquals(a: any, b: any, message: string = "Objects are not equal") {
        if (a != b) {
            throw new Error(`Assertion failed: ${message}: ${a} != ${b}`);
        }
    }

    protected assertNotNull(a: any, message: string = "Object is null") {
        if (a == null) {
            throw new Error(`Assertion failed: ${message}: ${a} is null`);
        }
    }
}

class DeserializationTestSuite extends TestSuite {
    
    async testEmptyList(): Promise<void> {
        const json = "{\"status\":\"OK\",\"responseObject\":[]}"
        const object = JSON.parse(json) as MobileTokenResponse<UserOperation[]>
        this.assertEquals(object.status, "OK", "Empty list deserialization failed")
        this.assertEquals(object.responseObject.length, 0, "Empty list deserialization failed")
    }

    async testRealDataNoAttributes(): Promise<void> {
        const json = `{ "status": "OK", "responseObject": [ { "id": "8eebd926-40d4-4214-8208-307f01b0b68f", "name": "authorize_payment", "data": "A1*A100CZK*Q238400856/0300**D20170629*NUtility Bill Payment - 05/2017", "operationCreated": "2018-06-21T13:41:41+0000", "operationExpires": "2018-06-21T13:46:45+0000", "allowedSignatureType": { "type": "2FA", "variants": [ "possession_knowledge", "possession_biometry" ] }, "formData": { "title": "Confirm Payment", "message": "Hello,\\nplease confirm following payment:", "attributes": [ ] } } ] }`
        const response = JSON.parse(json) as MobileTokenResponse<UserOperation[]>
        this.assertNotNull(response)
        this.assertEquals("OK", response.status)
        this.assertEquals(1, response.responseObject.length)
        const operation = response.responseObject[0]
        this.assertEquals(0, operation.formData.attributes.length)
    }
}
