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
// See the License for the specific language governing permissions
// and limitations under the License.
//

import { PowerAuth } from 'react-native-powerauth-mobile-sdk'
import { WPNNetworking, WPNUserAgent, WPNResponse } from 'react-native-powerauth-networking'
import { WMTException } from '../WMTException'
import { WMTLogger } from '../WMTLogger'

/** Shared setup and response validation for Mobile Token services. */
export abstract class WMTService {

    /** Networking client used by this service. */
    public readonly networking: WPNNetworking

    /**
     * @param pa PowerAuth instance.
     * @param baseURL Optional base URL of the server. When omitted, it is resolved from the PowerAuth configuration.
     * @param userAgent User-Agent for this service's requests. Defaults to `WPNUserAgent.LIBRARY_DEFAULT`.
     */
    constructor(protected readonly pa: PowerAuth, baseURL?: string, userAgent: WPNUserAgent | string = WPNUserAgent.LIBRARY_DEFAULT) {
        this.networking = new WPNNetworking(pa, baseURL, "en", userAgent)
    }

    /** Language used for this service's requests. Defaults to "en". */
    get acceptLanguage(): string { return this.networking.acceptLanguage }
    set acceptLanguage(language: string) {
        this.networking.acceptLanguage = language
        WMTLogger.info(`Accept language set to ${language}.`)
    }

    /** Checks the response requirements of a Mobile Token endpoint. */
    protected validateResponse(response: WPNResponse<unknown>, dataExpected: boolean): void {
        if (response.status === "ERROR" && response.responseError == null) {
            throw new WMTException("Error retrieved but no error data")
        }
        if (response.status === "OK" && dataExpected && response.responseObject == null) {
            throw new WMTException("No data object retrieved.")
        }
    }
}
