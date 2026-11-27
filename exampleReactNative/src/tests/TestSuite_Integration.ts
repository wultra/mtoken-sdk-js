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

import { PowerAuth, PowerAuthAuthentication, PowerAuthSignatureKeyId, PowerAuthUtils } from 'react-native-powerauth-mobile-sdk';
import { Buffer } from 'buffer';
import { TestSuite } from './TestSuite';
import { IntegrationUtils } from './utils/IntegrationUtils';
import { WPNUserAgent, WPNKnownRestApiError, WPNRequestInterceptor } from 'react-native-powerauth-networking';
import { WultraMobileToken, WMTOperations, WMTQROperationParser, WMTSigningKey, WMTPushData, WMTAPNSEnvironment, WMTException, WMTUserOperationProximityCheck, WMTLogger, WMTLoggerVerbosity } from 'react-native-mtoken-sdk';

export class TestSuite_Integration extends TestSuite {

    private pin = "1234"
    private powerAuth!: PowerAuth
    private mtoken!: WultraMobileToken
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
            try { await this.utils.removeRegistration(await this.powerAuth.getActivationIdentifier()) }
            finally { await this.powerAuth.removeActivationLocal() }
            console.log("afterAll: activation removed!")
        }
    }

    async testList() {
        await this.mtoken.operations.getOperations()
    }

    async testExplicitBaseURL() {
        const configuration = await this.powerAuth.configuration
        const operations = new WMTOperations(this.powerAuth, configuration.baseEndpointUrl)
        this.assertEquals((await operations.getOperations()).status, "OK")
    }

    async testFrequentFetchWarning() {
        const warnings: string[] = []
        WMTLogger.setLogListener((message, verbosity) => {
            if (verbosity === WMTLoggerVerbosity.WARN && message.startsWith("Pending operations requested")) {
                warnings.push(message)
            }
        }, false)

        try {
            const mtoken = this.powerAuth.createWultraMobileToken()
            // Both requests start immediately, so the result doesn't depend on the network latency
            const first = mtoken.operations.getOperations()
            this.assertEquals(warnings.length, 0, "the first fetch should not log a warning")

            const second = mtoken.operations.getOperations()
            this.assertEquals(warnings.length, 1, "a fetch repeated sooner than 7 seconds should log a warning")
            await Promise.all([first, second])

            await new Promise(resolve => setTimeout(resolve, 7100))
            await mtoken.operations.getOperations()
            this.assertEquals(warnings.length, 1, "a fetch repeated after 7 seconds should not log a warning")
        } finally {
            WMTLogger.setLogListener(null)
        }
    }

    async testUnconfiguredPowerAuthRejectsRequest() {
        const powerAuth = new PowerAuth(`unconfigured-${Date.now()}`)
        const mtoken = powerAuth.createWultraMobileToken()
        let rejected = false

        try {
            await mtoken.operations.getOperations()
        } catch {
            rejected = true
        }

        this.assertTrue(rejected, "Request should fail without PowerAuth configuration")
    }

    async testApprovePayment() {
        await this.utils.createOperation()
        
        const operations = (await this.mtoken.operations.getOperations()).responseObject!!

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

    async testMobileTokenData() {
        
        // create operation on the server
        const serverOp = await this.utils.createOperation()
        
        // get operation detail
        const detail = (await this.mtoken.operations.getDetail(serverOp.operationId)).responseObject!!

        // create mobile token data object with test values
        const mobileTokenData = {
            test1: 1,
            test2: 2.3,
            test3: "string",
            test4: {
                nested: true
            }
        }

        // set mobile token data to the operation detail
        detail.mobileTokenData = mobileTokenData

        // authorize the operation with mobile token data
        await this.mtoken.operations.authorize(detail, PowerAuthAuthentication.password(this.pin))

        // get the operation again to verify the mobile token data
        const authorizedOp = await this.utils.getOperation(serverOp.operationId)

        this.assertEquals(authorizedOp.additionalData?.mobileTokenData?.test1, 1, "Mobile token data test1 should be 1")
        this.assertEquals(authorizedOp.additionalData?.mobileTokenData?.test2, 2.3, "Mobile token data test2 should be 2.3")
        this.assertEquals(authorizedOp.additionalData?.mobileTokenData?.test3, "string", "Mobile token data test3 should be 'string'")
        this.assertTrue(authorizedOp.additionalData?.mobileTokenData?.test4?.nested, "Mobile token data test4 should be an object with nested set to true")
    }

    async testRepeatedApprovePayment() {
        const op = await this.utils.createOperation()
        
        const operation = (await this.mtoken.operations.getDetail(op.operationId)).responseObject!!

        // authorize the operation
        const auth = PowerAuthAuthentication.password(this.pin)
        const resp = await this.mtoken.operations.authorize(operation, auth)
        this.assertEquals(resp.status, "OK", "Missing response object after successful auth")
        this.assertNull(resp.responseError, "Response error should be null after successful auth")

        // repeated authorization should result in error
        const respRepeated = await this.mtoken.operations.authorize(operation, auth)
        this.assertEquals(respRepeated.responseError?.code, WPNKnownRestApiError.OperationAlreadyFinished, "Missing response object after successful auth")
        this.assertEquals(respRepeated.status, "ERROR", "Status should be ERROR after error")
    }

    async testRejectPayment() {
        const op = await this.utils.createOperation()
        const operations = await this.mtoken.operations.getOperations()
        const opFromList = operations.responseObject!!.find( it => it.id == op.operationId )
        if (opFromList == undefined) {
            this.fail("Operation was not in the list")
        }
        const resp = await this.mtoken.operations.reject(opFromList!!.id, "UNEXPECTED_OPERATION")
        this.assertEquals(resp.status, "OK")
    }

    async testRejectPaymentWithOperation() {
        const serverOp = await this.utils.createOperation()
        const detail = (await this.mtoken.operations.getDetail(serverOp.operationId)).responseObject!!

        detail.mobileTokenData = { rejectionContext: "pre-approval", screenId: "intro-warning" }

        const resp = await this.mtoken.operations.reject(detail, "PREAPPROVAL")
        this.assertEquals(resp.status, "OK", "Reject with operation object should succeed")

        const rejectedOp = await this.utils.getOperation(serverOp.operationId)
        this.assertEquals(rejectedOp.additionalData?.mobileTokenData?.rejectionContext, "pre-approval", "Mobile token data rejectionContext should be 'pre-approval'")
        this.assertEquals(rejectedOp.additionalData?.mobileTokenData?.screenId, "intro-warning", "Mobile token data screenId should be 'intro-warning'")
    }

    async testOperationHistory() {
        // lets create 1 operation and leave it in the state of "pending"
        const op = await this.utils.createOperation()
        const auth = PowerAuthAuthentication.password(this.pin)
        const history = await this.mtoken.operations.getHistory(auth)
        this.assertNotNull(history.responseObject)
        const opRecord = history.responseObject!!.find( it => it.id == op.operationId )
        this.assertNotNull(opRecord)
        this.assertEquals(opRecord?.status, "PENDING")
        this.assertEquals(opRecord?.id, op.operationId, "Different operationId than the one retrieved from the server")
    }

    async testQROperation() {
        // create regular operation
        const op = await this.utils.createOperation()

        // get QR data of the operation
        const qrData = await this.utils.getQROperation(op.operationId)

        // parse the data
        const qrOperation = WMTQROperationParser.parse(qrData.operationQrCodeData)

        // verify the data
        const keyId = qrOperation.signature.signingKey === WMTSigningKey.MAC_PERSONALIZED
            ? PowerAuthSignatureKeyId.MAC_PERSONALIZED
            : qrOperation.signature.signingKey === WMTSigningKey.MASTER
                ? PowerAuthSignatureKeyId.MASTER_EC : PowerAuthSignatureKeyId.SERVER_EC
        await this.powerAuth.verifyDigitalSignature(
            qrOperation.signature.signatureString,
            Buffer.from(qrOperation.signedData, 'utf8').toString('base64'),
            keyId
        )

        // get the OTP with the "offline" signing
        const auth = PowerAuthAuthentication.password(this.pin)
        const otp = await this.mtoken.operations.authorizeOffline(qrOperation, auth)

        // verify the operation on the backend with the OTP
        const verifiedResult = await this.utils.verifyQROperation(op, qrData, otp)

        this.assertTrue(verifiedResult.otpValid, "OTP is not valid")
    }

    async testDetail() {
        const op = await this.utils.createNonPersonalizedPACOperation()
        const operation = await this.mtoken.operations.getDetail(op.operationId)
        this.assertNotNull(operation, "Failed to create & get the operation")
        this.assertEquals(op.operationId, operation.responseObject!!.id, "Operations ids are not equal")
    }

    async testClaim() {
        const op = await this.utils.createNonPersonalizedPACOperation()
        
        const resp = await this.mtoken.operations.claim(op.operationId)
        const operation = resp.responseObject!!
        this.assertNotNull(operation, "Failed to claim the operation")
        this.assertEquals(operation.ui!!.preApprovalScreens!![0].type, "QR_SCAN")

        const totp = (await this.utils.getOperation(op.operationId)).proximityOtp
        this.assertNotNull(totp, "Even with proximityCheckEnabled: true, in proximityOtp nil")

        operation.proximityCheck = new WMTUserOperationProximityCheck(totp!!, "QR_CODE")

        var wrongAuth = PowerAuthAuthentication.password("xxxx") // wrong password on purpose
        const wrongResp = await this.mtoken.operations.authorize(operation, wrongAuth)
        this.assertNull(wrongResp.responseObject, "Response object should bu null")
        this.assertNotNull(wrongResp.responseError, "Response error should not be null")

        const auth = PowerAuthAuthentication.password(this.pin)
        const okResp = await this.mtoken.operations.authorize(operation, auth)
        this.assertNull(okResp.responseError, "Response error should be null")
        this.assertEquals(okResp.status, "OK")
    }

    async testProximityAuthorizeSynchronizesTimeWhenNotSynchronized() {
        const op = await this.utils.createNonPersonalizedPACOperation()

        // claim the operation and get its TOTP
        const operation = (await this.mtoken.operations.claim(op.operationId)).responseObject!!
        const totp = (await this.utils.getOperation(op.operationId)).proximityOtp
        this.assertNotNull(totp, "Even with proximityCheckEnabled: true, in proximityOtp nil")

        operation.proximityCheck = new WMTUserOperationProximityCheck(totp!!, "QR_CODE")

        // reset the time synchronization right before authorizing
        await this.powerAuth.timeSynchronizationService.resetTimeSynchronization()
        this.assertFalse(await this.powerAuth.timeSynchronizationService.isTimeSynchronized(), "Time should not be synchronized after reset")

        // the SDK must synchronize the time automatically during authorize
        const auth = PowerAuthAuthentication.password(this.pin)
        const resp = await this.mtoken.operations.authorize(operation, auth)
        this.assertNull(resp.responseError, "Response error should be null")
        this.assertEquals(resp.status, "OK")

        // time must be synchronized after the authorization
        this.assertTrue(await this.powerAuth.timeSynchronizationService.isTimeSynchronized(), "Time should be synchronized after authorize")

        // verify the operation was approved on the server
        this.assertEquals((await this.utils.getOperation(op.operationId)).status, "APPROVED", "Operation should be approved on the server")
    }

    async testProximityAuthorizeWithAlreadySynchronizedTime() {
        const op = await this.utils.createNonPersonalizedPACOperation()

        // claim the operation and get its TOTP
        const operation = (await this.mtoken.operations.claim(op.operationId)).responseObject!!
        const totp = (await this.utils.getOperation(op.operationId)).proximityOtp
        this.assertNotNull(totp, "Even with proximityCheckEnabled: true, in proximityOtp nil")

        operation.proximityCheck = new WMTUserOperationProximityCheck(totp!!, "QR_CODE")

        // synchronize the time upfront
        await this.powerAuth.timeSynchronizationService.synchronizeTime()
        this.assertTrue(await this.powerAuth.timeSynchronizationService.isTimeSynchronized(), "Time should be synchronized")

        const auth = PowerAuthAuthentication.password(this.pin)
        const resp = await this.mtoken.operations.authorize(operation, auth)
        this.assertNull(resp.responseError, "Response error should be null")
        this.assertEquals(resp.status, "OK")

        // verify the operation was approved on the server
        this.assertEquals((await this.utils.getOperation(op.operationId)).status, "APPROVED", "Operation should be approved on the server")
    }

    async testProximityAuthorizeThrowsWhenReceivedInFuture() {
        const op = await this.utils.createNonPersonalizedPACOperation()

        // claim the operation and get its TOTP
        const operation = (await this.mtoken.operations.claim(op.operationId)).responseObject!!
        const totp = (await this.utils.getOperation(op.operationId)).proximityOtp
        this.assertNotNull(totp, "Even with proximityCheckEnabled: true, in proximityOtp nil")

        // simulate the device clock being far ahead: the received timestamp ends up
        // in the future relative to the server time, which the SDK must reject.
        // The public API intentionally prevents setting `timestampReceived`, so this test
        // reaches into the private field to reproduce a clock-change-after-received scenario.
        const proximityCheck = new WMTUserOperationProximityCheck(totp!!, "QR_CODE")
        ;(proximityCheck as any)._timestampReceived = new Date(Date.now() + 60 * 60 * 1000)
        operation.proximityCheck = proximityCheck

        const auth = PowerAuthAuthentication.password(this.pin)
        let thrown: any = undefined
        try {
            await this.mtoken.operations.authorize(operation, auth)
        } catch (e) {
            thrown = e
        }
        this.assertNotNull(thrown, "authorize should throw when the adjusted timestampReceived is in the future")
        this.assertTrue(thrown instanceof WMTException, "Thrown error should be a WMTException")

        // the SDK should reject before reaching the server, so the operation stays pending
        this.assertEquals((await this.utils.getOperation(op.operationId)).status, "PENDING", "Operation should remain pending on the server")
    }

    async testOperationCanceledWithReason() {
        // create regular operation
        const op = await this.utils.createOperation()
        const cancelReason = "PREARRANGED_REASON"
        // cancel the operation
        await this.utils.cancelOperation(op.operationId, cancelReason)

        const operations = (await this.mtoken.operations.getHistory(PowerAuthAuthentication.password(this.pin))).responseObject
        this.assertNotNull(operations, "Operations not retrieved")
        const opRecord = operations!!.find( it => it.id == op.operationId)
        this.assertNotNull(opRecord)
        this.assertEquals(opRecord!!.statusReason, cancelReason, 'Cancellation reason should match')
    }

    async testTestUserAgents() {

        let tempMtoken: WultraMobileToken
        const expectedDefaultUserAgentProductName = "PowerAuthNetworkingJS"
        const testUserAgent = "test-agent"
        const envInfo = await PowerAuthUtils.getEnvironmentInfo();

        let headers: Headers
        const capture: WPNRequestInterceptor = request => {
            headers = request.headers as Headers
            return request
        }

        // Test default behavior (libraryDefault)

        tempMtoken = this.powerAuth.createWultraMobileToken(undefined, undefined, [capture])
        await tempMtoken.operations.getOperations()

        const userAgent = headers!!.get("user-agent")!!
        this.assertTrue(userAgent.startsWith(expectedDefaultUserAgentProductName), 'user-agent should start with the default product name')
        this.assertTrue(userAgent.includes(envInfo.systemVersion), 'user-agent should contain systemVersion')
        this.assertTrue(userAgent.includes(envInfo.systemName), 'user-agent should contain systemName')
        this.assertTrue(userAgent.includes(envInfo.deviceId), 'user-agent should contain deviceId')
        this.assertTrue(userAgent.includes(envInfo.deviceManufacturer), 'user-agent should contain deviceManufacturer')
        this.assertTrue(userAgent.includes(envInfo.applicationIdentifier || "MISSING"), 'user-agent should contain applicationIdentifier')
        this.assertTrue(userAgent.includes(envInfo.applicationVersion || "MISSING"), 'user-agent should contain applicationVersion')

        // Test custom user agent

        tempMtoken = this.powerAuth.createWultraMobileToken(undefined, testUserAgent, [capture])
        await tempMtoken.inbox.getUnreadCount()
        this.assertEquals(headers!!.get("user-agent"), testUserAgent)

        // Test system default (should be undefined in the request)

        tempMtoken = this.powerAuth.createWultraMobileToken(undefined, WPNUserAgent.SYSTEM_DEFAULT, [capture])
        await tempMtoken.operations.getOperations()
        this.assertEquals(headers!!.get("user-agent"), undefined)
    }

    async testUserAgentOnNetworkingClient() {

        const expectedDefaultUserAgentProductName = "PowerAuthNetworkingJS"
        let headers: Headers
        const capture: WPNRequestInterceptor = request => {
            headers = request.headers as Headers
            return request
        }

        // Custom user agent is available on the networking client right after construction
        let tempMtoken = this.powerAuth.createWultraMobileToken(undefined, "construct-agent")
        this.assertEquals(tempMtoken.operations.networking.userAgent, "construct-agent", "custom user-agent should be set in the constructor")

        // Library default is applied to the networking client and matches the sent header
        tempMtoken = this.powerAuth.createWultraMobileToken(undefined, undefined, [capture])
        await tempMtoken.operations.getOperations()
        const defaultUserAgent = headers!!.get("user-agent")!!
        this.assertTrue(defaultUserAgent.startsWith(expectedDefaultUserAgentProductName), 'user-agent should start with the default product name')
        this.assertEquals(tempMtoken.operations.networking.userAgent, WPNUserAgent.LIBRARY_DEFAULT, "library default should be resolved by the networking client")

        // Value set by the app on the networking client is kept by SDK calls
        tempMtoken.operations.networking.userAgent = "app-agent"
        const resp = await tempMtoken.operations.getOperations()
        this.assertEquals(resp.status, "OK", "request with app user-agent should succeed")
        this.assertEquals(headers!!.get("user-agent"), "app-agent", "app user-agent should be sent")
        this.assertEquals(tempMtoken.operations.networking.userAgent, "app-agent", "app user-agent should not be overwritten")

        // Other services are not affected
        await tempMtoken.inbox.getUnreadCount()
        this.assertEquals(headers!!.get("user-agent"), defaultUserAgent, "other services should keep the default user-agent")

        // Value set by the app before the library default is resolved is kept
        tempMtoken = this.powerAuth.createWultraMobileToken(undefined, undefined, [capture])
        tempMtoken.inbox.networking.userAgent = "early-agent"
        await tempMtoken.inbox.getUnreadCount()
        this.assertEquals(headers!!.get("user-agent"), "early-agent", "early app user-agent should be sent")
    }

    async testAcceptLanguage() {

        const en = "en"
        const cs = "cs"

        let headers: Headers
        const mtoken = this.powerAuth.createWultraMobileToken(undefined, undefined, [request => {
            headers = request.headers as Headers
            return request
        }])

        // set eng lang
        mtoken.setAcceptLanguage(en)
        await mtoken.operations.getOperations()
        this.assertEquals(headers!!.get("accept-language")!!, en)

        // set czech lang
        mtoken.setAcceptLanguage(cs)
        await mtoken.inbox.getUnreadCount()
        this.assertEquals(headers!!.get("accept-language"), cs)
    }

    async testRequestInterceptors() {

        const calls: string[] = []
        const urls: string[] = []
        const correlationId = "mtoken-sdk-js-test"

        // The first interceptor adds a header, the second one must receive the request returned by the first one
        const addHeader: WPNRequestInterceptor = request => {
            calls.push("addHeader")
            const headers = new Headers(request.headers)
            headers.set("X-Correlation-ID", correlationId)
            return { ...request, headers }
        }
        const record: WPNRequestInterceptor = request => {
            calls.push("record")
            this.assertEquals(new Headers(request.headers).get("X-Correlation-ID"), correlationId, "interceptors should run in declaration order")
            urls.push(request.url)
            return request
        }
        const mtoken = this.powerAuth.createWultraMobileToken(undefined, undefined, [addHeader, record])

        // Every service sends its requests through the interceptors
        this.assertEquals((await mtoken.operations.getOperations()).status, "OK", "operations request with an intercepted header should succeed")
        this.assertEquals((await mtoken.inbox.getUnreadCount()).status, "OK", "inbox request with an intercepted header should succeed")
        await mtoken.push.register(WMTPushData.fcm("your_fcm_token"))
        await mtoken.oidc.getConfig("xxx")

        const expectedPaths = ["/api/auth/token/app/operation/list", "/api/inbox/count", "/api/push/device/register/token", "/api/config/oidc"]
        this.assertEquals(urls.length, expectedPaths.length, 'Each service request should be intercepted once')
        expectedPaths.forEach((path, index) => this.assertTrue(urls[index].endsWith(path), 'Intercepted request path should match the endpoint'))
        this.assertEquals(calls.join(","), "addHeader,record,addHeader,record,addHeader,record,addHeader,record", "both interceptors should run for each request")

        // Interceptors are not shared with other instances
        await this.mtoken.operations.getOperations()
        this.assertEquals(urls.length, expectedPaths.length, "interceptors should not be applied to other Mobile Token instances")
    }

    // -- PUSH TESTS --

    async testRegisterPushLegacy() {

        const token = "your_fcm_token"
        const payload = await this.registerPush(WMTPushData.fcm(token, true))

        this.assertEquals(payload.token, token, "Token in request body should match the provided token")
        this.assertEquals(payload.platform, "android", "Platform in request body should be 'android'")
        this.assertEquals(payload.environment, undefined, "Environment in request body should be undefined")
    }

    async testRegisterPushApnsLegacy() {
        const token = "your_apns_token"
        const payload = await this.registerPush(WMTPushData.apns(token, WMTAPNSEnvironment.production, true))

        this.assertEquals(payload.token, token, "Token in request body should match the provided token")
        this.assertEquals(payload.platform, "ios", "Platform in request body should be 'apns'")
        this.assertEquals(payload.environment, undefined, "Environment in request body should be undefined")
    }

    async testRegisterPushApns() {
        const token = "your_apns_token"
        const payload = await this.registerPush(WMTPushData.apns(token, undefined))

        this.assertEquals(payload.token, token, "Token in request body should match the provided token")
        this.assertEquals(payload.platform, "apns", "Platform in request body should be 'apns'")
        this.assertEquals(payload.environment, undefined, "Environment in request body should be undefined")
    }

    async testRegisterPushApnsProduction() {
        const token = "your_apns_token"
        const payload = await this.registerPush(WMTPushData.apns(token, WMTAPNSEnvironment.production))

        this.assertEquals(payload.token, token, "Token in request body should match the provided token")
        this.assertEquals(payload.platform, "apns", "Platform in request body should be 'apns'")
        this.assertEquals(payload.environment, "production", "Environment in request body should be 'production'")
    }

    async testRegisterPushApnsDevelopment() {
        const token = "your_apns_token"
        const payload = await this.registerPush(WMTPushData.apns(token, WMTAPNSEnvironment.development))

        this.assertEquals(payload.token, token, "Token in request body should match the provided token")
        this.assertEquals(payload.platform, "apns", "Platform in request body should be 'apns'")
        this.assertEquals(payload.environment, "development", "Environment in request body should be 'development'")
    }

    async testRegisterPushFcm() {
        const token = "your_fcm_token"
        const payload = await this.registerPush(WMTPushData.fcm(token))

        this.assertEquals(payload.token, token, "Token in request body should match the provided token")
        this.assertEquals(payload.platform, "fcm", "Platform in request body should be 'fcm'")
        this.assertEquals(payload.environment, undefined, "Environment in request body should be undefined")
    }

    /** Registers the push data and returns the request object sent to the server. */
    private async registerPush(data: WMTPushData): Promise<any> {
        let payload: any
        const mtoken = this.powerAuth.createWultraMobileToken(undefined, undefined, [request => {
            payload = JSON.parse(request.body as string).requestObject
            return request
        }])
        await mtoken.push.register(data)
        return payload
    }
}
