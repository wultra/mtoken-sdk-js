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

import { PowerAuth } from 'react-native-powerauth-mobile-sdk'
import { WPNNetworking, WPNUserAgent } from 'react-native-powerauth-networking'
import { WMTException } from '../WMTException'
import { WMTPlatformUtils } from '../WMTPlatformUtils'
import { WMTLogger } from '../WMTLogger'
import { WMTUserAgent, WMTResponse } from './WMTNetworkingTypes'

/** Shared setup and response validation for Mobile Token services. */
export abstract class WMTService {

    private readonly networking: WPNNetworking
    private defaultUserAgent?: Promise<string>

    /** @internal */
    userAgent: WMTUserAgent | string = WMTUserAgent.LIBRARY_DEFAULT

    constructor(protected readonly pa: PowerAuth, baseURL: string) {
        this.networking = new WPNNetworking(pa, baseURL, "en", WPNUserAgent.SYSTEM_DEFAULT)
    }

    /** Language used for this service's requests. Defaults to "en". */
    get acceptLanguage(): string { return this.networking.acceptLanguage }
    set acceptLanguage(language: string) {
        this.networking.acceptLanguage = language
        WMTLogger.info(`Accept language set to ${language}.`)
    }

    /** Resolves the native User-Agent lazily, keeping SDK construction synchronous. */
    protected async getNetworking(): Promise<import('react-native-powerauth-networking').WPNNetworking> {
        const userAgent = this.userAgent
        this.networking.userAgent = userAgent === WMTUserAgent.LIBRARY_DEFAULT
            ? await (this.defaultUserAgent ??= WMTPlatformUtils.getDefaultUserAgent())
            : userAgent
        return this.networking
    }

    /** Checks the response requirements of a Mobile Token endpoint. */
    protected validateResponse(response: WMTResponse<unknown>, dataExpected: boolean): void {
        if (response.status === "ERROR" && response.responseError == null) {
            throw new WMTException("Error retrieved but no error data")
        }
        if (response.status === "OK" && dataExpected && response.responseObject == null) {
            throw new WMTException("No data object retrieved.")
        }
    }
}
