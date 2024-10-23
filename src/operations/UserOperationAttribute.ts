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
 * Every type of the attribute has it's own "strongly typed" implementation.
 */
export interface UserOperationAttribute {

    /** 
     * ID (type) of the label. This is highly depended on the backend
     * and can be used to change the appearance of the label
     */
    id: string;

    /** 
     * Type of the operation.
     * 
     * If the type is for example `MobileTokenAttributeType.Amount`, you can retype the instance to `MobileTokenOperationAttributeAmount`.
     * 
     * The possible string value is a fallback for unknown attribute types.
     */
    type: AttributeType | string;
    
    /** Label value */ 
    label: string;
}

/** Attribute type. Based on this type, proper class should be chosen for "deserialization". */
export enum AttributeType {
    /** Amount, like "100.00 CZK" */
    AMOUNT            = "AMOUNT", 
    /** Currency conversion, for example when changing money from USD to EUR */
    AMOUNT_CONVERSION = "AMOUNT_CONVERSION",
    /** Any key value pair */
    KEY_VALUE          = "KEY_VALUE",
    /** Just like KEY_VALUE, emphasizing that the value is a note or message */
    NOTE              = "NOTE",
    /** Single highlighted text, written in a larger font, used as a section heading */
    HEADING           = "HEADING",
    /** For image displaying */
    IMAGE            = "IMAGE"
}

/** Amount attribute is 1 row in operation, that represents "Payment Amount" */
export interface OperationAttributeAmount extends UserOperationAttribute {
    
    /**
     * Formatted amount for presentation.
     * 
     * This property will be properly formatted based on the response language.
     * For example when amount is 100 and the acceptLanguage is "cs" for czech,
     * the amountFormatted will be "100,00".
     */ 
    amountFormatted?: string;
    
    /**
     * Formatted currency to the locale based on acceptLanguage
     * 
     * For example when the currency is CZK, this property will be "Kč"
     */
    currencyFormatted?: string;
    
    /**
     * Payment amount.
     */
    amount?: number;
    
    /** Currency */
    currency?: string;

    /**
     * Formatted value and currency to the locale based on acceptLanguage
     * 
     * Both amount and currency are formatted, String will show e.g. "€" in front of the amount
     * or "EUR" behind the amount depending on the locale
     */
    valueFormatted?: string;
}

/** Attribute that describes generic key-value row to display. */
export interface OperationAttributeKeyValue extends UserOperationAttribute {
    /**Value of the attribute  */ 
    value: string;
}

/** Attribute that describes note, that should be handled as "long text message". */
export interface OperationAttributeNote extends UserOperationAttribute {
    /** Note  */ 
    note: string;
}

/** Heading. This attribute has no value. It only acts as a "section separator". */
export interface OperationAttributeHeading extends UserOperationAttribute {
    
}

/** Image that might be "open" on tap/click. */
export interface OperationAttributeImage extends UserOperationAttribute {

    /** Image thumbnail url to the public internet. */
    thumbnailUrl: string;
    
    /**
     * Full-size image that should be displayed on thumbnail click (when not null).
     * Url to the public internet
     */
    originalUrl?: string;
}

/** Conversion attribute is 1 row in operation, that represents "Money Conversion" */
export interface OperationAttributeAmountConversion extends UserOperationAttribute {
    
    /**
     * If the conversion is dynamic and the application should refresh it periodically
     * 
     * This is just a hint for the application UI. This SDK does not offer feature to periodically
     * refresh conversion rate.
     */
    dynamic: boolean; 
    
    /**
     * Formatted amount for presentation.
     * 
     * This property will be properly formatted based on the response language.
     * For example when amount is 100 and the acceptLanguage is "cs" for czech,
     * the amountFormatted will be "100,00".
     */
    sourceAmountFormatted?: string; 
    /**
     * Formatted currency to the locale based on acceptLanguage
     * 
     * For example when the currency is CZK, this property will be "Kč"
     */
    sourceCurrencyFormatted?: string;

    /**
     * Payment amount
     * 
     * Amount might not be precise (due to floating point conversion during deserialization from json)
     * use amountFormatted property instead when available
     */
    sourceAmount?: number;

    /** Currency */
    sourceCurrency?: string;
    /**
     * Formatted currency and amount to the locale based on acceptLanguage
     * 
     * Both amount and currency are formatted, String will show e.g. "€" in front of the amount
     * or "EUR" behind the amount depending on locale
     */
    sourceValueFormatted?: string;
    
    /**
     * Formatted amount for presentation.
     * 
     * This property will be properly formatted based on the response language.
     * For example when amount is 100 and the acceptLanguage is "cs" for czech,
     * the amountFormatted will be "100,00".
     */
    targetAmountFormatted?: string;

    /**
     * Formatted currency to the locale based on acceptLanguage
     * 
     * For example when the currency is CZK, this property will be "Kč"
     */
    targetCurrencyFormatted?: string;
    /**
     * Payment amount
     * 
     * Amount might not be precise (due to floating point conversion during deserialization from json)
     * use amountFormatted property instead when available
     */
    targetAmount?: number;

    /** Currency */
    targetCurrency?: string;
    
    /**
     * Formatted currency and amount to the locale based on acceptLanguage
     * 
     * Both amount and currency are formatted, String will show e.g. "€" in front of the amount
     * or "EUR" behind the amount depending on locale
     */
    targetValueFormatted?: string;
}
