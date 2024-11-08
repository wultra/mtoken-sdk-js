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

import { WMTAccountField, WMTAmountField, WMTDateField, WMTFallbackField, WMTNoteField, WMTQROperationDataFieldType, WMTQROperationDataVersion, WMTQROperationParser, type WMTQROperationSignature, WMTSigningKey, WMTTextField } from 'react-native-mtoken-sdk';
import { TestSuite } from './TestSuite';
import { Buffer } from "buffer";

export class TestSuite_QRParser extends TestSuite {

    /*
     * Main tests
     */
    
    testCurrentFormat() {

        const code = new TestQRData().makeData()

        const expectedSignedDataString = "5ff1b1ed-a3cc-45a3-8ab0-ed60950312b6\n" +
            "Payment\n" +
            "Please confirm this payment\n" +
            "A1*A100CZK*ICZ2730300000001165254011*D20180425*Thello world\n" +
            "BCFX\n" +
            "AD8bOO0Df73kNaIGb3Vmpg==\n" +
            "0";

        const expectedSignedData = Buffer.from(expectedSignedDataString, 'utf-8')

        const operation = WMTQROperationParser.parse(code)
        this.assertEquals("5ff1b1ed-a3cc-45a3-8ab0-ed60950312b6", operation.operationId)
        this.assertEquals("5ff1b1ed-a3cc-45a3-8ab0-ed60950312b6", operation.operationId)
        this.assertEquals("Payment", operation.title)
        this.assertEquals("Please confirm this payment", operation.message)
        this.assertTrue(operation.flags.biometricsAllowed, "biometrics allowed flag missing")
        this.assertTrue(operation.flags.blockWhenOnCall, "block when on call flag missing")
        this.assertTrue(operation.flags.flipButtons, "flip buttons flag missing")
        this.assertTrue(operation.flags.fraudWarning, "fraud warning flag missing")
        this.assertEquals("AD8bOO0Df73kNaIGb3Vmpg==", operation.nonce)
        this.assertEquals("MEYCIQDby1Uq+MaxiAAGzKmE/McHzNOUrvAP2qqGBvSgcdtyjgIhAMo1sgqNa1pPZTFBhhKvCKFLGDuHuTTYexdmHFjUUIJW", operation.signature.signatureString)
        this.assertEquals(WMTSigningKey.MASTER, operation.signature.signingKey)
        this.assertTrue(operation.signedData.equals(expectedSignedData as any), "Signed data does not equals")

        // Operation data
        this.assertEquals(WMTQROperationDataVersion.V1, operation.operationData.version)
        this.assertEquals(1, operation.operationData.templateId)
        this.assertEquals(4, operation.operationData.fields.length)
        this.assertEquals("A1*A100CZK*ICZ2730300000001165254011*D20180425*Thello world", operation.operationData.sourceString)

        const fields = operation.operationData.fields
        const f0 = fields[0] as WMTAmountField
        this.assertEquals(f0.type, WMTQROperationDataFieldType.AMOUNT)
        this.assertEquals(100, f0.amount)
        this.assertEquals("CZK", f0.currency)
        
        const f1 = fields[1] as WMTAccountField
        this.assertEquals(f1.type, WMTQROperationDataFieldType.ACCOUNT)
        this.assertEquals("CZ2730300000001165254011", f1.iban)
        this.assertEquals(null, f1.bic)
        
        const f2 = fields[2] as WMTDateField
        this.assertEquals(f2.type, WMTQROperationDataFieldType.DATE)
        this.assertEquals(f2.date.getTime(), new Date(2018, 3, 25).getTime())
        
        const f3 = fields[3] as WMTTextField
        this.assertEquals(f3.type, WMTQROperationDataFieldType.TEXT)
        this.assertEquals(f3.text, "hello world")
    }

