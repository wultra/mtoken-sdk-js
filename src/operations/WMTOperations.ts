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
import { type WMTUserOperation } from "./WMTUserOperation"
import { type WMTOnlineOperation } from "./WMTOnlineOperation"
import { PowerAuthAuthentication } from 'react-native-powerauth-mobile-sdk'
import type { WMTQROperation } from './WMTQROperation'
import type { WMTPreApprovalScreen } from './WMTPreApprovalScreen'
import type { WMTPreApprovalElementListItem } from './WMTPreApprovalElement'
import type { WMTPreApprovalControls } from './WMTPreApprovalControls'
import type { WMTAnyObject } from '../utils/WMTAnyObject'
import { WMTLogger } from '../WMTLogger'

/**
 * Rejection reason for an operation.
 *
 * Standard reasons are `INCORRECT_DATA`, `UNEXPECTED_OPERATION`, `UNKNOWN`, and `PREAPPROVAL`.
 * Custom string reasons are also accepted.
 */
export type WMTRejectionReason = "INCORRECT_DATA" | "UNEXPECTED_OPERATION" | "UNKNOWN" | "PREAPPROVAL" | (string & {})

/** Operation handling.  */
export class WMTOperations extends WMTNetworking {

    private jsonDateFields = [ "operationExpires", "operationCreated", "timestampReceived" ]

