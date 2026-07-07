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
import type { WMTUserOperationProximityCheck } from './WMTUserOperationProximityCheck'
import { WMTLogger } from "../WMTLogger"

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
        return await this.postSignedWithToken<WMTUserOperation[]>(
            {},
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/list",
            "possession_universal",
            true,
            requestProcessor,
            { dateFields: this.jsonDateFields }
        )
    }

    /**
     * Retrieves operation detail based on operation ID.
     * 
     * @param operationId ID of the operation.
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with operation detail)
     */
    async getDetail(operationId: string, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTUserOperation>> {
        return await this.postSignedWithToken<WMTUserOperation>(
            { requestObject: { id: operationId } },
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/detail",
            "possession_universal",
            true,
            requestProcessor,
            { dateFields: this.jsonDateFields }
        )
    }

    /**
     * Retrieves the history of user operations with their current status.
     * 
     * @param authentication A multi-factor authentication object for signing. 2FA should be used (password or biometrics).
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response (with the list of operations).
     */
    async getHistory(authentication: PowerAuthAuthentication, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTUserOperation[]>> {
        return await this.postSigned<WMTUserOperation[]>(
            {},
            authentication,
            "/api/auth/token/app/operation/history",
            "/operation/history",
            true,
            requestProcessor,
            { dateFields: this.jsonDateFields }
        )
    }

    /**
     * Authorize operation with given PowerAuth authentication object.
     *
     * If the operation has a proximity check, the SDK automatically adjusts its timestamps
     * using server-synchronized time. If time is not yet synchronized, the SDK will
     * synchronize it before proceeding with the authorization.
     * 
     * @param operation Operation to authorize.
     * @param authentication A multi-factor authentication object for signing. 2FA should be used (password or biometrics).
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response
     */
    async authorize(operation: WMTOnlineOperation, authentication: PowerAuthAuthentication, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>> {
        const proximityCheck = operation.proximityCheck
        let proximityRequest: any = undefined
        if (proximityCheck) {
            await this.ensureTimeSynchronized()
            proximityRequest = await this.buildProximityCheckRequestData(proximityCheck)
        }
        return await this.postSigned<void>(
            { requestObject: { id: operation.id, data: operation.data, proximityCheck: proximityRequest, mobileTokenData: operation.mobileTokenData } },
            authentication,
            "/api/auth/token/app/operation/authorize",
            "/operation/authorize",
            false,
            requestProcessor
        )
    }

    /**
     * Ensures that the local time is synchronized with the PowerAuth server.
     *
     * If the time is not synchronized yet, it synchronizes it. Throws when the synchronization fails.
     */
    private async ensureTimeSynchronized(): Promise<void> {
        const timeService = this.pa.timeSynchronizationService
        if (await timeService.isTimeSynchronized()) {
            WMTLogger.debug("Proximity check: time already synchronized.")
            return
        }
        WMTLogger.info("Proximity check: time not synchronized, synchronizing before authorize.")
        await timeService.synchronizeTime()
    }

    /**
     * Builds the proximity check request data with timestamps adjusted to the server-synchronized time.
     *
     * Must only be called when the time is synchronized with the server (see `ensureTimeSynchronized`).
     */
    private async buildProximityCheckRequestData(proximityCheck: WMTUserOperationProximityCheck): Promise<any> {
        const timeService = this.pa.timeSynchronizationService
        const localTimeAdjustment = await timeService.localTimeAdjustment()
        const now = Date.now()
        const receivedMs = proximityCheck.timestampReceived.getTime()
        if (Number.isNaN(receivedMs)) {
            throw WMTLogger.errorAndException("Proximity check timestampReceived is invalid.")
        }
        const adjustedReceived = receivedMs + localTimeAdjustment
        const timestampSent = now + localTimeAdjustment
        if (adjustedReceived > timestampSent) {
            throw WMTLogger.errorAndException(
                `Proximity check timestamp is invalid (timestampReceived(adjusted)=${adjustedReceived}, timestampSent=${timestampSent}). The device time likely changed after the proximity check was received.`
            )
        }

        WMTLogger.debug(
            "Proximity check timestamps: " +
            `timestampReceived=${proximityCheck.timestampReceived.getTime()}, ` +
            `adjustedReceived=${adjustedReceived}, ` +
            `timestampSent(serverTime)=${timestampSent}, ` +
            `localTimeAdjustment=${localTimeAdjustment}ms`
        )

        return {
            otp: proximityCheck.totp,
            type: proximityCheck.type,
            timestampReceived: new Date(adjustedReceived),
            timestampSent: new Date(timestampSent)
        }
    }

    /**
     * Reject operation with a reason.
     * 
     * @param operationId ID of the operation.
     * @param reason Reason for the rejection.
     * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
     * @returns Server response
     */
    async reject(operationId: string, reason: "INCORRECT_DATA" | "UNEXPECTED_OPERATION" | "UNKNOWN" | string, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>> {
        return await this.postSigned<void>(
            { requestObject: { id: operationId, reason: reason } },
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
        return await this.postSignedWithToken<WMTUserOperation>(
            { requestObject: { id: operationId } },
            PowerAuthAuthentication.possession(),
            "/api/auth/token/app/operation/detail/claim",
            "possession_universal",
            true,
            requestProcessor,
            { dateFields: this.jsonDateFields }
        )
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
