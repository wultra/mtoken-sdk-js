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

import { Networking, type RequestProcessor, type MobileTokenResponse } from "../networking/Networking";
import { type MobileTokenUserOperation } from "./MobileTokenUserOperation";
import { type MobileTokenOperation } from "./MobileTokenOperation";
import { PowerAuthAuthentication } from 'react-native-powerauth-mobile-sdk';

/** Operation handling.  */
export class Operations extends Networking {

    /**
    * Retrieves user operations that are pending approval.
    * 
    * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
    * @returns Server response (with list of operations).
    */
    async pendingList(requestProcessor?: RequestProcessor): Promise<MobileTokenResponse<MobileTokenUserOperation[]>> {
        return await this.postSignedWithToken<MobileTokenUserOperation[]>(
            {},
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/list",
            "possession_universal",
            true,
            requestProcessor
        );
    }

    /**
     * Retrieves operation detail based on operation ID
     * 
     * @param operationId ID of the operation
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with operation detail)
     */
    async detail(operationId: string, requestProcessor?: RequestProcessor): Promise<MobileTokenResponse<MobileTokenUserOperation>> {
        return await this.postSignedWithToken<MobileTokenUserOperation>(
            { requestObject: { id: operationId } },
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/detail",
            "possession_universal",
            true,
            requestProcessor
        );
    }

    /**
     * Retrieves the history of user operations.
     * 
     * @param authentication Authentication object
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with list of operations).
     */
    async history(authentication: PowerAuthAuthentication, requestProcessor?: RequestProcessor): Promise<MobileTokenResponse<MobileTokenUserOperation[]>> {
        return await this.postSigned<MobileTokenUserOperation[]>(
            {},
            authentication,
            "/api/auth/token/app/operation/history",
            "/operation/history",
            true,
            requestProcessor
        );
    }

    /**
     * Authorize operation with given PowerAuth authentication object.
     * 
     * @param operation Operation to authorize
     * @param authentication Authentication object
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response
     */
    async authorize(operation: MobileTokenOperation, authentication: PowerAuthAuthentication, requestProcessor?: RequestProcessor): Promise<MobileTokenResponse<void>> {
        return await this.postSigned<void>(
            { requestObject: { id: operation.id, data: operation.data } },
            authentication,
            "/api/auth/token/app/operation/authorize",
            "/operation/authorize",
            false,
            requestProcessor
        );
    }

    /**
     * Reject operation with a reason.
     * 
     * @param operationId ID of the operation.
     * @param reason Reason for the rejection.
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response
     */
    async reject(operationId: string, reason: "INCORRECT_DATA" | "UNEXPECTED_OPERATION" | "UNKNOWN" | string, requestProcessor?: RequestProcessor): Promise<MobileTokenResponse<void>> {
        return await this.postSigned<void>(
            { requestObject: { id: operationId, reason: reason } },
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/cancel",
            "/operation/cancel",
            false,
            requestProcessor
        );
    }

    /**
     * Assigns the 'non-personalized' operation to the user
     * 
     * @param operationId ID of the operation.
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with operation detail)
     */
    async claim(operationId: string, requestProcessor?: RequestProcessor): Promise<MobileTokenResponse<MobileTokenUserOperation>> {
        return await this.postSignedWithToken<MobileTokenUserOperation>(
            { requestObject: { id: operationId } },
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/detail/claim",
            "possession_universal",
            true,
            requestProcessor
        );
    }
}
