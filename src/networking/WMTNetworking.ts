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

import { WMTKnownRestApiError } from "./WMTKnownRestApiError"
import { WMTException } from "../WMTException"
import { PowerAuth, PowerAuthAuthentication } from 'react-native-powerauth-mobile-sdk'
import { WMTLogger, WMTLoggerVerbosity } from "../WMTLogger"
import { WMTPlatformUtils } from "../WMTPlatformUtils"

export type WMTRequestProcessor = (request: RequestInit) => RequestInit

/** @internal */
export class WMTNetworking {

    private _acceptLanguage = "en"

    /**
     * Returns accept language for the outgoing requests headers for `operations`, `push` and `inbox` objects.
     *
     */
    get acceptLanguage() {
        return this._acceptLanguage
    }

    /**
     * Sets accept language for the outgoing requests headers for `operations`, `push` and `inbox` objects.
     *
     * Default value is "en".
     *
     *
     * Standard RFC "Accept-Language" https://tools.ietf.org/html/rfc7231#section-5.3.5
     * Response texts are based on this setting. For example when "de" is set, server
     * will return operation texts in german (if available).
     */
    set acceptLanguage(lang: string) {
        this._acceptLanguage = lang
        WMTLogger.info(`Accept language set to ${lang}.`)
    }

    /** @internal */
    userAgent: WMTUserAgent | string = WMTUserAgent.LIBRARY_DEFAULT

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
        requestProcessor?: WMTRequestProcessor,
        jsonConfig?: WMTJsonConfig
    ): Promise<WMTResponse<T>> {

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
        requestProcessor?: WMTRequestProcessor,
        jsonConfig?: WMTJsonConfig,
    ): Promise<WMTResponse<T>> {

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
        requestProcessor?: WMTRequestProcessor,
        jsonConfig?: WMTJsonConfig,
    ): Promise<WMTResponse<T>> {

        let method = "POST"
        let url = this.baseURL + endpoindPath

        let jsonType = "application/json"
        headers.set("Accept", jsonType)
        headers.set("Content-Type", jsonType)
        headers.set("Accept-Language", this.acceptLanguage)

        if (this.userAgent == WMTUserAgent.LIBRARY_DEFAULT) {
            headers.set("User-Agent", WMTPlatformUtils.getDefaultUserAgent())
        } else if (this.userAgent == WMTUserAgent.SYSTEM_DEFAULT) {
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

        WMTLogger.info(` -> POST ${url}`)
        if (WMTLogger.verbosity >= WMTLoggerVerbosity.VERBOSE) {
            WMTLogger.verbose(this.getHeadersString(headers))
            WMTLogger.verbose(requestSerialized)
        }

        let result = await fetch(url, request)
        let responseBody = await result.text()

        WMTLogger.info(` <- POST ${url} - ${result.status}`)

        if (WMTLogger.verbosity >= WMTLoggerVerbosity.VERBOSE) {
            WMTLogger.verbose(this.getHeadersString(result.headers))
            WMTLogger.verbose(responseBody)
        }

        let response = JSON.parse(responseBody, (key: string, value: any) => {

            if (jsonConfig?.dateFields?.includes(key)) {
                return new Date(value)
            }
            return value
        }) as WMTResponse<T>

        if (response.status == "ERROR") {
            if (response.responseObject == undefined) {
                throw new WMTException("Error retrieved but no error data", { ...result })
            }
            response.responseError = response.responseObject as any
            response.responseObject = undefined
        }

        if (response.status == "OK" && returnDataExpected && response.responseObject == undefined) {
            throw new WMTException("No data object retieved.", { ...result })
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
export enum WMTUserAgent {
    /** 
     * Default value provided by the libary. 
     * 
     * Example value (on an Apple device):
     * `MobileTokenJS/1.0.0 com.yourcompany.yourappid/1.0.0 (Apple; iOS/18.2; iPhone16)`.
     */
    LIBRARY_DEFAULT = "LIBRARY_DEFAULT",

    /** 
     * System default.
     */
    SYSTEM_DEFAULT = "SYSTEM_DEFAULT"
}

/* @internal */
export interface WMTJsonConfig {
    dateFields?: string[]
}

/** Response from the API. */
export interface WMTResponse<T> {
    status: "OK" | "ERROR"
    responseError?: WMTResponseError
    responseObject?: T
} 
  
/** Error object when error on the server happens. */
export interface WMTResponseError {
    code: WMTKnownRestApiError | string
    message: string
}
