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

import { Operations } from './operations/Operations';
import { PowerAuth } from 'react-native-powerauth-mobile-sdk';
import { Push } from './push/Push';
import { Inbox } from './inbox/Inbox';

/**
 * MobileToken class exposes API that enables to fetch, authorize or reject basic
 * operations created in the PowerAuth stack.
 */
export class MobileToken {

    operations: Operations;
    push: Push;
    inbox: Inbox;

    /**
     * 
     * @param powerAuth PowerAuth instance. Needs to be activated when calling any method of this class - othewise error will be thrown.
     * @param baseURL BaseURL of the server. If not provided, same URL as for PowerAuth it used.
     */
    constructor(powerAuth: PowerAuth, baseURL?: string) {

        let url = baseURL ?? powerAuth.configuration?.baseEndpointUrl ?? ""
        if (!url.endsWith("/")) {
            url += "/";
        }

        this.operations = new Operations(powerAuth, url)
        this.push = new Push(powerAuth, url);
        this.inbox = new Inbox(powerAuth, url);
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
        this.operations.acceptLanguage = lang;
        this.push.acceptLanguage = lang;
    }
}
