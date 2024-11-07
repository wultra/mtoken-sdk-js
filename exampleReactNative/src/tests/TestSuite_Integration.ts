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

import { PowerAuth, PowerAuthAuthentication } from 'react-native-powerauth-mobile-sdk';
import { TestSuite } from './TestSuite';
import { IntegrationUtils } from './utils/IntegrationUtils';
import { MobileToken, QROperationParser, UserAgent } from 'react-native-mtoken-sdk';

export class TestSuite_Integration extends TestSuite {

    private pin = "1234"
    private powerAuth!: PowerAuth
    private mtoken!: MobileToken
    private utils = new IntegrationUtils()

    protected async beforeAll(): Promise<void> {
        console.log("")
        console.log("beforeAll: loading test credentials...")
        await this.utils.loadCredentials()
        console.log("beforeAll: preparing activation...")
        const result = await this.utils.prepareActivation(this.pin)
        this.powerAuth = result.powerauth
        this.mtoken = result.mtoken
        console.log("beforeAll: activation prepared!")
    }

    protected async afterAll(): Promise<void> {
        if (this.powerAuth) {
            console.log("")
            console.log("afterAll: removing activation...")
            this.utils.removeRegistration(await this.powerAuth.getActivationIdentifier())
            this.powerAuth.removeActivationLocal()
            console.log("afterAll: activation removed!")
        }
    }

    async testList() {
        await this.mtoken.operations.pendingList()
    }

    async testApprovePayment() {
        await this.utils.createOperation()
        
        const operations = (await this.mtoken.operations.pendingList()).responseObject!!

        this.assertEquals(operations.length, 1, "Missing operation")

        const wrongAuth = PowerAuthAuthentication.password("xxxx") // wrong password on purpose
        const wrongResp = await this.mtoken.operations.authorize(operations[0], wrongAuth)
        this.assertNotNull(wrongResp.responseError, "Missing error after wrong auth")
        this.assertNull(wrongResp.responseObject, "Response object should be null after wrong auth")

        const auth = PowerAuthAuthentication.password(this.pin)
        const resp = await this.mtoken.operations.authorize(operations[0], auth)
        this.assertEquals(resp.status, "OK", "Missing response object after successful auth")
        this.assertNull(resp.responseError, "Response error should be null after successful auth")
    }

    async testRejectPayment() {
        const op = await this.utils.createOperation()
        const operations = await this.mtoken.operations.pendingList()
        const opFromList = operations.responseObject!!.find( it => it.id == op.operationId )
        if (opFromList == undefined) {
            this.fail("Operation was not in the list")
        }
        const resp = await this.mtoken.operations.reject(opFromList!!.id, "UNEXPECTED_OPERATION")
        this.assertEquals(resp.status, "OK")
    }

    async testOperationHistory() {
        // lets create 1 operation and leave it in the state of "pending"
        const op = await this.utils.createOperation()
        const auth = PowerAuthAuthentication.password(this.pin)
        const history = await this.mtoken.operations.history(auth)
        this.assertNotNull(history.responseObject)
        const opRecord = history.responseObject!!.find( it => it.id == op.operationId )
        this.assertNotNull(opRecord)
        this.assertEquals(opRecord?.status, "PENDING")
    }

    async testQROperation() {
        // create regular operation
        const op = await this.utils.createOperation()

        // get QR data of the operation
        const qrData = await this.utils.getQROperation(op.operationId)

        // parse the data
        const qrOperation = QROperationParser.parse(qrData.operationQrCodeData)

        // get the OTP with the "offline" signing
        const auth = PowerAuthAuthentication.password(this.pin)
        const otp = await this.mtoken.operations.authorizeOffline(qrOperation, auth)

        // verify the operation on the backend with the OTP
        const verifiedResult = await this.utils.verifyQROperation(op, qrData, otp)

        this.assertTrue(verifiedResult.otpValid, "OTP is not valid")
    }

