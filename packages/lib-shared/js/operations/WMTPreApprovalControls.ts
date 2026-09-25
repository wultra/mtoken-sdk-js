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

/**
 * Type of the approve control.
 */
export type WMTPreApprovalApproveType = "SLIDER" | "BUTTON"

/**
 * Type of the decline control.
 */
export type WMTPreApprovalDeclineType = "BACK" | "REJECT"

/**
 * Axis for button layout.
 */
export type WMTPreApprovalButtonAxis = "VERTICAL" | "HORIZONTAL"

/**
 * Configuration for the decline (reject / back) control on a pre-approval screen.
 */
export interface WMTPreApprovalControlsDecline {
    /** Type of decline action. */
    type?: WMTPreApprovalDeclineType

    /** Custom label for the decline button. */
    text?: string
}

/**
 * Configuration for the approve control on a pre-approval screen.
 */
export interface WMTPreApprovalControlsApprove {
    /** Type of approve control. */
    type?: WMTPreApprovalApproveType

    /** Custom label for the approve button. */
    text?: string

    /** Countdown in seconds before the approve control becomes enabled. */
    counter?: number
}

/**
 * Controls configuration for a pre-approval screen.
 *
 * Defines how approve/decline buttons are displayed and behave.
 */
export interface WMTPreApprovalControls {
    /** Whether approve and decline buttons should be flipped in position. */
    flip?: boolean

    /** Layout axis for the buttons. */
    axis?: WMTPreApprovalButtonAxis

    /** Decline button configuration. */
    decline?: WMTPreApprovalControlsDecline

    /** Approve button configuration. */
    approve?: WMTPreApprovalControlsApprove
}
