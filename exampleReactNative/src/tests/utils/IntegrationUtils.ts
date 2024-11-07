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

import { PowerAuth, PowerAuthActivation, PowerAuthAuthentication, PowerAuthConfiguration } from "react-native-powerauth-mobile-sdk"
import { MobileToken } from "react-native-mtoken-sdk"
import { IntegrationCredentials } from "./IntegrationCredentials"

export class IntegrationUtils {
    
    private jsonMediaType = "application/json; charset=UTF-8"

    private cloudServerUrl = ""
    private cloudServerLogin = ""
    private cloudServerPassword = ""
    private cloudApplicationId = ""
    private enrollmentUrl = ""
    private appKey = ""
    private appSecret = ""
    private serverMasterKey = ""
    private activationName = "" // will be filled when activation is created
    private registrationId = "" // will be filled when activation is created

    async loadCredentials() {

        const credentials = await IntegrationCredentials.loadCredentials()
        this.cloudServerUrl = credentials.cloudServerUrl
        this.cloudServerLogin = credentials.cloudServerLogin
        this.cloudServerPassword = credentials.cloudServerPassword
        this.cloudApplicationId = credentials.cloudApplicationId
        this.enrollmentUrl = credentials.enrollmentUrl
        this.appKey = credentials.appKey
        this.appSecret = credentials.appSecret
        this.serverMasterKey = credentials.serverMasterKey
    }

    async prepareActivation(pin: string, userId: string | null = null): Promise<{ powerauth: PowerAuth, mtoken: MobileToken }> {

        // Be sure that each activation has its own user
        this.activationName = userId ?? (Math.random() + 1).toString(36)

        // CREATE PA INSTANCE

        const cfg = new PowerAuthConfiguration(this.appKey, this.appSecret, this.serverMasterKey, this.enrollmentUrl)
        const pa = new PowerAuth(this.activationName)
        await pa.configure(cfg)

        // REMOVE LOCAL INSTANCE IF PRESENT

        pa.removeActivationLocal()

        // CREATE ACTIVATION ON THE SERVER

        const body = `
            {
              "userId": "${this.activationName}",
              "flags": [],
              "appId": "${this.cloudApplicationId}"
            }
            `
        const resp: RegistrationObject = await this.makeCall(body, `${this.cloudServerUrl}/v2/registrations`)

        this.registrationId = resp.registrationId

        // CREATE ACTIVATION LOCALLY

        await pa.createActivation(PowerAuthActivation.createWithActivationCode(resp.activationCode, "tests"))

        // COMMIT ACTIVATION LOCALLY

        let result = await pa.commitActivation(PowerAuthAuthentication.commitWithPassword(pin))

        // COMMIT ACTIVATION ON THE SERVER

        await this.makeCall(`{ "externalUserId": "test" }`, `${this.cloudServerUrl}/v2/registrations/${resp.registrationId}/commit`)

        return {
            powerauth: pa,
            mtoken: new MobileToken(pa, this.enrollmentUrl)
        }
    }

    async removeRegistration(activationId: string | null = null) {
        const id = activationId ?? this.registrationId
        if (id.length > 0) {
            this.makeCall("", `${this.cloudServerUrl}/v2/registrations/${id}`, "DELETE")
        }
    }

    async createOperation(): Promise<OperationObject> {
        const opBody = `
            {
              "userId": "${this.activationName}",
              "template": "login",
               "parameters": {
                 "party.id": "666",
                 "party.name": "Datová schránka",
                     "session.id": "123",
                     "session.ip-address": "192.168.0.1"
               }
            }
            `

        // create an operation on the nextstep server
        return await this.makeCall(opBody, `${this.cloudServerUrl}/v2/operations`)
    }

    async cancelOperation(operationId: string, reason: string): Promise<any> {
        return await this.makeCall("", `${this.cloudServerUrl}/v2/operations/${operationId}?statusReason=${reason}`, "DELETE")
    }

    async createNonPersonalizedPACOperation(): Promise<OperationObject> {
        const opBody = `
            {
              "template": "login_preApproval",
              "proximityCheckEnabled": true,
               "parameters": {
                 "party.id": "666",
                 "party.name": "Datová schránka",
                     "session.id": "123",
                     "session.ip-address": "192.168.0.1"
               }
            }
            `
        // create an operation on the nextstep server
        return await this.makeCall(opBody, `${this.cloudServerUrl}/v2/operations`)
    }

    async getOperation(operationId: string): Promise<OperationObject> {
        return await this.makeCall(undefined, `${this.cloudServerUrl}/v2/operations/${operationId}`, "GET")
    }

    async getQROperation(operationId: string): Promise<QRData> {
        return await this.makeCall(undefined, `${this.cloudServerUrl}/v2/operations/${operationId}/offline/qr?registrationId=${this.registrationId}`, "GET")
    }

    async verifyQROperation(operation: OperationObject, qrData: QRData, otp: String): Promise<QROperationVerify> {
        const body = `
            {
              "otp": "${otp}",
              "nonce": "${qrData.nonce}",
              "registrationId": "${this.registrationId}"
            }
        `
        return this.makeCall(body, `${this.cloudServerUrl}/v2/operations/${operation.operationId}/offline/otp`)
    }

    async createInboxMessages(count: number, type: string = "text"): Promise<NewInboxMessage[]> {
        const result: NewInboxMessage[] = []
        for (let i = 0; i < count; i++) {
            const body = `
                {
                    "userId":"${this.activationName}",
                    "subject":"Message #${i}",
                    "summary":"This is body for message ${i}",
                    "body":"This is body for message ${i}",
                    "type":"${type}",
                    "silent":true
                }
            `
            const newMessage = await this.makeCall(body, `${this.cloudServerUrl}/v2/inbox/messages`)
            result.push(newMessage)
        }
        return result
    }

    private async makeCall(payload: string | undefined, url: string, method: string = "POST"): Promise<any> {
        const creds = `${this.cloudServerLogin}:${this.cloudServerPassword}`
        const request: RequestInit = {
            body: payload,
            headers: {
                "authorization": `Basic ${btoa(creds)}`,
                "content-type": this.jsonMediaType
            },
            method: method
        }
        return await fetch(url, request)
            .then(response => response.text())
            .then(stringResp => {
                return JSON.parse(stringResp)
            })
    }
}

interface RegistrationObject {
    activationCode: string
    activationCodeSignature: string
    activationQrCodeData: string
    registrationId: string
}

interface OperationObject {
    operationId: string
    userId: string
    status: string
    operationType: string
    // val parameters: [] // not needed for test right now
    failureCount: number
    maxFailureCount: number
    timestampCreated: number
    timestampExpires: number
    proximityOtp: string | undefined
}

interface QRData {
    operationQrCodeData: string,
    nonce: string
}

interface QROperationVerify {
    otpValid: boolean
    userId: string
    registrationId: string
    registrationStatus: string
    signatureType: string
    remainingAttempts: number
    // flags: []
    // application
}

export interface NewInboxMessage {
    id: string
    subject: string
    summary: string
    body: string
    read: boolean
    type: string
    timestamp: number
}