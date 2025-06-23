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

    private testFcs = new Array<string>()
    suiteName: string

    private isStopped = true

    constructor() {

        this.suiteName = this.constructor.name.replace(/(Test|Suite)$/g, '')
        
        const anyThis = this as any

        // Retrieve all function names that stars with the "test" and call them
        Object.getOwnPropertyNames(Object.getPrototypeOf(anyThis)).forEach(key => {
            if (typeof anyThis[key] === 'function' && key.startsWith("test")) {
                this.testFcs.push(key)
            }
        })
    }

    get testCount() { return this.testFcs.length }

    // called before all tests
    protected async beforeAll(): Promise<void> {

    }

    // called after all tests
    protected async afterAll(): Promise<void> {

    }

    // called before each test
    protected async beforeEach(testname: string): Promise<void> {

    }

    // called after each test
    protected async afterEach(testname: string, success: boolean): Promise<void> {
        
    }

    async runAllTests(): Promise<number> {

        if (!this.isStopped) {
            console.log(`Stopping ${this.suiteName} tests...`)
            return 0
        }

        this.isStopped = false
        let successCount = 0

        console.log("")
        console.log(`-----------------------`)
        console.log(`# STARTING TEST SUITE "${this.suiteName}" (${this.testCount} tests)`)

        try {
            await this.runAmbigiousMethod("beforeAll")
        } catch(e) {
            console.log(`beforeAll ${this.suiteName} failed: ${JSON.stringify(e)}. Stopping all test in this suite`)
            return 0
        }

        for (const test of this.testFcs) {
            if (this.isStopped) {
                return successCount
            }
            console.log("")
            console.log(`${test} started...`)
            try {
                await this.runAmbigiousMethod("beforeEach", test)
            } catch(e) {
                console.log(`- beforeEach ${test} failed: ${JSON.stringify(e)}`)
                continue
            }
            let success: boolean
            try {
                await this.runAmbigiousMethod(test)
                console.log(`- SUCCESS: Test ${test}`)
                successCount++
                success = true
            } catch(e) {
                console.error(`- FAIL: Test ${test}: ${JSON.stringify(e)}`)
                success = false
            }
            try {
                await this.runAmbigiousMethod("afterEach", test, success)
            } catch(e) {
                console.log(`- afterEach ${test} failed: ${JSON.stringify(e)}`)
            }
        }

        try {
            await this.runAmbigiousMethod("afterAll")
        } catch(e) {
            console.log(`- afterAll ${this.suiteName} failed: ${e}`)
        }

        console.log("")
        console.log(`# TEST SUITE "${this.suiteName}" FINISHED WITH ${successCount}/${this.testFcs.length} SUCCESS.`)
        return successCount
    }

    stop() {
        console.log(`Stopping ${this.suiteName} tests...`)
        this.isStopped = true
    }


    protected assertEquals(a: any, b: any, message: string = "Objects are not equal") {
        if (a != b) {
            throw new Error(`Assertion failed: ${message}: ${a} != ${b}`)
        }
    }

    protected assertNotNull(a: any, message: string = "Object is null") {
        if (a == null) {
            throw new Error(`Assertion failed: ${message}`)
        }
    }

    protected assertNull(a: any, message: string = "Object is not null") {
        if (a != null) {
            throw new Error(`Assertion failed: ${message}`)
        }
    }

    protected assertThrow(call: () => void, message: string = "Function did not throw") {
        try {
            call()
        } catch(e) {
            return
        }
        throw new Error(`Assertion failed: ${message}`)
    }

    protected assertTrue(a: boolean, message: string = "Object is false") {
        if (!a) {
            throw new Error(`Assertion failed: ${message}`)
        }
    }

    protected assertFalse(a: boolean, message: string = "Object is true") {
        if (a) {
            throw new Error(`Assertion failed: ${message}`)
        }
    }

    protected fail(message: string = "Test failed") {
        throw new Error(`Assertion failed: ${message}`)
    }

    // run method regardles of synchronousnes
    private async runAmbigiousMethod(method: string, ...params: any[]) {
        await Promise.resolve((this as any)[method]())
    }
}
