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

/** The `QROperationData` contains data operation data parsed from QR code. */
export interface WMTQROperation {
    
    /** Operation's identifier */
    operationId: string
    
    /** Title associated with the operation. */
    title: string
    
    /** Message associated with the operation */
    message: string
    
    /** Significant data fields associated with the operation */
    operationData: WMTQROperationData
    
    /** Nonce for offline signature calculation, in Base64 format */
    nonce: string
    
    /** Flags associated with the operation */
    flags: WMTQROperationFlags
    
    /** Additional Time-based one time password for proximity check */
    totp?: string
    
    /** Data for signature validation */
    signedData: Buffer
    
    /** ECDSA signature calculated from `signedData`. String is in Base64 format */
    signature: WMTQROperationSignature
    
    /**
     * QR code uses a string in newer format that this class implements.
     * This flag may be used as warning, presented in UI
     */
    isNewerFormat: boolean
}

export interface WMTQROperationFlags {
    /** If true, then 2FA signature with biometric factor can be used for operation confirmation.*/
    biometricsAllowed: boolean

    /** If confirm/reject buttons should be flipped in the UI. This can be useful to test users attention. */
    flipButtons: boolean,

    /** When the operation is considered a "potential fraud" on the server, a warning UI should be displayed to the user. */
    fraudWarning: boolean,

    /** Block confirmation when call is active. */
    blockWhenOnCall: boolean
}

export interface WMTQROperationData {

    /** Version of form data */
    version: WMTQROperationDataVersion

    /** Template identifier (0 .. 99 in v1) */
    templateId: Number

    /** Array with form fields. Version v1 supports up to 5 fields. */
    fields: WMTQROperationDataField[]

    /** A whole line from which was this structure constructed. */
    sourceString: string
}

export enum WMTQROperationDataVersion {
    /** First version of operation data */
    V1,
    /** Type representing all newer versions of operation data (for forward compatibility) */
    VX
}

export class WMTQROperationDataVersionUtil {
    static parse(value: string): WMTQROperationDataVersion {
        if (value == 'A') {
            return WMTQROperationDataVersion.V1
        }
        return WMTQROperationDataVersion.VX
    }
}

export enum WMTQROperationDataFieldType {
    /** Empty field for optional and not used fields */
    EMPTY,
    /** Field is of type `AmountField` */
    AMOUNT,
    /** Field is of type `AccountField` */
    ACCOUNT,
    /** Field is of type `AnyAccountField` */
    ANY_ACCOUNT,
    /** Field is of type `DateField` */
    DATE,
    /** Field is of type `ReferenceField` */
    REFERENCE,
    /** Field is of type `NoteField` */
    NOTE,
    /** Field is of type TextField`` */
    TEXT,
    /** Field is of type `FallbackField` */
    FALLBACK
}

export interface WMTQROperationDataField {
    type: WMTQROperationDataFieldType
}

/** Amount with currency */
export class WMTAmountField implements WMTQROperationDataField {
    type = WMTQROperationDataFieldType.AMOUNT
    amount: Number
    currency: string

    constructor(amount: Number, currency: string) {
        this.amount = amount
        this.currency = currency
    }
}

/** Account in IBAN format, with optional BIC */
export class WMTAccountField implements WMTQROperationDataField { 
    type = WMTQROperationDataFieldType.ACCOUNT
    iban: string
    bic?: string

    constructor(iban: string, bic?: string) {
        this.iban = iban
        this.bic = bic
    }
}

/** Account in arbitrary textual format */
export class WMTAnyAccountField implements WMTQROperationDataField {
    type = WMTQROperationDataFieldType.ANY_ACCOUNT
    account: string

    constructor(account: string) {
        this.account = account
    }
}

/** Date field */
export class WMTDateField implements WMTQROperationDataField {
    type = WMTQROperationDataFieldType.DATE
    date: Date

    constructor(date: Date) {
        this.date = date
    }
}

/** Reference field */
export class WMTReferenceField implements WMTQROperationDataField {
    type = WMTQROperationDataFieldType.REFERENCE
    text: string

    constructor(text: string) {
        this.text = text
    }
}

/** Note Field */
export class WMTNoteField implements WMTQROperationDataField {
    type = WMTQROperationDataFieldType.NOTE
    text: string

    constructor(text: string) {
        this.text = text
    }
}

/** Text Field */
export class WMTTextField implements WMTQROperationDataField {
    type = WMTQROperationDataFieldType.TEXT
    text: String

    constructor(text: string) {
        this.text = text
    }
}

/**
 * Fallback for forward compatibility. If newer version of operation data
 * contains new field type, then this case can be used for it's representation.
 */
export class WMTFallbackField implements WMTQROperationDataField {
    type = WMTQROperationDataFieldType.FALLBACK
    text: string
    rawType: string

    constructor(text: string, rawType: string) {
        this.text = text
        this.rawType = rawType
    }
}

/** Model class for offline QR operation signature. */
export interface WMTQROperationSignature {

    /** Defines which key has been used for ECDSA signature calculation. */
    signingKey: WMTSigningKey

    /** Raw signature data */
    signature: Buffer

    /** Signature in Base64 format */
    signatureString: String
}

/** Defines which key was used for ECDSA signature calculation */
export enum WMTSigningKey {
    /** Master server key was used for ECDSA signature calculation */
    MASTER,

    /** Personalized server's private key was used for ECDSA signature calculation */
    PERSONALIZED
}

export class WMTSigningKeyUtil {
    
    public static typeValue(signingKey: WMTSigningKey): string {
        return signingKey == WMTSigningKey.MASTER ? "0" : "1"
    }

    public static fromTypeValue(typeValue: string): WMTSigningKey | undefined {
        switch (typeValue) {
            case "0": return WMTSigningKey.MASTER
            case "1": return WMTSigningKey.PERSONALIZED
            default: return undefined
        }
    }
}
