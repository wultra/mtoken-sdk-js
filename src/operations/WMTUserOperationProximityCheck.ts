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


/** Type of the proximity check. */
export type ProximityCheckType = "QR_CODE" | "DEEPLINK"

/**
 * Object that is used to hold data about a proximity check.
 * Data shall be assigned to the operation when obtained.
 *
 * The SDK automatically adjusts `timestampReceived` using server-synchronized time
 * during the operation authorization, so consumers only need to create this object
 * with `totp` and `type`.
 */
export class WMTUserOperationProximityCheck {

    /** The actual Time-based one time password. */
    readonly totp: string

    /** Type of the Proximity check. */
    readonly type: ProximityCheckType

    private readonly _timestampReceived: Date

    /**
     * @param totp The Time-based one time password.
     * @param type Type of the proximity check.
     */
    constructor(totp: string, type: ProximityCheckType) {
        this.totp = totp
        this.type = type
        this._timestampReceived = new Date()
    }

    /**
     * Timestamp when the operation was scanned (qrCode) or delivered to the device (deeplink).
     */
    get timestampReceived(): Date {
        return this._timestampReceived
    }
}