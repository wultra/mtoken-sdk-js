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
export interface QROperation {
    
    /** Operation's identifier */
    operationId: string
    
    /** Title associated with the operation. */
    title: string
    
    /** Message associated with the operation */
    message: string
    
    /** Significant data fields associated with the operation */
    operationData: QROperationData
    
    /** Nonce for offline signature calculation, in Base64 format */
    nonce: string
    
    /** Flags associated with the operation */
    flags: QROperationFlags
    
    /** Additional Time-based one time password for proximity check */
    totp?: string
    
    /** Data for signature validation */
    signedData: Buffer
    
    /** ECDSA signature calculated from `signedData`. String is in Base64 format */
    signature: QROperationSignature
    
    /**
     * QR code uses a string in newer format that this class implements.
     * This flag may be used as warning, presented in UI
     */
    isNewerFormat: boolean
    
    // internal var dataForOfflineSigning: Data {
    //     if let totp = totp {
    //         return "\(operationId)&\(operationData.sourceString)&\(totp)".data(using: .utf8)!
    //     } else {
    //         return "\(operationId)&\(operationData.sourceString)".data(using: .utf8)!
    //     }
    // }
}

export interface QROperationFlags {
    /** If true, then 2FA signature with biometric factor can be used for operation confirmation.*/
    biometricsAllowed: boolean

    /** If confirm/reject buttons should be flipped in the UI. This can be useful to test users attention. */
    flipButtons: boolean,

    /** When the operation is considered a "potential fraud" on the server, a warning UI should be displayed to the user. */
    fraudWarning: boolean,

    /** Block confirmation when call is active. */
    blockWhenOnCall: boolean
}

export interface QROperationData {

    /** Version of form data */
    version: QROperationDataVersion

    /** Template identifier (0 .. 99 in v1) */
    templateId: Number

    /** Array with form fields. Version v1 supports up to 5 fields. */
    fields: QROperationDataField[]

    /** A whole line from which was this structure constructed. */
    sourceString: string
}

export enum QROperationDataVersion {
    /** First version of operation data */
    V1,
    /** Type representing all newer versions of operation data (for forward compatibility) */
    VX
}

export class QROperationDataVersionUtil {
    static parse(value: string): QROperationDataVersion {
        if (value == 'A') {
            return QROperationDataVersion.V1
        }
        return QROperationDataVersion.VX
    }
}

export enum QROperationDataFieldType {
    /** Empty field for optional and not used fields */
    EMPTY,
    /** Field is of type `AccountField` */
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

export interface QROperationDataField {
    type: QROperationDataFieldType
}

/** Amount with currency */
export class AmountField implements QROperationDataField {
    type = QROperationDataFieldType.AMOUNT
    amount: Number
    currency: string

    constructor(amount: Number, currency: string) {
        this.amount = amount
        this.currency = currency
    }
}

/** Account in IBAN format, with optional BIC */
export class AccountField implements QROperationDataField { 
    type = QROperationDataFieldType.ACCOUNT
    iban: string
    bic?: string

    constructor(iban: string, bic?: string) {
        this.iban = iban
        this.bic = bic
    }
}

/** Account in arbitrary textual format */
export class AnyAccountField implements QROperationDataField {
    type = QROperationDataFieldType.ANY_ACCOUNT
    account: string

    constructor(account: string) {
        this.account = account
    }
}

/** Date field */
export class DateField implements QROperationDataField {
    type = QROperationDataFieldType.DATE
    date: Date

    constructor(date: Date) {
        this.date = date
    }
}

/** Reference field */
export class ReferenceField implements QROperationDataField {
    type = QROperationDataFieldType.REFERENCE
    text: string

    constructor(text: string) {
        this.text = text
    }
}

/** Note Field */
export class NoteField implements QROperationDataField {
    type = QROperationDataFieldType.NOTE
    text: string

    constructor(text: string) {
        this.text = text
    }
}

/** Text Field */
export class TextField implements QROperationDataField {
    type = QROperationDataFieldType.TEXT
    text: String

    constructor(text: string) {
        this.text = text
    }
}

/**
 * Fallback for forward compatibility. If newer version of operation data
 * contains new field type, then this case can be used for it's representation.
 */
export class FallbackField implements QROperationDataField {
    type = QROperationDataFieldType.FALLBACK
    text: string
    rawType: string

    constructor(text: string, rawType: string) {
        this.text = text
        this.rawType = rawType
    }
}

/** Model class for offline QR operation signature. */
export interface QROperationSignature {

    /** Defines which key has been used for ECDSA signature calculation. */
    signingKey: SigningKey

    /** Raw signature data */
    signature: Buffer

    /** Signature in Base64 format */
    signatureString: String
}

/** Defines which key was used for ECDSA signature calculation */
export enum SigningKey {
    /** Master server key was used for ECDSA signature calculation */
    MASTER,

    /** Personalized server's private key was used for ECDSA signature calculation */
    PERSONALIZED
}

export class SigningKeyUtil {
    public static typeValue(signingKey: SigningKey): string {
        return signingKey == SigningKey.MASTER ? "0" : "1"
    }

    public static fromTypeValue(typeValue: string): SigningKey | undefined {
        switch (typeValue) {
            case "0": return SigningKey.MASTER
            case "1": return SigningKey.PERSONALIZED
            default: return undefined
        }
    }
}
