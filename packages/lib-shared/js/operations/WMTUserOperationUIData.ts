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

import type { WMTUserOperationAttribute } from "./WMTUserOperationAttribute"
import type { WMTPreApprovalScreen } from "./WMTPreApprovalScreen"

/** Operation UI model that contains data for screens for pre and/or post approved operation. */
export interface WMTUserOperationUIData {

    /** Confirm and Reject buttons should be flipped both in position and style. */
    flipButtons?: boolean

    /** Block approval when on call (for example when on phone or skype call). */
    blockApprovalOnCall?: boolean

    /**
     * UI for pre-approval operation screens.
     *
     * When the server sends the legacy singular `preApprovalScreen`, the SDK decodes
     * it into this array automatically.
     */
    preApprovalScreens?: WMTPreApprovalScreen[]

    /**
     * UI for post-approval operation screen.
     *
     * Type of PostApprovalScreen is presented with different classes based on its type (Starting with `PostApprovalScreen*`).
     * 
     * For example: WMTPostApprovalScreenRedirect that provides data after URL redirect.
     */
    postApprovalScreen?: WMTPostApprovalScreen
}

export interface WMTPostApprovalScreen {
    /**
     * type of PostApprovalScreen is presented with different classes (Starting with `PostApprovalScreen*`).
     * 
     * Mighr be `undefined` for forward compatibility reasons.
     */
    type?: "REVIEW" | "REDIRECT" | "GENERIC"
}

// --- REVIEW POST APPROVAL ---

export interface WMTPostApprovalScreenReview extends WMTPostApprovalScreen {
    /** Heading of the post-approval screen. */
    heading: string
    /** Message to the user. */
    message: string
    /** Payload with data for the review. */
    payload: WMTReviewPostApprovalScreenPayload
}

/** Review payload. */
export interface WMTReviewPostApprovalScreenPayload {
    /** List of the operation attributes */
    attributes: WMTUserOperationAttribute[]
}

// --- REDIRECT POST APPROVAL ---

export interface WMTPostApprovalScreenRedirect extends WMTPostApprovalScreen {
    /** Heading of the post-approval screen */
    heading: string
    /** Message to the user */
    message: string
    /** Payload with data for the redirect */
    payload: WMTReviewPostApprovalScreenPayload
}

export interface WMTRedirectPostApprovalScreenPayload {
    /** Label of the redirect URL */
    redirectText: string
    /** URL to redirect, might be a website or application */
    redirectUrl: string
    /** Time in seconds before automatic redirect */
    countdown: number
}

// --- GENERIC PSOT APPROVAL ---

export interface WMTPostApprovalScreenGeneric extends WMTPostApprovalScreen {
    /** Heading of the post-approval screen. */
    heading: string
    /** Message to the user. */
    message: string
    /** Payload. */
    payload: any
}
