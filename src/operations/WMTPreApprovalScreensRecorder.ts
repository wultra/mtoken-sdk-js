//
// Copyright 2026 Wultra s.r.o.
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

import { PowerAuth } from "react-native-powerauth-mobile-sdk"
import { WMTLogger } from "../WMTLogger"
import type { WMTMobileTokenDataRecord } from "./WMTMobileTokenDataBuilder"

/**
 * Action performed by the user on a pre-approval screen.
 *
 * Standard actions are predefined as string constants. Custom actions
 * can be passed as any string value.
 */
export type WMTScreenAction = "CONTINUE" | "BACK" | "CLOSE" | "REJECT" | "SCAN" | (string & {})

/**
 * A single recorded visit to a pre-approval screen.
 */
export interface WMTPreApprovalScreenVisit {
    /** Screen identifier matching `WMTPreApprovalScreen.id`. */
    screen: string

    /** ISO 8601 timestamp when the screen was opened. */
    timestampOpened: string

    /** ISO 8601 timestamp when the screen was closed (`undefined` if still open). */
    timestampClosed?: string

    /** Action that closed the screen (`undefined` if still open). */
    action?: WMTScreenAction
}

/** Internal visit representation that keeps timestamps as `Date` objects. */
interface InternalVisit {
    screen: string
    timestampOpened: Date
    timestampClosed?: Date
    action?: WMTScreenAction
}

/**
 * Records user navigation through pre-approval screens.
 *
 * Each "visit" captures an opening timestamp and, when closed, a closing
 * timestamp and the action that ended the visit. Timestamps are captured
 * in local device time and synchronized against the server time
 * (via PowerAuth time synchronization) when `build()` is called.
 *
 * Implements `WMTMobileTokenDataRecord` so it can be stored in
 * `WMTMobileTokenDataBuilder` under the `"preApprovalScreens"` key.
 *
 * Usage:
 * ```typescript
 * const recorder = new WMTPreApprovalScreensRecorder(powerAuth)
 *     .begin("intro-warning")
 *     .end("intro-warning", "CONTINUE")
 *     .begin("qr-scan")
 *     .end("qr-scan", "SCAN")
 *
 * await builder.putRecord(recorder)
 * operation.mobileTokenData = builder.build()
 * ```
 */
export class WMTPreApprovalScreensRecorder implements WMTMobileTokenDataRecord {

    readonly key = "preApprovalScreens"

    private openVisit: InternalVisit | undefined = undefined
    private visits: InternalVisit[] = []
    private now: () => Date
    private localTimeAdjustmentMs: () => Promise<number>

    /**
     * Creates a new recorder.
     *
     * Timestamps are captured in local device time. When `build()` is called,
     * the `powerAuth` instance provides the local time adjustment against
     * the server and all timestamps are shifted by it. If the time is not
     * synchronized, the adjustment is zero and local time is used as-is.
     *
     * @param powerAuth PowerAuth instance used to obtain the local time
     *   adjustment against the server when the record is built.
     * @param timeProvider Optional function returning the current time.
     *   Defaults to `() => new Date()`. Inject for deterministic testing.
     * @param timeAdjustmentProvider Optional function returning the local
     *   time adjustment in milliseconds. Defaults to PowerAuth time
     *   synchronization. Inject for deterministic testing.
     */
    constructor(powerAuth: PowerAuth, timeProvider?: () => Date, timeAdjustmentProvider?: () => Promise<number>) {
        this.now = timeProvider ?? (() => new Date())
        this.localTimeAdjustmentMs = timeAdjustmentProvider ?? (() => powerAuth.timeSynchronizationService.localTimeAdjustment())
    }

