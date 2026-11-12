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

export interface TestResult {
    suite: string
    name: string
    status: 'passed' | 'failed' | 'skipped'
    duration: number
    message?: string
}

class SkippedTest extends Error {}
class AssertionFailure extends Error {}
export class TestTimeout extends Error {}

/** Only an enum-like error code (e.g. PowerAuthErrorCode) is safe to export. */
function errorCode(error: any): string {
    const code = error?.code
    return typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? ` (${code})` : ''
}

/** Runs the same tests in Hermes and Cordova's WebView, including the native SDK. */
export class TestSuite {
    readonly suiteName: string
    private stopped = false
    readonly testNames = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
        .filter(name => name.startsWith('test') && typeof (this as any)[name] === 'function')

    get testCount() { return this.testNames.length }

    constructor(name?: string) { this.suiteName = name ?? this.constructor.name }

    protected async beforeAll(): Promise<void> {}
    protected async afterAll(): Promise<void> {}
    protected async beforeEach(_name: string): Promise<void> {}
    protected async afterEach(_name: string, _success: boolean): Promise<void> {}

    async runAllTests(report: (result: TestResult) => Promise<void>, timeout = 90000): Promise<void> {
        this.stopped = false
        let setupError: unknown
        let setupFailed = false
        let timedOut = false
        const run = async (body: () => unknown) => {
            let timer: ReturnType<typeof setTimeout> | undefined
            try {
                await Promise.race([
                    Promise.resolve().then(body),
                    new Promise<never>((_, reject) => {
                        timer = setTimeout(() => reject(new TestTimeout('Test phase timed out')), timeout)
                    })
                ])
            } catch (error) {
                if (error instanceof TestTimeout) timedOut = true
                throw error
            } finally {
                clearTimeout(timer)
            }
        }
        try {
            try { await run(() => this.beforeAll()) } catch (error) { setupError = error; setupFailed = true }
            for (const name of this.testNames) {
                const started = Date.now()
                let error = setupError
                let failed = setupFailed
                if (this.stopped || timedOut) { error = new Error('Run interrupted'); failed = true }
                if (!failed) {
                    try {
                        await run(() => this.beforeEach(name))
                        await run(() => (this as any)[name]())
                    } catch (caught) {
                        error = caught
                        failed = true
                    } finally {
                        try { await run(() => this.afterEach(name, !failed)) } catch (caught) { error = caught; failed = true }
                    }
                }
                const status = error instanceof SkippedTest ? 'skipped' : failed ? 'failed' : 'passed'
                // Do not export arbitrary SDK exceptions, bodies, OTPs, or credentials to CI artifacts.
                const message = error instanceof AssertionFailure || error instanceof SkippedTest || error instanceof TestTimeout
                    ? error.message : failed ? `Test or setup failed${errorCode(error)}; inspect the failing test on the device` : undefined
                await report({ suite: this.suiteName, name, status, duration: Date.now() - started, message })
            }
        } finally {
            try { await run(() => this.afterAll()) } catch {
                await report({ suite: this.suiteName, name: '[afterAll]', status: 'failed', duration: 0, message: 'Suite cleanup failed' })
            }
        }
        // A timed out native call cannot be cancelled safely; do not start another suite.
        if (timedOut) throw new TestTimeout('Test phase timed out')
    }

    stop() { this.stopped = true }
    protected assertEquals(a: any, b: any, message = 'Objects are not equal') {
        // Preserve the existing suites' equality contract, including null/undefined.
        if (a != b) throw new AssertionFailure(message)
    }
    protected assertNotNull(a: any, message = 'Object is null') {
        if (a == null) throw new AssertionFailure(message)
    }
    protected assertNull(a: any, message = 'Object is not null') {
        if (a != null) throw new AssertionFailure(message)
    }
    protected assertThrow(call: () => void, message = 'Function did not throw') {
        try { call() } catch { return }
        throw new AssertionFailure(message)
    }
    protected assertTrue(a: boolean, message = 'Object is false') {
        if (!a) throw new AssertionFailure(message)
    }
    protected assertFalse(a: boolean, message = 'Object is true') {
        if (a) throw new AssertionFailure(message)
    }
    protected skip(reason: string): never { throw new SkippedTest(reason) }
    protected fail(message = 'Test failed'): never { throw new AssertionFailure(message) }
}
