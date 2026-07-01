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

/**
 * Records user navigation through pre-approval screens.
 *
 * Each "visit" captures an opening timestamp and, when closed, a closing
 * timestamp and the action that ended the visit.
 *
 * Implements `WMTMobileTokenDataRecord` so it can be stored in
 * `WMTMobileTokenDataBuilder` under the `"preApprovalScreens"` key.
 *
 * Usage:
 * ```typescript
 * const recorder = new WMTPreApprovalScreensRecorder()
 *     .begin("intro-warning")
 *     .end("intro-warning", "CONTINUE")
 *     .begin("qr-scan")
 *     .end("qr-scan", "SCAN")
 *
 * builder.put(recorder)
 * operation.mobileTokenData = builder.build()
 * ```
 */
export class WMTPreApprovalScreensRecorder implements WMTMobileTokenDataRecord {

    readonly key = "preApprovalScreens"

    private openVisit: WMTPreApprovalScreenVisit | undefined = undefined
    private visits: WMTPreApprovalScreenVisit[] = []
    private now: () => Date

    /**
     * Creates a new recorder.
     *
     * @param timeProvider Optional function returning the current time.
     *   Defaults to `() => new Date()`. Inject a custom provider for
     *   deterministic testing or to use PowerAuth time synchronization.
     */
    constructor(timeProvider?: () => Date) {
        this.now = timeProvider ?? (() => new Date())
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
            timestampOpened: this.now().toISOString()
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
            this.openVisit.timestampClosed = this.now().toISOString()
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
            this.visits[lastIdx].timestampClosed = this.now().toISOString()
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
     * but no action) and a warning is logged. This permanently consumes
     * the open visit — calling `build()` again without new `begin()`/`end()`
     * calls will not include it a second time.
     *
     * @returns Array of visit records ready for JSON serialization.
     */
    build(): WMTPreApprovalScreenVisit[] {
        if (this.openVisit) {
            WMTLogger.warn(`PreApprovalScreensRecorder: Building with unended visit for screen "${this.openVisit.screen}", ending it automatically with no action.`)
            this.openVisit.timestampClosed = this.now().toISOString()
            this.visits.push(this.openVisit)
            this.openVisit = undefined
        }

        return [...this.visits]
    }
}
