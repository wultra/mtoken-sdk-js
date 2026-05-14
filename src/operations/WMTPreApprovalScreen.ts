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

import type { WMTPreApprovalElement } from "./WMTPreApprovalElement"
import type { WMTPreApprovalControls } from "./WMTPreApprovalControls"

/**
 * Type of a pre-approval screen.
 */
export type WMTPreApprovalScreenType = "INFO" | "WARNING" | "QR_SCAN" | "UNKNOWN"

/**
 * Pre-approval screen contains data to be presented before approving an operation.
 *
 * The `type` field defines the kind of screen. Multiple screens can be chained to
 * form a multi-step pre-approval flow.
 *
 * Legacy fields (`items`, `approvalType`) are preserved for backward compatibility
 * with older server responses. When processing operations, the SDK normalizes
 * legacy fields into the new `elements` and `controls` structure.
 */
export interface WMTPreApprovalScreen {
    /**
     * Type of PreApprovalScreen (`WARNING`, `INFO`, `QR_SCAN`).
     *
     * May be `undefined` for forward compatibility with future server-defined types.
     */
    type?: WMTPreApprovalScreenType | string

    /** Heading of the pre-approval screen. */
    heading: string

    /** Message to the user. */
    message: string

    /** Unique screen identifier used for tracking navigation through the flow. */
    id?: string

    /** Whether a back button should be shown on this screen. */
    backButton?: boolean

    /** Image asset identifier for the screen. */
    image?: string

    /** Structured content elements to display on the screen. */
    elements?: WMTPreApprovalElement[]

    /** Approve/decline button configuration for the screen. */
    controls?: WMTPreApprovalControls

    /**
     * Array of items to be displayed as list of choices.
     *
     * @deprecated Use `elements` with `LIST_ITEM` type instead. Kept for backward
     * compatibility with legacy server responses.
     */
    items?: string[]

    /**
     * Type of the approval button.
     *
     * @deprecated Use `controls.approve.type` instead. Kept for backward
     * compatibility with legacy server responses.
     */
    approvalType?: "SLIDER" | "BUTTON"
}