    async testDetail() {
        const op = await this.utils.createNonPersonalizedPACOperation()
        const operation = await this.mtoken.operations.detail(op.operationId)
        this.assertNotNull(operation, "Failed to create & get the operation")
        this.assertEquals(op.operationId, operation.responseObject!!.id, "Operations ids are not equal")
    }

    async testClaim() {
        const op = await this.utils.createNonPersonalizedPACOperation()
        
        const resp = await this.mtoken.operations.claim(op.operationId)
        const operation = resp.responseObject!!
        this.assertNotNull(operation, "Failed to claim the operation")
        this.assertEquals(operation.ui!!.preApprovalScreen!!.type, "QR_SCAN")

        const totp = (await this.utils.getOperation(op.operationId)).proximityOtp
        this.assertNotNull(totp, "Even with proximityCheckEnabled: true, in proximityOtp nil")

        operation.proximityCheck = { totp: totp!!, type: "QR_CODE", timestampReceived: new Date() }

        var wrongAuth = PowerAuthAuthentication.password("xxxx") // wrong password on purpose
        const wrongResp = await this.mtoken.operations.authorize(operation, wrongAuth)
        this.assertNull(wrongResp.responseObject, "Response object should bu null")
        this.assertNotNull(wrongResp.responseError, "Response error should not be null")

        const auth = PowerAuthAuthentication.password(this.pin)
        const okResp = await this.mtoken.operations.authorize(operation, auth)
        this.assertNull(okResp.responseError, "Response error should be null")
        this.assertEquals(okResp.status, "OK")
    }

    async testOperationCanceledWithReason() {
        // create regular operation
        const op = await this.utils.createOperation()
        const cancelReason = "PREARRANGED_REASON"
        // cancel the operation
        await this.utils.cancelOperation(op.operationId, cancelReason)

        const operations = (await this.mtoken.operations.history(PowerAuthAuthentication.password(this.pin))).responseObject
        this.assertNotNull(operations, "Operations not retrieved")
        const opRecord = operations!!.find( it => it.id == op.operationId)
        this.assertNotNull(opRecord)
        this.assertEquals(opRecord!!.statusReason, cancelReason, `${opRecord?.statusReason} should be ${cancelReason}`)
    }

    async testTestUserAgents() {

        const expectedDefaultUserAgentProductName = "MobileTokenJS"
        const testUserAgent = "test-agent"

        // test default behavior (libraryDefault)
        this.mtoken.setUserAgent(UserAgent.LIBRARY_DEFAULT)
        await this.mtoken.operations.pendingList( request => {
            const headers = request.headers as Headers
            this.assertTrue(headers.get("user-agent")!!.startsWith(expectedDefaultUserAgentProductName), `user-agent should start with ${expectedDefaultUserAgentProductName}`)
            return request
        })

        // test custom user agent
        this.mtoken.setUserAgent(testUserAgent)
        await this.mtoken.inbox.unreadCount( request => {
            const headers = request.headers as Headers
            this.assertEquals(headers.get("user-agent"), testUserAgent)
            return request
        })


        // test system default (should be undefined in the request)
        this.mtoken.setUserAgent(UserAgent.SYSTEM_DEFAULT)
        await this.mtoken.operations.pendingList( request => {
            const headers = request.headers as Headers
            this.assertEquals(headers.get("user-agent"), undefined)
            return request
        })
    }

    async testAcceptLanguage() {

        const en = "en"
        const cs = "cs"

        // set eng lang
        this.mtoken.setAcceptLanguage(en)
        await this.mtoken.operations.pendingList( request => {
            const headers = request.headers as Headers
            this.assertEquals(headers.get("accept-language")!!, en)
            return request
        })

        // set czech lang
        this.mtoken.setAcceptLanguage(cs)
        await this.mtoken.inbox.unreadCount( request => {
            const headers = request.headers as Headers
            this.assertEquals(headers.get("accept-language"), cs)
            return request
        })
    }
}
