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

import { WMTSigningKeyUtil, type WMTQROperation, type WMTQROperationSignature, type WMTQROperationData, WMTQROperationDataVersionUtil, type WMTQROperationDataField, WMTQROperationDataFieldType, type WMTQROperationFlags, WMTDateField, WMTNoteField, WMTTextField, WMTAmountField, WMTAccountField, WMTFallbackField, WMTReferenceField, WMTAnyAccountField } from "./WMTQROperation"
import { WMTException } from "../WMTException"
import { Buffer } from "buffer"
import { WMTLogger } from "../WMTLogger"

/**
 * Parser for QR operation.
 */
export class WMTQROperationParser {

    // Minimum lines in input string supported by this parser.
    private static readonly minimumAttributeFields = 7

    // Current number of lines in input string, supported by this parser.
    private static readonly currentAttributeFields = 8

    // Maximum number of operation data fields supported in this version.
    private static readonly maximumDataFields = 6

    //private val dateFormatter = SimpleDateFormat("yyyyMMdd").also { it.isLenient = false }

    /**
     * Process loaded payload from a scanned offline QR.
     *
     * @param string String parsed from QR code.
     *
     * @throws MobileTokenException When there is no operation in provided string.
     * @return Parsed operation.
     */
    static parse(string: string): WMTQROperation {
        // Split string by newline
        const attributes = string.split("\n")

        if (attributes.length < this.minimumAttributeFields) {
            throw WMTLogger.errorAndException(`Offline operation: QR operation needs to have at least ${this.minimumAttributeFields} attributes but have ${attributes.length}`)
        }

        // Acquire all attributes
        const operationId = attributes[0]
        const title = this.parseAttributeText(attributes[1])
        const message = this.parseAttributeText(attributes[2])
        const dataString = attributes[3]
        const flagsString = attributes[4]
        const totp = attributes.length > this.minimumAttributeFields ? attributes[5] : undefined

        // Signature and nonce are always located at last lines
        const nonce = attributes[attributes.length - 2]
        const signatureString = attributes[attributes.length - 1]

        // Validate operationId
        if (operationId.length == 0) {
            throw WMTLogger.errorAndException("Offline operation: QR operation ID is empty!.")
        }

        const signature = this.parseSignature(signatureString)

        // validate nonce
        const nonceByteArray = Buffer.from(nonce, 'base64')
        if (nonceByteArray.length != 16) {
            throw WMTLogger.errorAndException("Offline operation: Invalid nonce data")
        }

        // Parse operation data fields
        const formData = this.parseOperationData(dataString)

        // Rebuild signed data, without pure signature string
        const signedData = string.substring(0, string.length - signature.signatureString.length)

        // Parse flags
        const flags = this.parseOperationFlags(flagsString)
        const isNewerFormat = attributes.length > this.currentAttributeFields

        return  {
            operationId: operationId,
            title: title, 
            message: message, 
            operationData: formData, 
            nonce: nonce, 
            flags: flags, 
            totp: totp, 
            signedData: signedData,
            signature: signature, 
            isNewerFormat: isNewerFormat
        }
    }

    private static parseAttributeText(text: string): string {
        if (text.includes("\\")) {
            return text.replace("\\n", "\n").replace("\\\\", "\\").replace("\\*", "\*")
        }
        return text
    }

    /**
     * Returns operation signature object if provided string contains valid key type and signature.
     */
    private static parseSignature(signaturePayload: string): WMTQROperationSignature {
        if (signaturePayload.length == 0) {
            throw WMTLogger.errorAndException("Empty offline operation signature")
        }
        const signingKey = WMTSigningKeyUtil.fromTypeValue(signaturePayload[0])
        if (signingKey == undefined) {
            throw WMTLogger.errorAndException("Invalid offline operation signature key")
        }
        const signatureBase64 = signaturePayload.substring(1)
        const signatureByteArray = Buffer.from(signatureBase64, 'base64')
        if (signatureByteArray.length < 64 || signatureByteArray.length > 255) {
            throw WMTLogger.errorAndException("Invalid offline operation signature data")
        }
        return {
            signingKey: signingKey, 
            signature: signatureByteArray, 
            signatureString: signatureBase64
        }
    }

    /**
     * Parses and translates input string into `QROperationFormData` structure.
     */
    private static parseOperationData(string: string): WMTQROperationData {
        const stringFields = this.splitOperationData(string)
        if (stringFields.length == 0) {
            throw WMTLogger.errorAndException("No fields at all in the offline operation data")
        }

        // Get and check version
        const versionString = stringFields[0]
        const versionChar = versionString[0]
        if (!!!versionChar) {
            throw WMTLogger.errorAndException("First fields is empty string in the offline operation data")
        }
        if (versionChar.charCodeAt(0) < 'A'.charCodeAt(0) || versionChar.charCodeAt(0) > 'Z'.charCodeAt(0)) { // TODO: is OK?
            throw WMTLogger.errorAndException("Offline operation: Version has to be an one capital letter")
        }
        const version = WMTQROperationDataVersionUtil.parse(versionChar)

        const templateId = Number(versionString.substring(1))

        if (!!!templateId) {
            throw WMTLogger.errorAndException("Offline operation: TemplateID is not an integer")
        }

        if (templateId < 0 || templateId > 99) {
            throw WMTLogger.errorAndException("OfflineOperation: TemplateID is out of range.")
        }

        // Parse operation data fields
        const fields = this.parseDataFields(stringFields)

        // Everything looks good, so build a final structure now...
        return { 
            version: version, 
            templateId: templateId, 
            fields: fields, 
            sourceString: string
        }
    }