    /**
     * Records the opening of a pre-approval screen.
     *
     * If a different visit is already open, it is appended as-is
     * (without `timestampClosed` / `action`). If the same screen is
     * already open, this call is a no-op.
     *
     * @param id Screen identifier matching `WMTPreApprovalScreen.id`.
     * @returns This recorder for chaining.
     */
    begin(id: string): this {
        if (!id) { return this }

        if (this.openVisit) {
            if (this.openVisit.screen === id) { return this }
            this.visits.push(this.openVisit)
        }

        this.openVisit = {
            screen: id,
            timestampOpened: this.now()
        }
        return this
    }

    /**
     * Closes the current visit (if its id matches) and records the action.
     *
     * If no open visit matches, falls back to the last recorded visit if it
     * has the same id and is still unclosed (no `timestampClosed` / `action`).
     *
     * @param id Screen identifier.
     * @param action The action that closed the screen.
     * @returns This recorder for chaining.
     */
    end(id: string, action: WMTScreenAction): this {
        // Currently open visit matches this id → close & append
        if (this.openVisit && this.openVisit.screen === id) {
            this.openVisit.timestampClosed = this.now()
            this.openVisit.action = action
            this.visits.push(this.openVisit)
            this.openVisit = undefined
            return this
        }

        // Fallback: last recorded visit with same id still unfinished
        const lastIdx = this.visits.length - 1
        if (lastIdx >= 0
            && this.visits[lastIdx].screen === id
            && !this.visits[lastIdx].timestampClosed
            && !this.visits[lastIdx].action) {
            this.visits[lastIdx].timestampClosed = this.now()
            this.visits[lastIdx].action = action
        }

        return this
    }

    /**
     * Clears all recorded visits, allowing the recorder to start fresh.
     *
     * @returns This recorder for chaining.
     */
    reset(): this {
        this.openVisit = undefined
        this.visits = []
        return this
    }

    /**
     * Produces the value representation for `mobileTokenData`.
     *
     * If a visit is still open, it is auto-closed (with `timestampClosed`
     * but no action), appended to the recorded visits and a warning is
     * logged. Subsequent `build()` calls return all recorded visits again,
     * including the auto-closed one (it is closed only once).
     *
     * All timestamps are shifted by the PowerAuth local time adjustment
     * against the server, so the resulting payload is in synchronized time
     * even when the visits were recorded before the time was synchronized.
     *
     * @returns Array of visit records ready for JSON serialization.
     */
    async build(): Promise<WMTPreApprovalScreenVisit[]> {
        if (this.openVisit) {
            WMTLogger.warn(`PreApprovalScreensRecorder: Building with unended visit for screen "${this.openVisit.screen}", ending it automatically with no action.`)
            this.openVisit.timestampClosed = this.now()
            this.visits.push(this.openVisit)
            this.openVisit = undefined
        }

        const adjustmentMs = await this.timeAdjustment()

        return this.visits.map(v => {
            const visit: WMTPreApprovalScreenVisit = {
                screen: v.screen,
                timestampOpened: WMTPreApprovalScreensRecorder.serialize(v.timestampOpened, adjustmentMs)
            }
            if (v.timestampClosed) {
                visit.timestampClosed = WMTPreApprovalScreensRecorder.serialize(v.timestampClosed, adjustmentMs)
            }
            if (v.action) {
                visit.action = v.action
            }
            return visit
        })
    }

    /** Local time adjustment against the server in milliseconds (fallback: zero). */
    private async timeAdjustment(): Promise<number> {
        try {
            const ms = await this.localTimeAdjustmentMs()
            WMTLogger.debug(`PreApprovalScreensRecorder: Adjusting timestamps by ${ms} ms (local time adjustment against the server).`)
            return ms
        } catch (e) {
            WMTLogger.warn(`PreApprovalScreensRecorder: Failed to obtain local time adjustment, timestamps will use unadjusted device time: ${e}`)
            return 0
        }
    }

    private static serialize(timestamp: Date, adjustmentMs: number): string {
        return new Date(timestamp.getTime() + adjustmentMs).toISOString()
    }
}
