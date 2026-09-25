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
 * Type of a pre-approval element.
 */
export type WMTPreApprovalElementType = "LIST_ITEM" | "ALERT" | "BUTTON" | "UNKNOWN"

/**
 * Style of a pre-approval element.
 */
export type WMTPreApprovalElementStyle = "INFO" | "WARNING" | "DANGER"

/**
 * Action type for a button element.
 */
export type WMTPreApprovalButtonAction = "LINK" | "MAIL" | "PHONE"

/**
 * Base interface for a pre-approval screen element.
 *
 * Concrete element shapes are distinguished by the `type` field.
 * Unrecognized types are normalized to `"UNKNOWN"` by the SDK.
 */
export interface WMTPreApprovalElementBase {
    /** Optional element identifier. */
    id?: string

    /** Element type discriminator. */
    type?: WMTPreApprovalElementType

    /** Text content of the element. */
    text?: string
}

/**
 * List item element displayed in a pre-approval screen.
 */
export interface WMTPreApprovalElementListItem extends WMTPreApprovalElementBase {
    type?: "LIST_ITEM"

    /** Visual style of the list item. */
    style?: WMTPreApprovalElementStyle

    /** Icon identifier (only applicable to list items). */
    icon?: string
}

/**
 * Alert element displayed in a pre-approval screen.
 */
export interface WMTPreApprovalElementAlert extends WMTPreApprovalElementBase {
    type?: "ALERT"

    /** Visual style of the alert. */
    style?: WMTPreApprovalElementStyle
}

/**
 * Button element displayed in a pre-approval screen.
 */
export interface WMTPreApprovalElementButton extends WMTPreApprovalElementBase {
    type?: "BUTTON"

    /** Action triggered by the button. */
    action?: WMTPreApprovalButtonAction

    /** Extended behavior or secondary action identifier (e.g. `"REJECT"`). */
    actionSettings?: string

    /** Target URL, phone number, or email for the action. */
    href?: string
}

/**
 * Union type representing any pre-approval element.
 *
 * The `type` field discriminates between concrete shapes.
 * Unrecognized types are normalized to `"UNKNOWN"` and represented by the base interface.
 */
export type WMTPreApprovalElement =
    | WMTPreApprovalElementListItem
    | WMTPreApprovalElementAlert
    | WMTPreApprovalElementButton
    | WMTPreApprovalElementBase