    /**
     * Splits input string into array of strings, representing array of form fields.
     * It's expected that input string contains asterisk separated list of fields.
     */
    private static splitOperationData(string: string): string[] {
        // Split string by '*'
        const components = string.split("*")
        const fields: string[] = []
        // Handle escaped asterisk \* in array. This situation is easily detectable
        // by backslash at the end of the string.
        let appendNext = false
        components.forEach( substring => {
            if (appendNext) {
                // Previous string ended with backslash
                if (fields.length != 0) {
                    var prev = fields[fields.length -1]
                    // Remove backslash from last stored value and append this new sequence
                    prev = prev.substring(0, prev.length - 1)
                    prev = `${prev}*${substring}`
                    // Replace last element with updated string
                    fields[fields.length - 1] = prev
                }
            } else {
                // Just append this string into final array
                fields.push(substring)
            }
            // Check if current sequence ends with backslash
            appendNext = substring.length != 0 && substring[substring.length - 1] == '\\'
        })
        return fields
    }

    /**
     * Parses input string into array of Field enumerations.
     * Throws a `WMTException` error if the resulting operation parses out with too many fields.
     */
    private static parseDataFields(fields: string[]): WMTQROperationDataField[] {

        const result: WMTQROperationDataField[] = []

        fields.slice(1).forEach( stringField => {

            const typeId = stringField.length > 0 ? stringField[0] : undefined

            if (!!!typeId) {
                result.push({ type: WMTQROperationDataFieldType.EMPTY })
                return
            }

            switch (typeId) {
                // Amount
                case 'A': 
                    result.push(this.parseAmount(stringField))
                    break
                // IBAN
                case 'I': 
                    result.push(this.parseIban(stringField))
                    break
                // Any account
                case 'Q': 
                    result.push(new WMTAnyAccountField(this.parseFieldText(stringField)))
                    break
                // Date
                case 'D': 
                    result.push(this.parseDate(stringField))
                    break
                // Reference
                case 'R': 
                    result.push(new WMTReferenceField(this.parseFieldText(stringField)))
                    break
                // Note
                case 'N': 
                    result.push(new WMTNoteField(this.parseFieldText(stringField)))
                    break
                // Text (generic)
                case 'T': 
                    result.push(new WMTTextField(this.parseFieldText(stringField)))
                    break
                // Fallback
                default: 
                    result.push(new WMTFallbackField(this.parseFieldText(stringField), typeId))
                    break
            }
        })

        if (result.length > this.maximumDataFields) {
            throw WMTLogger.errorAndException("Offline operation: Too many fields")
        }
        return result
    }

    private static parseAmount(string: string): WMTAmountField {
        const value = string.substring(1)
        if (value.length < 4) {
            throw WMTLogger.errorAndException("Offline operation: Insufficient length for number+currency")
        }
        const currency = value.substring(value.length - 3).toUpperCase()
        const amountString = value.substring(0, value.length - 3)
        const amount = Number(amountString)
        if (Number.isNaN(amount)) {
            throw WMTLogger.errorAndException("Offline operation: Amount is not a number")
        }
        return new WMTAmountField(amount, currency)
    }

    // Parses IBAN[,BIC] into account field enumeration.
    private static parseIban(string: string): WMTAccountField {
        // Try to split IBAN to IBAN & BIC
        const ibanBic = string.substring(1)
        const components = ibanBic.split(",").filter(v => v.length != 0)
        if (components.length > 2 || components.length == 0) {
            throw WMTLogger.errorAndException("Offline operation: Unsupported format")
        }
        const iban = components[0]
        const bic = components.length > 1 ? components[1] : undefined
        const allowedChars = "01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        for (let i = 0; i < iban.length; i++) {
            const c = iban.charAt(i)
            if (!allowedChars.includes(c)) {
                throw new WMTException("Invalid character in IBAN")
            }
        }
        if (bic) {
            for (let i = 0; i < bic.length; i++) {
                const c = bic.charAt(i)
                if (!allowedChars.includes(c)) {
                    throw new WMTException("Invalid character in BIC")
                }
            }
        }
        return new WMTAccountField(iban, bic)
    }

    private static parseFieldText(string: string): string {
        const text = string.substring(1)
        if (text.includes("\\")) {
            // Replace escaped "\n" and "\\"
            return text.replace("\\n", "\n").replace("\\\\", "\\")
        }
        return text
    }

    private static parseDate(string: string): WMTDateField {
        const dateString = string.substring(1)
        
        if (dateString.length != 8) {
            throw WMTLogger.errorAndException("Offline operation: Date needs to be 8 characters long")
        }
        try {
            const year = Number(dateString.substring(0, 4))
            const month = Number(dateString.substring(4, 6))
            const day = Number(dateString.substring(6, 8))

            if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
                throw WMTLogger.errorAndException(`Offline operation: Year, month and day need to be integers. Year: ${year}, month: ${month}, day: ${day}`)
            }

            if (day < 1 || day > 31) {
                throw WMTLogger.errorAndException(`Offline operation: Day needs to be between 1 and 31. Day: ${day}`)
            }

            if (month < 1 || month > 12) {
                throw WMTLogger.errorAndException(`Offline operation: Month needs to be between 1 and 12. Month: ${month}`)
            }

            const date = new Date(year, month - 1, day)
            return new WMTDateField(date)
        } catch (e) {
            throw WMTLogger.errorAndException("Offline operation: Unparseable date")
        }
    }

    private static parseOperationFlags(string: string): WMTQROperationFlags {
        return { 
            biometricsAllowed: string.includes("B"), 
            flipButtons: string.includes("X"), 
            fraudWarning: string.includes("F"), 
            blockWhenOnCall: string.includes("C")
        }
    }
}
