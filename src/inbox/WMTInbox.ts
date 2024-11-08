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

import { WMTNetworking, type WMTRequestProcessor, type WMTResponse } from "../networking/WMTNetworking"
import { type WMTInboxCount } from "./WMTInboxCount"
import { type WMTInboxMessage } from "./WMTInboxMessage"
import { type WMTInboxMessageDetail } from "./WMTInboxMessageDetail"
import { PowerAuthAuthentication } from 'react-native-powerauth-mobile-sdk'

/** Inbox handling. */
export class WMTInbox extends WMTNetworking {

    // name of the parsed fields that are expected to be the Date type.
    private jsonDateFields = [ "timestampCreated" ]

    /**
     * Get number of unread messages in the inbox.
     * 
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with the unread count)
     */
    async unreadCount(requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTInboxCount>> {
        return await this.postSignedWithToken<WMTInboxCount>(
            { },
            PowerAuthAuthentication.possession(),
            "/api/inbox/count",
            "possession_universal",
            true,
            requestProcessor
        )
    }

    /**
     * Paged list of messages in the inbox.
     * 
     * @param pageNumber Page number. First page is `0`, second `1`, etc.
     * @param pageSize Size of the page.
     * @param onlyUnread Get only unread messages.
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with the list of messages)
     */
    async list(pageNumber: Number, pageSize: Number, onlyUnread: boolean, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTInboxMessage[]>> {
        return await this.postSignedWithToken<WMTInboxMessage[]>(
            { requestObject: { page: pageNumber, size: pageSize, onlyUnread: onlyUnread } },
            PowerAuthAuthentication.possession(),
            "/api/inbox/message/list",
            "possession_universal",
            true,
            requestProcessor,
            { dateFields: this.jsonDateFields }
        )
    }

    /**
     * Get message detail in the inbox.
     * 
     * @param messageId Message identifier.
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with the message detail)
     */
    async detail(messageId: string, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTInboxMessageDetail>> {
        return await this.postSignedWithToken<WMTInboxMessageDetail>(
            { requestObject: { id: messageId } },
            PowerAuthAuthentication.possession(),
            "/api/inbox/message/detail",
            "possession_universal",
            true,
            requestProcessor,
            { dateFields: this.jsonDateFields }
        )
    }

    /**
     * Mark the message with the given identifier as read.
     * 
     * @param messageId Message identifier.
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns  Server response
     */
    async markRead(messageId: string, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>> {
        return await this.postSignedWithToken<void>(
            { requestObject: { id: messageId } },
            PowerAuthAuthentication.possession(),
            "/api/inbox/message/read",
            "possession_universal",
            false,
            requestProcessor
        )
    }

    /**
     * Marks all unread messages in the inbox as read.
     * 
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns  Server response
     */
    async markAllRead(requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>> {
        return await this.postSignedWithToken<void>(
            {},
            PowerAuthAuthentication.possession(),
            "/api/inbox/message/read-all",
            "possession_universal",
            false,
            requestProcessor
        )
    }
}
