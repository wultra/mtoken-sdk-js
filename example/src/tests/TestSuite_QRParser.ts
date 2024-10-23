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

import { AccountField, AmountField, DateField, FallbackField, NoteField, QROperationDataFieldType, QROperationDataVersion, QROperationParser, type QROperationSignature, SigningKey, TextField } from 'react-native-mtoken-sdk';
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

        const operation = QROperationParser.parse(code)
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
        this.assertEquals(SigningKey.MASTER, operation.signature.signingKey)
        this.assertTrue(operation.signedData.equals(expectedSignedData as any), "Signed data does not equals")

        // Operation data
        this.assertEquals(QROperationDataVersion.V1, operation.operationData.version)
        this.assertEquals(1, operation.operationData.templateId)
        this.assertEquals(4, operation.operationData.fields.length)
        this.assertEquals("A1*A100CZK*ICZ2730300000001165254011*D20180425*Thello world", operation.operationData.sourceString)

        const fields = operation.operationData.fields
        const f0 = fields[0] as AmountField
        this.assertEquals(f0.type, QROperationDataFieldType.AMOUNT)
        this.assertEquals(100, f0.amount)
        this.assertEquals("CZK", f0.currency)
        
        const f1 = fields[1] as AccountField
        this.assertEquals(f1.type, QROperationDataFieldType.ACCOUNT)
        this.assertEquals("CZ2730300000001165254011", f1.iban)
        this.assertEquals(null, f1.bic)
        
        const f2 = fields[2] as DateField
        this.assertEquals(f2.type, QROperationDataFieldType.DATE)
        this.assertEquals(f2.date.getTime(), new Date(2018, 3, 25).getTime())
        
        const f3 = fields[3] as TextField
        this.assertEquals(f3.type, QROperationDataFieldType.TEXT)
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

        const operation = QROperationParser.parse(qrcode.makeData())

        this.assertTrue(operation.isNewerFormat)
        this.assertTrue(operation.signedData.equals(expectedSignedData as any), "Signed data does not equals")
        this.assertEquals(QROperationDataVersion.VX, operation.operationData.version)
        this.assertEquals(1, operation.operationData.fields.length)
        const f = operation.operationData.fields[0] as FallbackField
        this.assertEquals(f.type, QROperationDataFieldType.FALLBACK)
        this.assertEquals("test", f.text)
    }

    /**
     * Missing or Bad attributes
     */

    testMissingOperationId() {
        try {
            const code = new TestQRData()
            code.operationId = ""
            QROperationParser.parse(code.makeData())
            this.fail("Exception expected")
        } catch (e) {
            // expected
        }
    }

    testMissingTitleOrMessage() {
        const code = new TestQRData()
        code.title = ""
        code.message = ""
        const operation = QROperationParser.parse(code.makeData())
        this.assertEquals("", operation.title)
        this.assertEquals("", operation.message)
    }

    testMissingOrBadOperationDataVersion() {
        ["", "A", "2", "A100", "A-100"].forEach(data =>  {
            try {
                const code = new TestQRData()
                code.operationData = data
                QROperationParser.parse(code.makeData())
                this.fail(`Operation data ${data} should not be accepted`)
            } catch (e) {
                // expected
            }
        })
    }

    testMissingFlags() {
        const code = new TestQRData()
        code.flags = ""
        const operation = QROperationParser.parse(code.makeData())
        this.assertFalse(operation.flags.biometricsAllowed)
        this.assertFalse(operation.flags.blockWhenOnCall)
        this.assertFalse(operation.flags.flipButtons)
        this.assertFalse(operation.flags.fraudWarning)
    }

    testMissingOrBadNonce() {
        ["", "AAAA", "MEYCIQDby1Uq+MaxiAAGzKmE/McHzNOUrvAP2qqGBvSgcdtyjgIhAMo1sgqNa1pPZTFBhhKvCKFLGDuHuTTYexdmHFjUUIJW"].forEach( nonce => {
            try {
                const code = new TestQRData()
                code.nonce = nonce
                QROperationParser.parse(code.makeData())
                this.fail(`Nonce ${nonce} should not be accepted`)
            } catch (e) {
                // expected
            }
        })
    }

    testMissingOrBadSignature() {
        try {
            const code = new TestQRData()
            code.signature = ""
            code.signingKey = ""
            QROperationParser.parse(code.makeData())
            this.fail("This should not be parsed")
        } catch (e) {
            // expected
        }
        
        ["", "AAAA", "AD8bOO0Df73kNaIGb3Vmpg=="].forEach( s => {
            try {
                const code = new TestQRData()
                code.signature = s
                QROperationParser.parse(code.makeData())
                this.fail(`Signature ${s} should not be accepted`)
            } catch (e) {
                // expected
            }
        });

        ["", "2", "X"].forEach( sk => {
            try {
                const code = new TestQRData()
                code.signingKey = sk
                QROperationParser.parse(code.makeData())
                this.fail(`Signing key ${sk} should not be accepted`)
            } catch (e) {
                // expected
            }
        })
    }

    // /**
    //  * String escaping
    //  */

    testAttributeStringEscaping() {
        const code = new TestQRData()
        code.title = "Hello\\nWorld\\\\xyz"
        code.message = "Hello\\nWorld\\\\xyz\\*"
        const operation = QROperationParser.parse(code.makeData())
        this.assertEquals("Hello\nWorld\\xyz", operation.title)
        this.assertEquals("Hello\nWorld\\xyz\*", operation.message)
    }

    testFieldStringEscaping() {

        const code = new TestQRData()
        code.operationData = "A1*Thello \\* asterisk*Nnew\\nline*Xback\\\\slash"
        const data = code.makeData()
        const operation = QROperationParser.parse(data)

        this.assertEquals(3, operation.operationData.fields.length)

        const fields = operation.operationData.fields
        const f0 = fields[0] as TextField
        this.assertEquals(f0.type, QROperationDataFieldType.TEXT)
        this.assertEquals(f0.text, "hello * asterisk")
        
        const f1 = fields[1] as NoteField
        this.assertEquals(f1.type, QROperationDataFieldType.NOTE)
        this.assertEquals("new\nline", f1.text)

        const f2 = fields[2] as FallbackField
        this.assertEquals(f2.type, QROperationDataFieldType.FALLBACK)
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
            const operation = QROperationParser.parse(code.makeData())
            const field = operation.operationData.fields[0] as AmountField
            this.assertEquals(field.type, QROperationDataFieldType.AMOUNT) 
            this.assertEquals(it[1], field.amount)
            this.assertEquals(it[2], field.currency)
        });
        // Invalid
        ["ACZK", "A", "A0", "AxCZK"].forEach( it => {
            try {
                const code = new TestQRData()
                code.operationData = `A1*${it}`
                QROperationParser.parse(code.makeData())
                this.fail("This should not be parsed")
            } catch (e) {
                // expected
            }
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
                const operation = QROperationParser.parse(code.makeData())
                const field = operation.operationData.fields[0] as AccountField
                this.assertEquals(field.type, QROperationDataFieldType.ACCOUNT)
                this.assertEquals(it[1], field.iban)
                this.assertEquals(it[2], field.bic)
        });
        // Invalid
        ["I", "Isomeiban,", "IGOODIBAN,badbic"].forEach( field => {
            try {
                const code = new TestQRData()
                code.operationData = `A1*${field}`
                QROperationParser.parse(code.makeData())
                this.fail("This should not be parsed")
            } catch (e) {
                // expected
            }
        })
    }

    testFieldDate() {
        // Invalid dates
        ["D", "D0", "D2004", "D20189999"].forEach( date => {
            try {
                const code = new TestQRData()
                code.operationData = `A1*${date}`
                QROperationParser.parse(code.makeData())
                this.fail(`Date ${date} should not be accepted`)
            } catch (e) {
                // expected
            }
        })
    }

    testFieldEmpty() {

        const code = new TestQRData()
        code.operationData = "A1*A10CZK****Ttest"
        
        const operation = QROperationParser.parse(code.makeData())
        const fields = operation.operationData.fields
        this.assertEquals(5, fields.length)
        this.assertEquals(fields[0].type, QROperationDataFieldType.AMOUNT)
        this.assertEquals(fields[1].type, QROperationDataFieldType.EMPTY)
        this.assertEquals(fields[2].type, QROperationDataFieldType.EMPTY)
        this.assertEquals(fields[3].type, QROperationDataFieldType.EMPTY)
        this.assertEquals(fields[4].type, QROperationDataFieldType.TEXT)
    }
}

class TestQRData {
    
    operationId: string     = "5ff1b1ed-a3cc-45a3-8ab0-ed60950312b6"
    title: string           = "Payment"
    message: string         = "Please confirm this payment"
    operationData: string   = "A1*A100CZK*ICZ2730300000001165254011*D20180425*Thello world"
    flags: string           = "BCFX"
    otherAttrs: string[] | undefined   = undefined
    nonce: string           = "AD8bOO0Df73kNaIGb3Vmpg=="
    signingKey: string      = "0"
    signature: string       = "MEYCIQDby1Uq+MaxiAAGzKmE/McHzNOUrvAP2qqGBvSgcdtyjgIhAMo1sgqNa1pPZTFBhhKvCKFLGDuHuTTYexdmHFjUUIJW"

    makeData(): string {
        let attrs = this.otherAttrs == null ? "" : this.otherAttrs.join("\n") + "\n"
        return `${this.operationId}\n${this.title}\n${this.message}\n${this.operationData}\n${this.flags}\n${attrs}${this.nonce}\n${this.signingKey}${this.signature}`
    }
}