    /**
    * Retrieves user operations.
    * 
    * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
    * @returns Server response (with list of operations).
    */
    async getOperations(requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTUserOperation[]>> {
        const response = await this.postSignedWithToken<WMTUserOperation[]>(
            {},
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/list",
            "possession_universal",
            true,
            requestProcessor,
            { dateFields: this.jsonDateFields }
        )
        return WMTOperations.normalizeOperationsResponse(response)
    }

    /**
     * Retrieves operation detail based on operation ID.
     * 
     * @param operationId ID of the operation.
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with operation detail)
     */
    async getDetail(operationId: string, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTUserOperation>> {
        const response = await this.postSignedWithToken<WMTUserOperation>(
            { requestObject: { id: operationId } },
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/detail",
            "possession_universal",
            true,
            requestProcessor,
            { dateFields: this.jsonDateFields }
        )
        return WMTOperations.normalizeOperationResponse(response)
    }

    /**
     * Retrieves the history of user operations with their current status.
     * 
     * @param authentication A multi-factor authentication object for signing. 2FA should be used (password or biometrics).
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with the list of operations).
     */
    async getHistory(authentication: PowerAuthAuthentication, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTUserOperation[]>> {
        const response = await this.postSigned<WMTUserOperation[]>(
            {},
            authentication,
            "/api/auth/token/app/operation/history",
            "/operation/history",
            true,
            requestProcessor,
            { dateFields: this.jsonDateFields }
        )
        return WMTOperations.normalizeOperationsResponse(response)
    }

    /**
     * Authorize operation with given PowerAuth authentication object.
     * 
     * @param operation Operation to authorize.
     * @param authentication A multi-factor authentication object for signing. 2FA should be used (password or biometrics).
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response
     */
    async authorize(operation: WMTOnlineOperation, authentication: PowerAuthAuthentication, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>> {
        let proximityCopy: any = undefined
        if (operation.proximityCheck) {
            proximityCopy = { otp: operation.proximityCheck.totp, type: operation.proximityCheck.type, timestampReceived: operation.proximityCheck.timestampReceived, timestampSent: new Date() }
        }
        return await this.postSigned<void>(
            { requestObject: { id: operation.id, data: operation.data, proximityCheck: proximityCopy, mobileTokenData: operation.mobileTokenData } },
            authentication,
            "/api/auth/token/app/operation/authorize",
            "/operation/authorize",
            false,
            requestProcessor
        )
    }

    /**
     * Reject operation with a reason.
     * 
     * @param operationId ID of the operation.
     * @param reason Reason for the rejection (e.g. `"INCORRECT_DATA"`, `"UNEXPECTED_OPERATION"`, `"PREAPPROVAL"`).
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @param mobileTokenData Optional mobile token data to send with the rejection (e.g. pre-approval screen visit records).
     * @returns Server response
     */
    async reject(operationId: string, reason: WMTRejectionReason, requestProcessor?: WMTRequestProcessor, mobileTokenData?: WMTAnyObject): Promise<WMTResponse<void>> {
        const requestObject: Record<string, unknown> = { id: operationId, reason: reason }
        if (mobileTokenData) {
            requestObject.mobileTokenData = mobileTokenData
        }
        return await this.postSigned<void>(
            { requestObject },
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/cancel",
            "/operation/cancel",
            false,
            requestProcessor
        )
    }

    /**
     * Sign offline QR operation with provided authentication.
     * 
     * Note that the operation will be signed even if the authentication object is
     * not valid as it cannot be verified on the server.
     *
     * @param operation Operation to approve
     * @param authentication A multi-factor authentication object for signing. 2FA should be used (password or biometrics).
     * @param uriId Custom signature URI ID of the operation. Use URI ID under which the operation was
     * created on the server. Default value is `/operation/authorize/offline`.
     * @returns 
     */
    async authorizeOffline(operation: WMTQROperation, authentication: PowerAuthAuthentication, uriId: string = "/operation/authorize/offline"): Promise<string> {
        return await this.pa.offlineSignature(authentication, uriId, operation.nonce, QROperationUtil.dataForOfflineSigning(operation))
    }

    /**
     * Assigns the 'non-personalized' operation to the user.
     * 
     * @param operationId ID of the operation which will be claimed to belong to the user.
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with operation detail)
     */
    async claim(operationId: string, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTUserOperation>> {
        const response = await this.postSignedWithToken<WMTUserOperation>(
            { requestObject: { id: operationId } },
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/detail/claim",
            "possession_universal",
            true,
            requestProcessor,
            { dateFields: this.jsonDateFields }
        )
        return WMTOperations.normalizeOperationResponse(response)
    }

    // --- Pre-approval screen normalization ---

    /**
     * Normalizes pre-approval screen data in a single-operation response.
     * Maps legacy `preApprovalScreen` to `preApprovalScreens` and converts
     * legacy `items`/`approvalType` to `elements`/`controls`.
     */
    private static normalizeOperationResponse(response: WMTResponse<WMTUserOperation>): WMTResponse<WMTUserOperation> {
        if (response.responseObject) {
            WMTOperations.normalizeOperation(response.responseObject)
        }
        return response
    }

    /**
     * Normalizes pre-approval screen data in a list-of-operations response.
     */
    private static normalizeOperationsResponse(response: WMTResponse<WMTUserOperation[]>): WMTResponse<WMTUserOperation[]> {
        if (response.responseObject) {
            for (const operation of response.responseObject) {
                WMTOperations.normalizeOperation(operation)
            }
        }
        return response
    }

    /**
     * Normalizes a single operation's UI data for pre-approval screen compatibility.
     */
    private static normalizeOperation(operation: WMTUserOperation): void {
        if (!operation.ui) {
            return
        }

        const ui = operation.ui

        // If plural is already present, use it as-is
        if (ui.preApprovalScreens && ui.preApprovalScreens.length > 0) {
            // Normalize each screen's legacy fields
            for (const screen of ui.preApprovalScreens) {
                WMTOperations.normalizePreApprovalScreen(screen)
            }
            return
        }

        // Fallback: legacy singular → wrap into array
        if (ui.preApprovalScreen) {
            WMTLogger.warn("Using legacy pre-approval format. Consider updating backend to the new preApprovalScreens model.")
            WMTOperations.normalizePreApprovalScreen(ui.preApprovalScreen)
            ui.preApprovalScreens = [ui.preApprovalScreen]
        }
    }

    /**
     * Normalizes legacy fields on a single pre-approval screen.
     * Converts `items` → `elements` (LIST_ITEM) and `approvalType` → `controls`.
     */
    private static normalizePreApprovalScreen(screen: WMTPreApprovalScreen): void {
        // Convert legacy items → elements (additive, don't overwrite existing elements)
        if (!screen.elements && screen.items && screen.items.length > 0) {
            screen.elements = screen.items.map(text => ({
                type: "LIST_ITEM",
                text
            } as WMTPreApprovalElementListItem))
        }

        // Convert legacy approvalType → controls (only SLIDER triggers controls)
        if (!screen.controls && screen.approvalType === "SLIDER") {
            screen.controls = {
                flip: true,
                decline: { type: "BACK" },
                approve: { type: "SLIDER" }
            }
        }
    }
}

class QROperationUtil {
    static dataForOfflineSigning(operation: WMTQROperation): string {
        if (operation.totp) {
            return `${operation.operationId}&${operation.operationData.sourceString}&${operation.totp}`
        } else {
            return `${operation.operationId}&${operation.operationData.sourceString}`
        }
    }
}
