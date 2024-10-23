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

export class TestSuite {

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

    get testCount() { return this.testFcs.length }


    async runAllTests(): Promise<number> {

        let successCount = 0;

        console.log("")
        console.log(`-----------------------`);
        console.log(`# STARTING TEST SUITE "${this.suiteName}" (${this.testCount} tests)`);

        for (const test of this.testFcs) {
            console.log("")
            console.log(`${test} started...`);
            try {
                if ((this as any)[test][Symbol.toStringTag] === 'AsyncFunction') {
                    await (this as any)[test]();
                } else {
                    (this as any)[test]();
                }
                console.log(`- SUCCESS: Test ${test}`);
                successCount++;
            } catch(e) {
                console.error(`- FAIL: Test ${test}: ${e}`);
            }
        }

        console.log("")
        console.log(`# TEST SUITE "${this.suiteName}" FINISHED WITH ${successCount}/${this.testFcs.length} SUCCESS.`)
        return successCount
    }

    protected assertEquals(a: any, b: any, message: string = "Objects are not equal") {
        if (a != b) {
            throw new Error(`Assertion failed: ${message}: ${a} != ${b}`);
        }
    }

    protected assertNotNull(a: any, message: string = "Object is null") {
        if (a == null) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    protected assertNull(a: any, message: string = "Object is not null") {
        if (a != null) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    protected assertTrue(a: boolean, message: string = "Object is false") {
        if (!a) {
            console.trace();
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    protected assertFalse(a: boolean, message: string = "Object is true") {
        if (a) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }


    protected fail(message: string = "Test failed") {
        throw new Error(`Assertion failed: ${message}`);
    }
}
