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

import type { UserOperationAttribute } from "./UserOperationAttribute";

/** Additional UI data */
export interface UserOperationUIData {

    /** Confirm and Reject buttons should be flipped both in position and style */
    flipButtons?: Boolean;

    /** Block approval when on call (for example when on phone or skype call) */
    blockApprovalOnCall?: Boolean;

    /** UI for pre-approval operation screen */
    preApprovalScreen?: PreApprovalScreen;

    /**
     * UI for post-approval operation screen
     *
     * Type of PostApprovalScreen is presented with different classes based on its type (Starting with `PostApprovalScreen*`).
     * 
     * For example: (TODO!)
     */
    postApprovalScreen?: PostApprovalScreen;
}

/**
 *  PreApprovalScreen contains data to be presented before approving operation
 *
 * `type` define different kind of data which can be passed with operation
 *  and shall be displayed before operation is confirmed
 */
export interface PreApprovalScreen {
    /**
     * Type of PreApprovalScreen (`WARNING`, `INFO`, `QR_SCAN` - might be undefined for future compatibility)
     */
    type?: "INFO" | "WARNING" | "QR_SCAN" | "UNKNOWN";

    /**
     * Heading of the pre-approval screen
     */
    heading: string;

    /**
     * Message to the user
     */
     message: string;

    /**
     * Array of items to be displayed as list of choices
     */
    items?: string[];

    /**
     * Type of the approval button
     */
    approvalType?: "SLIDER" | "BUTTON";
}

export interface PostApprovalScreen {
    /**
     * type of PostApprovalScreen is presented with different classes (Starting with `PostApprovalScreen*`).
     * 
     * Mighr be `undefined` for forward compatibility reasons.
     */
    type?: "REVIEW" | "REDIRECT" | "GENERIC";
}

// --- REVIEW POST APPROVAL ---

export interface PostApprovalScreenReview extends PostApprovalScreen {
    /** Heading of the post-approval screen */
    heading: string;
    /** Message to the user */
    message: string;
    /** Payload with data for the review */
    payload: ReviewPostApprovalScreenPayload;
}

/** Review payload */
export interface ReviewPostApprovalScreenPayload {
    /** List of the operation attributes */
    attributes: UserOperationAttribute[];
}

// --- REDIRECT POST APPROVAL ---

export interface PostApprovalScreenRedirect extends PostApprovalScreen {
    /** Heading of the post-approval screen */
    heading: string;
    /** Message to the user */
    message: string;
    /** Payload with data for the redirect */
    payload: ReviewPostApprovalScreenPayload;
}

export interface RedirectPostApprovalScreenPayload {
    /** Label of the redirect URL */
    redirectText: string;
    /** URL to redirect, might be a website or application */
    redirectUrl: String;
    /** Time in seconds before automatic redirect */
    countdown: Number;
}

// --- GENERIC PSOT APPROVAL ---

export interface PostApprovalScreenGeneric extends PostApprovalScreen {
    /** Heading of the post-approval screen */
    heading: string;
    /** Message to the user */
    message: string;
    /** Payload */
    payload: any;
}