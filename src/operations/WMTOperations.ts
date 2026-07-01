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
import type { WMTUserOperationUIData } from './WMTUserOperationUIData'
import type { WMTPreApprovalElementListItem } from './WMTPreApprovalElement'
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

    // --- Pre-approval screen decoding ---

    /**
     * Decodes legacy pre-approval payloads in a single-operation response.
     * Maps a legacy singular `preApprovalScreen` into the `preApprovalScreens`
     * array and converts legacy `items`/`approvalType` into `elements`/`controls`.
     */
    private static normalizeOperationResponse(response: WMTResponse<WMTUserOperation>): WMTResponse<WMTUserOperation> {
        if (response.responseObject) {
            WMTOperations.normalizeOperation(response.responseObject)
        }
        return response
    }

    /**
     * Decodes legacy pre-approval payloads in a list-of-operations response.
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
     * Decodes a single operation's UI data, mapping any legacy pre-approval
     * payload onto the public `preApprovalScreens` model.
     *
     * This is automatically called by `getOperations`, `getDetail`, `getHistory`,
     * and `claim`. You can also call it manually to normalize raw JSON-parsed data
     * (e.g. in tests).
     */
    static normalizeOperation(operation: WMTUserOperation): void {
        if (!operation.ui) {
            return
        }

        // The legacy singular `preApprovalScreen` is not part of the public model.
        // It may still arrive in older server payloads, so we read it from the raw object.
        const ui = operation.ui as WMTUserOperationUIData & { preApprovalScreen?: WMTLegacyPreApprovalScreen }

        // If plural is already present, decode each screen's legacy fields and finish.
        if (ui.preApprovalScreens && ui.preApprovalScreens.length > 0) {
            for (const screen of ui.preApprovalScreens) {
                WMTOperations.normalizePreApprovalScreen(screen)
            }
            delete ui.preApprovalScreen
            return
        }

        // Fallback: legacy singular → wrap into the plural array.
        if (ui.preApprovalScreen) {
            WMTLogger.warn("Using legacy pre-approval format. Consider updating backend to the new preApprovalScreens model.")
            const screen = ui.preApprovalScreen as WMTPreApprovalScreen
            WMTOperations.normalizePreApprovalScreen(screen)
            ui.preApprovalScreens = [screen]
            delete ui.preApprovalScreen
        }
    }

    /**
     * Sentinel injected as `image` during legacy conversion because the legacy
     * format has no image field. UI code should check for this value and render
     * a suitable default (e.g. a generic icon or no image).
     */
    private static readonly FALLBACK_IMAGE = "fallback_image"

    /**
     * Sentinel injected as `icon` on list item elements during legacy conversion
     * because legacy items have no icon. UI code should check for this value
     * and provide a default rendering.
     */
    private static readonly FALLBACK_ICON = "fallback_icon"

    /**
     * Decodes legacy fields on a single pre-approval screen.
     * Converts `items` → `elements` (LIST_ITEM) and `approvalType` → `controls`,
     * then removes the legacy fields from the public model.
     *
     * Only enters the legacy branch when no new-model markers are present
     * (`elements`, `controls`, `id`, `backButton`, `image`).
     */
    private static readonly KNOWN_SCREEN_TYPES: readonly string[] = ["INFO", "WARNING", "QR_SCAN"]
    private static readonly KNOWN_ELEMENT_TYPES: readonly string[] = ["LIST_ITEM", "ALERT", "BUTTON"]

    private static normalizePreApprovalScreen(screen: WMTPreApprovalScreen): void {
        // Normalize unknown screen types to "UNKNOWN" (matching iOS/Android behavior)
        if (screen.type && !WMTOperations.KNOWN_SCREEN_TYPES.includes(screen.type)) {
            screen.type = "UNKNOWN"
        }

        const legacy = screen as WMTPreApprovalScreen & WMTLegacyPreApprovalScreen

        // Detect if this is actually a new-model payload
        const hasNewModel = screen.elements !== undefined
            || screen.controls !== undefined
            || screen.id !== undefined
            || screen.backButton !== undefined
            || screen.image !== undefined

        if (hasNewModel) {
            // New-model screen — just clean up any leftover legacy fields
            delete legacy.items
            delete legacy.approvalType
            WMTOperations.normalizeElements(screen)
            return
        }

        // --- Legacy branch ---

        // Inject fallback image
        screen.image = WMTOperations.FALLBACK_IMAGE

        // Convert legacy items → elements with fallback icon
        if (legacy.items && legacy.items.length > 0) {
            screen.elements = legacy.items.map(text => ({
                type: "LIST_ITEM",
                text,
                icon: WMTOperations.FALLBACK_ICON
            } as WMTPreApprovalElementListItem))
        }

        // Convert legacy approvalType → controls (only SLIDER triggers controls)
        if (legacy.approvalType === "SLIDER") {
            screen.controls = {
                flip: true,
                decline: { type: "BACK" },
                approve: { type: "SLIDER" }
            }
        }

        delete legacy.items
        delete legacy.approvalType

        WMTOperations.normalizeElements(screen)
    }

    private static normalizeElements(screen: WMTPreApprovalScreen): void {
        if (!screen.elements) return
        for (const element of screen.elements) {
            if (element.type && !WMTOperations.KNOWN_ELEMENT_TYPES.includes(element.type)) {
                element.type = "UNKNOWN"
            }
        }
    }
}

/** Shape of legacy pre-approval fields that may appear in older server payloads. */
interface WMTLegacyPreApprovalScreen {
    items?: string[]
    approvalType?: "SLIDER" | "BUTTON"
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