    testForwardCompatibility() {
        const qrcode = new TestQRData()
        qrcode.operationData = "B2*Xtest"
        qrcode.otherAttrs = ["12345678", "Some Additional Information"]
        qrcode.flags = "B"

        const expectedSignedDataString = 
            "5ff1b1ed-a3cc-45a3-8ab0-ed60950312b6\n" +
            "Payment\n" +
            "Please confirm this payment\n" +
            "B2*Xtest\n" +
            "B\n" +
            "12345678\n" +
            "Some Additional Information\n" +
            "AD8bOO0Df73kNaIGb3Vmpg==\n" +
            "0"
        
        const expectedSignedData = Buffer.from(expectedSignedDataString, 'utf-8')

        const operation = WMTQROperationParser.parse(qrcode.makeData())

        this.assertTrue(operation.isNewerFormat)
        this.assertTrue(operation.signedData.equals(expectedSignedData as any), "Signed data does not equals")
        this.assertEquals(WMTQROperationDataVersion.VX, operation.operationData.version)
        this.assertEquals(1, operation.operationData.fields.length)
        const f = operation.operationData.fields[0] as WMTFallbackField
        this.assertEquals(f.type, WMTQROperationDataFieldType.FALLBACK)
        this.assertEquals("test", f.text)
    }

    /**
     * Missing or Bad attributes
     */

    testMissingOperationId() {
        const code = new TestQRData()
        code.operationId = ""
        this.assertThrow(() => WMTQROperationParser.parse(code.makeData()))
    }

    testMissingTitleOrMessage() {
        const code = new TestQRData()
        code.title = ""
        code.message = ""
        const operation = WMTQROperationParser.parse(code.makeData())
        this.assertEquals("", operation.title)
        this.assertEquals("", operation.message)
    }

    testMissingOrBadOperationDataVersion() {
        ["", "A", "2", "A100", "A-100"].forEach(data =>  {
            const code = new TestQRData()
            code.operationData = data
            this.assertThrow(() => WMTQROperationParser.parse(code.makeData()))
        })
    }

    testMissingFlags() {
        const code = new TestQRData()
        code.flags = ""
        const operation = WMTQROperationParser.parse(code.makeData())
        this.assertFalse(operation.flags.biometricsAllowed)
        this.assertFalse(operation.flags.blockWhenOnCall)
        this.assertFalse(operation.flags.flipButtons)
        this.assertFalse(operation.flags.fraudWarning)
    }

    testMissingOrBadNonce() {
        ["", "AAAA", "MEYCIQDby1Uq+MaxiAAGzKmE/McHzNOUrvAP2qqGBvSgcdtyjgIhAMo1sgqNa1pPZTFBhhKvCKFLGDuHuTTYexdmHFjUUIJW"].forEach( nonce => {
            const code = new TestQRData()
            code.nonce = nonce
            this.assertThrow(() => WMTQROperationParser.parse(code.makeData()))
        })
    }

    testMissingOrBadSignature() {
        const code = new TestQRData()
        code.signature = ""
        code.signingKey = ""
        this.assertThrow(() => WMTQROperationParser.parse(code.makeData()));
        
        ["", "AAAA", "AD8bOO0Df73kNaIGb3Vmpg=="].forEach( s => {
            const code = new TestQRData()
            code.signature = s
            this.assertThrow(() => WMTQROperationParser.parse(code.makeData()))
        });

        ["", "2", "X"].forEach( sk => {
            const code = new TestQRData()
            code.signingKey = sk
            this.assertThrow(() => WMTQROperationParser.parse(code.makeData()))
        })
    }

    /**
     * String escaping
     */

    testAttributeStringEscaping() {
        const code = new TestQRData()
        code.title = "Hello\\nWorld\\\\xyz"
        code.message = "Hello\\nWorld\\\\xyz\\*"
        const operation = WMTQROperationParser.parse(code.makeData())
        this.assertEquals("Hello\nWorld\\xyz", operation.title)
        this.assertEquals("Hello\nWorld\\xyz\*", operation.message)
    }

    testFieldStringEscaping() {

        const code = new TestQRData()
        code.operationData = "A1*Thello \\* asterisk*Nnew\\nline*Xback\\\\slash"
        const data = code.makeData()
        const operation = WMTQROperationParser.parse(data)

        this.assertEquals(3, operation.operationData.fields.length)

        const fields = operation.operationData.fields
        const f0 = fields[0] as WMTTextField
        this.assertEquals(f0.type, WMTQROperationDataFieldType.TEXT)
        this.assertEquals(f0.text, "hello * asterisk")
        
        const f1 = fields[1] as WMTNoteField
        this.assertEquals(f1.type, WMTQROperationDataFieldType.NOTE)
        this.assertEquals("new\nline", f1.text)

        const f2 = fields[2] as WMTFallbackField
        this.assertEquals(f2.type, WMTQROperationDataFieldType.FALLBACK)
        this.assertEquals("back\\slash", f2.text)
    }

