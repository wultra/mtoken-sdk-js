//
// Copyright 2025 Wultra s.r.o.
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
    action?: string
}

/**
 * Records user navigation through pre-approval screens.
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
     * If the previous visit is still open (no matching `end()` call),
     * it will be auto-closed with a warning.
     *
     * @param id Screen identifier matching `WMTPreApprovalScreen.id`.
     * @returns This recorder for chaining.
     */
    begin(id: string): this {
        // Auto-close any unclosed previous visit
        const lastVisit = this.visits.length > 0 ? this.visits[this.visits.length - 1] : undefined
        if (lastVisit && !lastVisit.timestampClosed) {
            WMTLogger.warn(`PreApprovalScreensRecorder: Auto-closing unclosed visit to screen "${lastVisit.screen}".`)
            lastVisit.timestampClosed = this.now().toISOString()
        }

        this.visits.push({
            screen: id,
            timestampOpened: this.now().toISOString()
        })
        return this
    }

    /**
     * Records the closing of a pre-approval screen.
     *
     * @param id Screen identifier. Must match the most recent `begin()` call.
     * @param action The action that closed the screen.
     * @returns This recorder for chaining.
     */
    end(id: string, action: WMTScreenAction): this {
        const lastVisit = this.visits.length > 0 ? this.visits[this.visits.length - 1] : undefined
        if (!lastVisit || lastVisit.screen !== id) {
            WMTLogger.warn(`PreApprovalScreensRecorder: end("${id}") does not match the last begin(). Ignoring.`)
            return this
        }
        if (lastVisit.timestampClosed) {
            WMTLogger.warn(`PreApprovalScreensRecorder: Screen "${id}" is already closed. Ignoring duplicate end().`)
            return this
        }
        lastVisit.timestampClosed = this.now().toISOString()
        lastVisit.action = action
        return this
    }

    /**
     * Clears all recorded visits.
     *
     * @returns This recorder for chaining.
     */
    reset(): this {
        this.visits = []
        return this
    }

    /**
     * Builds a snapshot of the recorded visits.
     *
     * Any still-open visit is auto-closed with a warning.
     *
     * @returns Array of visit records ready for JSON serialization.
     */
    build(): WMTPreApprovalScreenVisit[] {
        const snapshot = this.visits.map(v => ({ ...v }))

        // Auto-close any unclosed visit in the snapshot
        const lastVisit = snapshot.length > 0 ? snapshot[snapshot.length - 1] : undefined
        if (lastVisit && !lastVisit.timestampClosed) {
            WMTLogger.warn(`PreApprovalScreensRecorder: Auto-closing unclosed visit to screen "${lastVisit.screen}" during build().`)
            lastVisit.timestampClosed = this.now().toISOString()
        }

        return snapshot
    }
}
