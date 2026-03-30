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

import { WMTOperations } from './operations/WMTOperations'
import { PowerAuth } from 'react-native-powerauth-mobile-sdk'
import { WMTPush } from './push/WMTPush'
import { WMTInbox } from './inbox/WMTInbox'
import { WMTUserAgent } from './networking/WMTNetworking'
import { WMTLogger } from './WMTLogger'
import { WMTOIDC } from './oidc/WMTOIDC'

/**
 * MobileToken class exposes APIs that enable:
 *  Fetching, authorizing or rejecting basic
 *  operations created in the PowerAuth stack.
 *  Push notifications enrollment.
 *  Inbox message management.
 */
export class WultraMobileToken {

    /** Operations manager. Use for fetching pending list, approving the operations etc. */
    operations: WMTOperations

    /** Push manager for registering the device to recieve PowerAuth push notification for given PowerAuth activation. */
    push: WMTPush

    /** Inbox manager - recieve message to communicate with the user. */
    inbox: WMTInbox

    /** OIDC manager - receive the config and help with OIDC activation preparation. */
    oidc: WMTOIDC

    /**
     * 
     * @param powerAuth PowerAuth instance. Needs to be activated when calling any method of this class - othewise error will be thrown.
     * @param acceptLanguage Optionally sets the accept language for the outgoing requests headers for `operations`, `push` and `inbox` objects.
     *                       The default value is "en".
     *                       The value can be further modified in the each service object individualy.
     *                       Standard RFC "Accept-Language" https://tools.ietf.org/html/rfc7231#section-5.3.5
     *                       Response texts are based on this setting. For example when "de" is set, server
     *                       will return operation texts in german (if available).
     * @param userAgent Optionally sets the User agent that will be used in a HTTP hader. 
     *                  Note that user-agent can be overriden by request processor in each API call.
     * @throws Can throw when a null or invalid `baseEndpointUrl` is set in the `PowerAuth` instance.
     */
    constructor(powerAuth: PowerAuth, acceptLanguage?: string, userAgent?: WMTUserAgent | string) {

        // Retrieve the base URL and instantiate mtoken services.
        let baseURL = powerAuth.configuration?.baseEndpointUrl

        if (baseURL == null) {
            throw new Error("Null base URL recieved from the PowerAuth instance.")
        }

        this.operations = new WMTOperations(powerAuth, baseURL)
        this.push = new WMTPush(powerAuth, baseURL)
        this.inbox = new WMTInbox(powerAuth, baseURL)
        this.oidc = new WMTOIDC(powerAuth, baseURL)

        // Set the accept language properties.
        let lang = acceptLanguage ?? "en"
        this.operations.acceptLanguage = lang
        this.push.acceptLanguage = lang
        this.inbox.acceptLanguage = lang
        this.oidc.acceptLanguage = lang

        // Set the user agent properties.
        let agent = userAgent ?? WMTUserAgent.LIBRARY_DEFAULT
        this.operations.userAgent = agent
        this.push.userAgent = agent
        this.inbox.userAgent = agent
        this.oidc.userAgent = agent

        WMTLogger.debug("Mobile Token object created with:")
        WMTLogger.debug(" - baseURL: " + baseURL)
        WMTLogger.debug(" - acceptLanguage:" + lang)
        WMTLogger.debug(" - userAgent: " + agent)
    }

    /**
     * Sets accept language for the outgoing requests headers for `operations`, `push` and `inbox` objects.
     *
     * The value can be further modified in the each object individualy.
     *
     * Default value is "en".
     *
     * Standard RFC "Accept-Language" https://tools.ietf.org/html/rfc7231#section-5.3.5
     * Response texts are based on this setting. For example when "de" is set, server
     * will return operation texts in german (if available).
     */
    setAcceptLanguage(lang: string) {
        this.operations.acceptLanguage = lang
        this.push.acceptLanguage = lang
        this.inbox.acceptLanguage = lang
        this.oidc.acceptLanguage = lang
        WMTLogger.info(`accept language set to ${lang}`)
    }
}