    /**
     * Field types
     */

    testFieldAmount() {
        const valid = [
            ["A100CZK", Number("100"), "CZK"],
            ["A100.00EUR", Number("100.00"), "EUR"],
            ["A99.32USD", Number("99.32"), "USD"],
            ["A-50000.16GBP", Number("-50000.16"), "GBP"],
            ["A.325CZK", Number("0.325"), "CZK"]
        ]
        valid.forEach( it => {
            const code = new TestQRData()
            code.operationData = `A1*${it[0]}`
            const operation = WMTQROperationParser.parse(code.makeData())
            const field = operation.operationData.fields[0] as WMTAmountField
            this.assertEquals(field.type, WMTQROperationDataFieldType.AMOUNT) 
            this.assertEquals(it[1], field.amount)
            this.assertEquals(it[2], field.currency)
        });
        // Invalid
        ["ACZK", "A", "A0", "AxCZK"].forEach( it => {
            const code = new TestQRData()
            code.operationData = `A1*${it}`
            this.assertThrow(() => WMTQROperationParser.parse(code.makeData()))
        })
    }

    testFieldAccount() {
        const valid = [
            ["ISOMEIBAN1234,BIC", "SOMEIBAN1234", "BIC"],
            ["ISOMEIBAN", "SOMEIBAN", null],
            ["ISOMEIBAN,", "SOMEIBAN", null]
        ]
        valid.forEach( it => {
                const code = new TestQRData()
                code.operationData = `A1*${it[0]}`
                const operation = WMTQROperationParser.parse(code.makeData())
                const field = operation.operationData.fields[0] as WMTAccountField
                this.assertEquals(field.type, WMTQROperationDataFieldType.ACCOUNT)
                this.assertEquals(it[1], field.iban)
                this.assertEquals(it[2], field.bic)
        });
        // Invalid
        ["I", "Isomeiban,", "IGOODIBAN,badbic"].forEach( field => {
            const code = new TestQRData()
            code.operationData = `A1*${field}`
            this.assertThrow(() => WMTQROperationParser.parse(code.makeData()))
        })
    }

    testFieldDate() {
        // Invalid dates
        ["D", "D0", "D2004", "D20189999"].forEach( date => {
            const code = new TestQRData()
            code.operationData = `A1*${date}`
            this.assertThrow(() => { WMTQROperationParser.parse(code.makeData()) })
        })
    }

    testFieldEmpty() {

        const code = new TestQRData()
        code.operationData = "A1*A10CZK****Ttest"
        
        const operation = WMTQROperationParser.parse(code.makeData())
        const fields = operation.operationData.fields
        this.assertEquals(5, fields.length)
        this.assertEquals(fields[0].type, WMTQROperationDataFieldType.AMOUNT)
        this.assertEquals(fields[1].type, WMTQROperationDataFieldType.EMPTY)
        this.assertEquals(fields[2].type, WMTQROperationDataFieldType.EMPTY)
        this.assertEquals(fields[3].type, WMTQROperationDataFieldType.EMPTY)
        this.assertEquals(fields[4].type, WMTQROperationDataFieldType.TEXT)
    }
}

class TestQRData {
    
    operationId: string     = "5ff1b1ed-a3cc-45a3-8ab0-ed60950312b6"
    title: string           = "Payment"
    message: string         = "Please confirm this payment"
    operationData: string   = "A1*A100CZK*ICZ2730300000001165254011*D20180425*Thello world"
    flags: string           = "BCFX"
    otherAttrs: string[] | undefined = undefined
    nonce: string           = "AD8bOO0Df73kNaIGb3Vmpg=="
    signingKey: string      = "0"
    signature: string       = "MEYCIQDby1Uq+MaxiAAGzKmE/McHzNOUrvAP2qqGBvSgcdtyjgIhAMo1sgqNa1pPZTFBhhKvCKFLGDuHuTTYexdmHFjUUIJW"

    makeData(): string {
        let attrs = this.otherAttrs == null ? "" : this.otherAttrs.join("\n") + "\n"
        return `${this.operationId}\n${this.title}\n${this.message}\n${this.operationData}\n${this.flags}\n${attrs}${this.nonce}\n${this.signingKey}${this.signature}`
    }
}
