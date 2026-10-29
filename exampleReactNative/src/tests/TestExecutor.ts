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

import { TestResult, TestSuite } from './TestSuite'
import { TestReporter } from './TestReporter'
import { TestSuite_Deserialization } from './TestSuite_Deserialization'
import { TestSuite_Integration } from './TestSuite_Integration'
import { TestSuite_IntegrationInbox } from './TestSuite_IntegrationInbox'
import { TestSuite_PACUtils } from './TestSuite_PACUtils'
import { TestSuite_QRParser } from './TestSuite_QRParser'
import { TestSuite_Logger } from './TestSuite_Logger'
import { TestSuite_OIDC } from './TestSuite_OIDC'
import { TestSuite_PreApprovalScreens } from './TestSuite_PreApprovalScreens'

export class TestExecutor {

    private suites = new Array<TestSuite>()
    private running = false

    constructor() {
        // Explicit suite names remain stable in minified release applications.
        this.suites.push(new TestSuite_Deserialization('Deserialization'))
        this.suites.push(new TestSuite_PreApprovalScreens('PreApprovalScreens'))
        this.suites.push(new TestSuite_PACUtils('PACUtils'))
        this.suites.push(new TestSuite_QRParser('QRParser'))
        this.suites.push(new TestSuite_Logger('Logger'))
        this.suites.push(new TestSuite_Integration('Integration'))
        this.suites.push(new TestSuite_IntegrationInbox('IntegrationInbox'))
        this.suites.push(new TestSuite_OIDC('OIDC'))
    }

    async runAllTests(): Promise<{ totalTests: number, succeededTests: number, skippedTests: number }> {
        if (this.running) throw new Error('Tests are already running')
        this.running = true
        const reporter = new TestReporter()
        const results: TestResult[] = []
        const report = async (result: TestResult) => {
            results.push(result)
            console.log(`${result.status}: ${result.suite}.${result.name}`)
            await reporter.send('result', { result })
        }
        try {
            await reporter.send('start', { tests: this.suites.flatMap(suite =>
                suite.testNames.map(name => ({ suite: suite.suiteName, name }))) })
            let interrupted = false
            for (const suite of this.suites) {
                if (interrupted) {
                    for (const name of suite.testNames) {
                        await report({ suite: suite.suiteName, name, status: 'failed', duration: 0, message: 'Run interrupted' })
                    }
                } else {
                    try { await suite.runAllTests(report) } catch { interrupted = true }
                }
            }
            await reporter.send('complete', {})
            return {
                totalTests: results.length,
                succeededTests: results.filter(result => result.status === 'passed').length,
                skippedTests: results.filter(result => result.status === 'skipped').length
            }
        } finally {
            this.running = false
        }
    }

    stopAllTests() {
        for (const suite of this.suites) {
            suite.stop()
        }
    }
}
