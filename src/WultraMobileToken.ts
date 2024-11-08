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
import type { WMTUserAgent } from './networking/WMTNetworking'
import { WMTLogger } from './WMTLogger'

/**
 * MobileToken class exposes API that enables to fetch, authorize or reject basic
 * operations created in the PowerAuth stack.
 */
export class WultraMobileToken {

    /** Operations manager. Use for fetching pending list, approving the operations etc. */
    operations: WMTOperations
    /** Push manager for registering the device to recieve PowerAuth push notification for given PowerAuth activation. */
    push: WMTPush
    /** Inbox manager - recieve message to communicate with the user. */
    inbox: WMTInbox

    /**
     * 
     * @param powerAuth PowerAuth instance. Needs to be activated when calling any method of this class - othewise error will be thrown.
     * @param baseURL BaseURL of the server. If not provided, same URL as for PowerAuth it used.
     * @param pushBaseURL In case that the push server is on different URL.
     *                    This is a rare scenario which doesn't happen in regular setup.
     *                    When not set, baseURL is used.
     * @param inboxBaseURL In case that the inbox server is on different URL.
     *                     This is a rare scenario which doesn't happen in regular setup.
     *                     When not set, baseURL is used.
     */
    constructor(powerAuth: PowerAuth, baseURL?: string, pushBaseURL?: string, inboxBaseURL?: string) {

        let enrollmentURL = baseURL ?? powerAuth.configuration?.baseEndpointUrl ?? ""
        let pushURL = pushBaseURL ?? enrollmentURL
        let inboxURL = inboxBaseURL ?? enrollmentURL

        this.operations = new WMTOperations(powerAuth, enrollmentURL)
        this.push = new WMTPush(powerAuth, pushURL)
        this.inbox = new WMTInbox(powerAuth, inboxURL)

        WMTLogger.debug("Mobile Token object created with:")
        WMTLogger.debug(" - baseURL: " + enrollmentURL)
        WMTLogger.debug(" - pushURL: " + pushURL)
        WMTLogger.debug(" - inboxURL: " + inboxURL)
    }

    /**
     * Sets accept language for the outgoing requests headers for `operations`, `push` and `inbox` objects.
     * 
     * The value can be further modified in the each object individualy.
     * 
     * Default value is "en".
     * 
     * 
     * Standard RFC "Accept-Language" https://tools.ietf.org/html/rfc7231#section-5.3.5
     * Response texts are based on this setting. For example when "de" is set, server
     * will return operation texts in german (if available).
     */
    setAcceptLanguage(lang: string) {
        this.operations.acceptLanguage = lang
        this.push.acceptLanguage = lang
        this.inbox.acceptLanguage = lang
        WMTLogger.info(`accent language set to ${lang}`)
    }

    /** 
     * User agent that will be used in a HTTP hader. 
     * 
     * Note that user-agent can be overriden by request processor in each API call.
     */
    setUserAgent(userAgent: WMTUserAgent | string) {
        this.operations.userAgent = userAgent
        this.push.userAgent = userAgent
        this.inbox.userAgent = userAgent
        WMTLogger.info(`User-Agent set to ${userAgent}`)
    }
}
