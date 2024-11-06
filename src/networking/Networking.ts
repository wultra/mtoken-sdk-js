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

import { KnownRestApiError } from "./KnownRestApiError"
import { MobileTokenException } from "../MobileTokenException"
import { PowerAuth, PowerAuthAuthentication } from 'react-native-powerauth-mobile-sdk'
import { MobileTokenLogger, MobileTokenLoggerVerbosity } from "../MobileTokenLogger"
import { PlatformUtils } from "../PlatformUtils"

export type RequestProcessor = (request: RequestInit) => RequestInit

/** @internal */
export class Networking {

    /** @internal */
    acceptLanguage = "en"
    /** @internal */
    userAgent: UserAgent | string = UserAgent.LIBRARY_DEFAULT

    protected pa: PowerAuth
    private baseURL: string

    constructor(powerAuth: PowerAuth, baseURL: string) {
        this.pa = powerAuth
        if (baseURL.endsWith("/")) {
            this.baseURL = baseURL.substring(0, baseURL.length - 1)
        } else {
            this.baseURL = baseURL
        }
    }

    protected async postSigned<T>(
        requestData: any,
        auth: PowerAuthAuthentication,
        endpoindPath: string,
        uriId: string,
        returnDataExpected: boolean,
        requestProcessor?: RequestProcessor,
        jsonConfig?: JsonConfig
    ): Promise<MobileTokenResponse<T>> {

        let body = JSON.stringify(requestData)
        let paHeader = await this.pa.requestSignature(auth, "POST", uriId, body)
        let headers = new Headers()
        headers.set(paHeader.key, paHeader.value)
        return await this.post(body, endpoindPath, returnDataExpected, headers, requestProcessor, jsonConfig)
    }

    protected async postSignedWithToken<T>(
        requestData: any,
        auth: PowerAuthAuthentication,
        endpoindPath: string,
        tokenName: string,
        returnDataExpected: boolean,
        requestProcessor?: RequestProcessor,
        jsonConfig?: JsonConfig,
    ): Promise<MobileTokenResponse<T>> {

        let body = JSON.stringify(requestData)
        let token = await this.pa.tokenStore.requestAccessToken(tokenName, auth)
        let paHeader = await this.pa.tokenStore.generateHeaderForToken(token.tokenName)

        let headers = new Headers()
        headers.set(paHeader.key, paHeader.value)

        return await this.post(body, endpoindPath, returnDataExpected, headers, requestProcessor, jsonConfig)
    }

    protected async post<T>(
        requestSerialized: string,
        endpoindPath: string,
        returnDataExpected: boolean,
        headers: Headers,
        requestProcessor?: RequestProcessor,
        jsonConfig?: JsonConfig,
    ): Promise<MobileTokenResponse<T>> {

        let method = "POST"
        let url = this.baseURL + endpoindPath

        let jsonType = "application/json"
        headers.set("Accept", jsonType)
        headers.set("Content-Type", jsonType)
        headers.set("Accept-Language", this.acceptLanguage)

        if (this.userAgent == UserAgent.LIBRARY_DEFAULT) {
            headers.set("User-Agent", PlatformUtils.getDefaultUserAgent())
        } else if (this.userAgent == UserAgent.SYSTEM_DEFAULT) {
            // leave empty to default to system value
        } else {
            headers.set("User-Agent", this.userAgent)
        }

        let request: RequestInit = {
            method: method,
            headers: headers,
            body: requestSerialized
        }

        if (requestProcessor) {
            request = requestProcessor(request)
        }

        MobileTokenLogger.info(` -> POST ${url}`)
        if (MobileTokenLogger.verbosity >= MobileTokenLoggerVerbosity.VERBOSE) {
            MobileTokenLogger.verbose(this.getHeadersString(headers))
            MobileTokenLogger.verbose(requestSerialized)
        }

        let result = await fetch(url, request)
        let responseBody = await result.text()

        MobileTokenLogger.info(` <- POST ${url} - ${result.status}`)

        if (MobileTokenLogger.verbosity >= MobileTokenLoggerVerbosity.VERBOSE) {
            MobileTokenLogger.verbose(this.getHeadersString(result.headers))
            MobileTokenLogger.verbose(responseBody)
        }

        let response = JSON.parse(responseBody, (key: string, value: any) => {

            if (jsonConfig?.dateFields?.includes(key)) {
                return new Date(value)
            }
            return value
        }) as MobileTokenResponse<T>

        if (response.status == "ERROR") {
            if (response.responseObject == undefined) {
                throw new MobileTokenException("Error retrieved but no error data", { ...result })
            }
            response.responseError = response.responseObject as any
            response.responseObject = undefined
        }

        if (response.status == "OK" && returnDataExpected && response.responseObject == undefined) {
            throw new MobileTokenException("No data object retieved.", { ...result })
        }

        return response
    }

    protected getHeadersString(headers: Headers): string {
        let result = "Headers: {"
        headers.forEach( (v: string, k: string) => {
            result += ` "${k}:" "${v}",`
        })
        return result + "}"
    }
}

/** Automatic values that will be used for User-Agent HTTP header. */
export enum UserAgent {
    /** 
     * Default value provided by the libary. 
     * 
     * Example value: `TODO`
     */
    LIBRARY_DEFAULT = "LIBRARY_DEFAULT",

    /** 
     * System default.
     */
    SYSTEM_DEFAULT = "SYSTEM_DEFAULT"
}

export interface JsonConfig {
    dateFields?: string[]
}

/** Response from the API. */
export interface MobileTokenResponse<T> {
    status: "OK" | "ERROR"
    responseError?: MobileTokenResponseError
    responseObject?: T
} 
  
  /** Error object when error on the server happens. */
export interface MobileTokenResponseError {
    code: KnownRestApiError | string
    message: string
}
