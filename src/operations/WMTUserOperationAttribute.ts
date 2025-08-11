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

/**
 * Operation Attribute can be visualized as "1 row in operation screen".
 * 
 * `MobileTokenOperationAttribute` is considered to be "abstract".
 * Every type of the attribute has its own "strongly typed" implementation.
 */
export interface WMTUserOperationAttribute {

    /** 
     * ID (type) of the label. This is highly depended on the backend
     * and can be used to change the appearance of the label.
     */
    id: string

    /** 
     * Type of the operation.
     * 
     * If the type is, for example, `MobileTokenAttributeType.Amount`, you can retype the instance to `MobileTokenOperationAttributeAmount`.
     * 
     * The possible string value is a fallback for unknown attribute types.
     */
    type: WMTAttributeType | string
    
    /** Label value. */ 
    label: string
}

/** Attribute type. Based on this type, a proper class should be chosen for "deserialization". */
export enum WMTAttributeType {
    /** Amount, like "100.00 CZK." */
    AMOUNT            = "AMOUNT", 
    /** Currency conversion, for example, when changing money from USD to EUR. */
    AMOUNT_CONVERSION = "AMOUNT_CONVERSION",
    /** Any key value pair. */
    KEY_VALUE          = "KEY_VALUE",
    /** Just like KEY_VALUE, emphasizing that the value is a note or message. */
    NOTE              = "NOTE",
    /** Single highlighted text, written in a larger font, used as a section heading. */
    HEADING           = "HEADING",
    /** For image displaying. */
    IMAGE            = "IMAGE",
    /** Alert with type SUCCESS, INFO, WARNING or ERROR. Each type has an associated icon. */
    ALERT            = "ALERT"
}

/** Amount attribute is 1 row in operation that represents "Payment Amount". */
export interface WMTOperationAttributeAmount extends WMTUserOperationAttribute {
    
    /**
     * Formatted amount for presentation.
     * 
     * This property will be properly formatted based on the response language.
     * For example, when the amount is 100 and the acceptLanguage is "cs" for czech,
     * the amountFormatted will be "100,00".
     */ 
    amountFormatted?: string
    
    /**
     * Formatted currency to the locale based on acceptLanguage.
     * 
     * For example, when the currency is CZK, this property will be "Kč".
     */
    currencyFormatted?: string
    
    /**
     * Payment amount.
     */
    amount?: number
    
    /** Currency. */
    currency?: string

    /**
     * Formatted value and currency to the locale based on acceptLanguage.
     * 
     * Both amount and currency are formatted, String will show e.g. "€" in front of the amount
     * or "EUR" behind the amount depending on the locale.
     */
    valueFormatted?: string
}

/** Attribute that describes generic key-value row to display. */
export interface WMTOperationAttributeKeyValue extends WMTUserOperationAttribute {
    /**Value of the attribute  */ 
    value: string
}

/** Attribute that describes note, that should be handled as "long text message". */
export interface WMTOperationAttributeNote extends WMTUserOperationAttribute {
    /** Note  */ 
    note: string
}

/** Heading. This attribute has no value. It only acts as a "section separator". */
export interface WMTOperationAttributeHeading extends WMTUserOperationAttribute {
    
}

/** Image that might be "opened" on tap/click. */
export interface WMTOperationAttributeImage extends WMTUserOperationAttribute {

    /** Image thumbnail url to the public internet. */
    thumbnailUrl: string
    
    /**
     * Full-size image that should be displayed on thumbnail click (when not null).
     * Url to the public internet.
     */
    originalUrl?: string
}

/** Conversion attribute is 1 row in operation that represents "Money Conversion". */
export interface WMTOperationAttributeAmountConversion extends WMTUserOperationAttribute {
    
    /**
     * If the conversion is dynamic and the application should refresh it periodically.
     * 
     * This is just a hint for the application UI. This SDK does not offer a feature to periodically
     * refresh the conversion rate.
     */
    dynamic: boolean 
    
    /**
     * Formatted amount for presentation.
     * 
     * This property will be properly formatted based on the response language.
     * For example, when the amount is 100 and the acceptLanguage is "cs" for czech,
     * the amountFormatted will be "100,00".
     */
    sourceAmountFormatted?: string 
    /**
     * Formatted currency to the locale based on acceptLanguage.
     * 
     * For example, when the currency is CZK, this property will be "Kč".
     */
    sourceCurrencyFormatted?: string

    /**
     * Payment amount.
     * 
     * Amount might not be precise (due to floating point conversion during deserialization from JSON)
     * use amountFormatted property instead when available.
     */
    sourceAmount?: number

    /** Currency */
    sourceCurrency?: string
    /**
     * Formatted currency and amount to the locale based on acceptLanguage.
     * 
     * Both amount and currency are formatted, String will show e.g. "€" in front of the amount
     * or "EUR" behind the amount depending on locale.
     */
    sourceValueFormatted?: string
    
    /**
     * Formatted amount for presentation.
     * 
     * This property will be properly formatted based on the response language.
     * For example, when the amount is 100 and the acceptLanguage is "cs" for czech,
     * the amountFormatted will be "100,00".
     */
    targetAmountFormatted?: string

    /**
     * Formatted currency to the locale based on acceptLanguage.
     * 
     * For example, when the currency is CZK, this property will be "Kč".
     */
    targetCurrencyFormatted?: string
    /**
     * Payment amount.
     * 
     * Amount might not be precise (due to floating point conversion during deserialization from JSON)
     * use amountFormatted property instead when available.
     */
    targetAmount?: number

    /** Currency. */
    targetCurrency?: string
    
    /**
     * Formatted currency and amount to the locale based on acceptLanguage.
     * 
     * Both amount and currency are formatted, String will show e.g. "€" in front of the amount
     * or "EUR" behind the amount depending on locale.
     */
    targetValueFormatted?: string
}


/**
 * Allowed types for Alert type.
 */
export enum WMTAttributeAlertType {
    /** Success alert type. */
    success = "SUCCESS",
    /** Info alert type. */
    info = "INFO",
    /** Warning alert type. */
    warning = "WARNING",
    /** Error alert type. */
    error = "ERROR"
}

/** 
 * Alert attribute that represents a notification or message to the user.
 */
export interface WMTOperationAttributeAlert extends WMTUserOperationAttribute {

    /**
     * Type of the alert.
     *
     * Each alert type should have an associated icon on the client side.
     */
    alertType: WMTAttributeAlertType

    /**
     * Title of the alert. Optional.
     * 
     * When specified along with a message, it should be displayed as a highlighted part of the text
     * (i.e., bold and above the message).
     */
    title?: string

    /**
     * Message content of the alert.
     * 
     * If both message and title are specified, the message is displayed as the regular text below the title.
     * If only a message is specified, it is displayed as a regular text.
     */
    message: string
}
