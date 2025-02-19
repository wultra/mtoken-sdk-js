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

import { WMTLogger } from "../WMTLogger"

/** Data payload which is returned from the parser. */
export interface WMTPACData {

    /** The ID of the operation associated with the TOTP. */
    oid: string

    /** The actual Time-based one time password (proximity OTP). */
    potp?: string
}

/**
 * Utility class used for handling Proximity Anti-fraud Checks.
 */
export class WMTPACUtils {

    /** 
     * Method accepts deeplink URL and returns payload data or throws and exception.
     * 
     * @param url Deeplink URL
     * @returns Data with parsed Proximity Antofraud Check data
     * @throws Exception when parsing failed
     */
    static parseDeeplink(url: string): WMTPACData {

        WMTLogger.info(`Parsing deeplink: ${url}`)

        // Deeplink can have two query items with operationId & optional totp or single query item with JWT value

        const urlParams = this.getURLParams(url)

        if (urlParams.oid) {

            let totp = urlParams.totp ?? urlParams.potp

            if (!!!totp) {
                WMTLogger.info(`TOTP not found in URL: ${url}`)
            }

            return {
                oid: decodeURIComponent(urlParams.oid),
                potp: totp ? `${decodeURIComponent(totp)}` : undefined
            }
        }

        const first = Object.getOwnPropertyNames(urlParams)[0]

        if (first) {
            return this.parseJWT(urlParams[first])
        }

        throw WMTLogger.errorAndException(`Failed to parse deeplink. Valid keys not found in URL: ${url}`)
    }

    /** 
     * Method accepts scanned code as a String and returns PAC data or throws an exception.
     * 
     * @param code Code retrieved from the QR.
     * @returns Data with parsed Proximity Antofraud Check data.
     * @throws Exception when cannot be parsed.
     */
    static parseQRCode(code: string): WMTPACData {
        
        try {
            const uri = new URL(code)
            return this.parseDeeplink(code)
        } catch(e) {
            WMTLogger.info(`Parsing JWT: ${code}`)
            return this.parseJWT(code)
        }
    }

    private static parseJWT(code: string): WMTPACData {
        const jwtParts = code.split(".")
        if (jwtParts.length > 1) {
            // At this moment we don't care about header, we want only payload which is the second part of JWT
            const jwtBase64String = jwtParts[1]
            if (jwtBase64String.length != 0) {
                try {
                    const decoded = atob(jwtBase64String)
                    const json = JSON.parse(decoded)
                    if (json.oid) {
                        return {
                            oid: json.oid,
                            potp: json.potp ? `${json.potp}` : undefined // make sure it's string
                        }
                    } else {
                        throw WMTLogger.errorAndException(`Failed to decode QR JWT from: ${code}`)
                    }
                } catch (e) {
                    throw WMTLogger.errorAndException(`Failed to decode QR JWT from: ${code}. With error: ${e}`)
                }
            }
        } else {
            throw WMTLogger.errorAndException(`JWT Payload is empty, jwtParts contain: ${jwtParts}`)
        }

        throw WMTLogger.errorAndException(`Failed to decode QR JWT from: ${code}`)
    }

    private static getURLParams(url: string): any {
        const regex = /[?&]([^=#]+)=([^&#]*)/g
        const params = {} as any
        var match
        while (match = regex.exec(url)) {
            params[match[1]] = match[2]
        }
        return params
    }
}