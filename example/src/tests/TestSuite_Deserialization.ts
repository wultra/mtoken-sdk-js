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

import type {  MobileTokenResponse, UserOperation, OperationAttributeAmount, OperationAttributeKeyValue, OperationAttributeNote, OperationAttributeAmountConversion, OperationAttributeImage, OperationAttributeHeading } from 'react-native-mtoken-sdk';
import { AttributeType } from 'react-native-mtoken-sdk';
import { TestSuite } from './TestSuite';

export class TestSuite_Deserialization extends TestSuite {
    
    testEmptyList() {
        const json = "{\"status\":\"OK\",\"responseObject\":[]}"
        const object = JSON.parse(json) as MobileTokenResponse<UserOperation[]>
        this.assertEquals(object.status, "OK", "Empty list deserialization failed")
        this.assertEquals(object.responseObject?.length, 0, "Empty list deserialization failed")
    }

    testRealDataNoAttributes() {
        const json = `{ "status": "OK", "responseObject": [ { "id": "8eebd926-40d4-4214-8208-307f01b0b68f", "name": "authorize_payment", "data": "A1*A100CZK*Q238400856/0300**D20170629*NUtility Bill Payment - 05/2017", "operationCreated": "2018-06-21T13:41:41+0000", "operationExpires": "2018-06-21T13:46:45+0000", "allowedSignatureType": { "type": "2FA", "variants": [ "possession_knowledge", "possession_biometry" ] }, "formData": { "title": "Confirm Payment", "message": "Hello,\\nplease confirm following payment:", "attributes": [ ] } } ] }`
        const response = JSON.parse(json) as MobileTokenResponse<UserOperation[]>
        this.assertNotNull(response)
        this.assertEquals("OK", response.status)
        this.assertEquals(1, response.responseObject!!!.length)
        const operation = response.responseObject!!![0]
        this.assertEquals(0, operation.formData.attributes.length)
    }

    testRealData() {
        const json = `{ "status": "OK", "responseObject": [ { "id": "8eebd926-40d4-4214-8208-307f01b0b68f", "name": "authorize_payment", "data": "A1*A100CZK*Q238400856/0300**D20170629*NUtility Bill Payment - 05/2017", "operationCreated": "2018-06-21T13:41:41+0000", "operationExpires": "2018-06-21T13:46:45+0000", "allowedSignatureType": { "type": "2FA", "variants": [ "possession_knowledge", "possession_biometry" ] }, "formData": { "title": "Confirm Payment", "message": "Hello,\\nplease confirm following payment:", "attributes": [ { "type": "AMOUNT", "id": "operation.amount", "label": "Amount", "amount": 100, "currency": "CZK" }, { "type": "KEY_VALUE", "id": "operation.account", "label": "To Account", "value": "238400856/0300" }, { "type": "KEY_VALUE", "id": "operation.dueDate", "label": "Due Date", "value": "Jun 29, 2017" }, { "type": "NOTE", "id": "operation.note", "label": "Note", "note": "Utility Bill Payment - 05/2017" } ] } } ] }`
        const response = JSON.parse(json) as MobileTokenResponse<UserOperation[]>
        this.assertNotNull(response)
        this.assertEquals("OK", response.status)
        this.assertEquals(1, response.responseObject!!!.length)
        const operation = response.responseObject!!![0]
        this.assertEquals(4, operation.formData.attributes.length)
        const amountAttr = operation.formData.attributes[0] as OperationAttributeAmount
        this.assertEquals(100, amountAttr.amount)
    }

    testRealData2() {
        const json = `{"status":"OK","currentTimestamp":"2023-02-10T12:30:42+0000","responseObject":[{"id":"930febe7-f350-419a-8bc0-c8883e7f71e3","name":"authorize_payment","data":"A1*A100CZK*Q238400856/0300**D20170629*NUtility Bill Payment - 05/2017","operationCreated":"2018-08-08T12:30:42+0000","operationExpires":"2018-08-08T12:35:43+0000","allowedSignatureType":{"type":"2FA","variants":["possession_knowledge", "possession_biometry"]},"formData":{"title":"Potvrzení platby","message":"Dobrý den,prosíme o potvrzení následující platby:","attributes":[{"type":"AMOUNT","id":"operation.amount","label":"Částka","amount":965165234082.23,"currency":"CZK","valueFormatted": "965165234082.23 CZK"},{"type":"KEY_VALUE","id":"operation.account","label":"Na účet","value":"238400856/0300"},{"type":"KEY_VALUE","id":"operation.dueDate","label":"Datum splatnosti","value":"29.6.2017"},{"type":"NOTE","id":"operation.note","label":"Poznámka","note":"Utility Bill Payment - 05/2017"},{"type":"PARTY_INFO","id":"operation.partyInfo","label":"Application","partyInfo":{"logoUrl":"http://whywander.com/wp-content/uploads/2017/05/prague_hero-100x100.jpg","name":"Tesco","description":"Objevte více příběhů psaných s chutí","websiteUrl":"https://itesco.cz/hello/vse-o-jidle/pribehy-psane-s-chuti/clanek/tomovy-burgery-pro-zapalene-fanousky/15012"}},{ "type": "AMOUNT_CONVERSION", "id": "operation.conversion", "label": "Conversion", "dynamic": true, "sourceAmount": 1.26, "sourceCurrency": "ETC", "sourceAmountFormatted": "1.26", "sourceCurrencyFormatted": "ETC", "sourceValueFormatted": "1.26 ETC", "targetAmount": 1710.98, "targetCurrency": "USD", "targetAmountFormatted": "1,710.98", "targetCurrencyFormatted": "USD", "targetValueFormatted": "1,710.98 USD"},{ "type": "IMAGE", "id": "operation.image", "label": "Image", "thumbnailUrl": "https://example.com/123_thumb.jpeg", "originalUrl": "https://example.com/123.jpeg" },{ "type": "IMAGE", "id": "operation.image", "label": "Image", "thumbnailUrl": "https://example.com/123_thumb.jpeg" },{ "type": "IMAGE", "id": "operation.image", "label": "Image", "thumbnailUrl": "https://example.com/123_thumb.jpeg", "originalUrl": 12345 }]}},{"id":"930febe7-f350-419a-8bc0-c8883e7f71e3","name":"authorize_payment","data":"A1*A100CZK*Q238400856/0300**D20170629*NUtility Bill Payment - 05/2017","operationCreated":"2018-08-08T12:30:42+0000","operationExpires":"2018-08-08T12:35:43+0000","allowedSignatureType":{"type":"1FA","variants":["possession_knowledge"]},"formData":{"title":"Potvrzení platby","message":"Dobrý den,prosíme o potvrzení následující platby:","attributes":[{"type":"AMOUNT","id":"operation.amount","label":"Částka","amount":100,"currency":"CZK"},{"type":"KEY_VALUE","id":"operation.account","label":"Na účet","value":"238400856/0300"},{"type":"KEY_VALUE","id":"operation.dueDate","label":"Datum splatnosti","value":"29.6.2017"},{"type":"NOTE","id":"operation.note","label":"Poznámka","note":"Utility Bill Payment - 05/2017"}]}}]}`
        const response = JSON.parse(json) as MobileTokenResponse<UserOperation[]>
        this.assertNotNull(response)
        this.assertEquals("OK", response.status)
        this.assertEquals(2, response.responseObject!!!.length)
        const operation = response.responseObject!!![0]
        this.assertEquals(9, operation.formData.attributes.length)

        const amountAttr = operation.formData.attributes[0] as OperationAttributeAmount
        this.assertEquals(AttributeType.AMOUNT, amountAttr.type)
        this.assertEquals("operation.amount", amountAttr.id)
        this.assertEquals("Částka", amountAttr.label)
        this.assertEquals(965165234082.23, amountAttr.amount)
        this.assertEquals("CZK", amountAttr.currency)
        this.assertEquals("965165234082.23 CZK", amountAttr.valueFormatted)
        this.assertNull(amountAttr.amountFormatted)
        this.assertNull(amountAttr.currencyFormatted)

        const kva = operation.formData.attributes[1] as OperationAttributeKeyValue
        this.assertEquals(AttributeType.KEY_VALUE, kva.type)
        this.assertEquals("operation.account", kva.id)
        this.assertEquals("Na účet", kva.label)
        this.assertEquals("238400856/0300", kva.value)

        const na = operation.formData.attributes[3] as OperationAttributeNote
        this.assertEquals(AttributeType.NOTE, na.type)
        this.assertEquals("operation.note", na.id)
        this.assertEquals("Poznámka", na.label)
        this.assertEquals("Utility Bill Payment - 05/2017", na.note)

        // unsupported party info attribute
        const pia = operation.formData.attributes[4]
        this.assertEquals("PARTY_INFO", pia.type)
        this.assertEquals("operation.partyInfo", pia.id)
        this.assertEquals("Application", pia.label)

        const ca = operation.formData.attributes[5] as OperationAttributeAmountConversion
        this.assertEquals(AttributeType.AMOUNT_CONVERSION, ca.type)
        this.assertEquals("operation.conversion", ca.id)
        this.assertEquals("Conversion", ca.label)
        this.assertTrue(ca.dynamic)
        this.assertEquals(ca.sourceAmount, 1.26)
        this.assertEquals(ca.sourceCurrency, "ETC")
        this.assertEquals(ca.sourceAmountFormatted, "1.26")
        this.assertEquals(ca.sourceCurrencyFormatted, "ETC")
        this.assertEquals(ca.sourceValueFormatted, "1.26 ETC")
        this.assertEquals(ca.targetAmount, 1710.98)
        this.assertEquals(ca.targetCurrency, "USD")
        this.assertEquals(ca.targetAmountFormatted, "1,710.98")
        this.assertEquals(ca.targetCurrencyFormatted, "USD")
        this.assertEquals(ca.targetValueFormatted, "1,710.98 USD")

        const ia = operation.formData.attributes[6] as OperationAttributeImage
        this.assertEquals(AttributeType.IMAGE, ia.type)
        this.assertEquals("operation.image", ia.id)
        this.assertEquals("Image", ia.label)
        this.assertEquals("https://example.com/123_thumb.jpeg", ia.thumbnailUrl)
        this.assertEquals("https://example.com/123.jpeg", ia.originalUrl)

        const ia2 = operation.formData.attributes[7] as OperationAttributeImage
        this.assertEquals(AttributeType.IMAGE, ia2.type)
        this.assertEquals("operation.image", ia2.id)
        this.assertEquals("Image", ia2.label)
        this.assertEquals("https://example.com/123_thumb.jpeg", ia2.thumbnailUrl)
        this.assertEquals(null, ia2.originalUrl)

        const ia3 = operation.formData.attributes[8] as OperationAttributeImage
        this.assertEquals(AttributeType.IMAGE, ia3.type)
        this.assertEquals("operation.image", ia3.id)
        this.assertEquals("Image", ia3.label)
        this.assertEquals("https://example.com/123_thumb.jpeg", ia3.thumbnailUrl)
        // we do not sanitize JSON input so anything can be inside the url (we're testing a wrong type here - number instead of string)
        this.assertEquals(12345, ia3.originalUrl)
    }

    testAmountConversionAttributesResponseWithOnlyAmountFormattedAndCurrencyFormatted() {

        const json = `{"status":"OK", "currentTimestamp":"2023-02-10T12:30:42+0000", "responseObject":[{"id":"930febe7-f350-419a-8bc0-c8883e7f71e3", "name":"authorize_payment", "data":"A1*A100CZK*Q238400856/0300**D20170629*NUtility Bill Payment - 05/2017", "operationCreated":"2018-08-08T12:30:42+0000", "operationExpires":"2018-08-08T12:35:43+0000", "allowedSignatureType": {"type":"2FA", "variants": ["possession_knowledge", "possession_biometry"]}, "formData": {"title":"Potvrzení platby", "message":"Dobrý den,prosíme o potvrzení následující platby:", "attributes": [{"type":"AMOUNT", "id":"operation.amount", "label":"Částka", "amountFormatted":"965165234082.23", "currencyFormatted":"CZK"}, { "type": "AMOUNT_CONVERSION", "id": "operation.conversion", "label": "Conversion", "dynamic": true, "sourceAmountFormatted": "1.26", "sourceCurrencyFormatted": "ETC", "targetAmountFormatted": "1710.98", "targetCurrencyFormatted": "USD"}]}}]}`

        const response = JSON.parse(json) as MobileTokenResponse<UserOperation[]>
        this.assertNotNull(response)

        const amountAttr = response.responseObject!!![0].formData.attributes[0] as OperationAttributeAmount
        this.assertNull(amountAttr.amount)
        this.assertNull(amountAttr.currency)
        this.assertEquals("965165234082.23", amountAttr.amountFormatted)
        this.assertEquals("CZK", amountAttr.currencyFormatted)

        const conversionAttr = response.responseObject!!![0].formData.attributes[1] as OperationAttributeAmountConversion
        this.assertNull(conversionAttr.sourceAmount)
        this.assertNull(conversionAttr.sourceCurrency)
        this.assertNull(conversionAttr.targetAmount)
        this.assertNull(conversionAttr.targetCurrency)

        this.assertEquals("1.26", conversionAttr.sourceAmountFormatted)
        this.assertEquals("ETC", conversionAttr.sourceCurrencyFormatted)
        this.assertEquals("1710.98", conversionAttr.targetAmountFormatted)
        this.assertEquals("USD", conversionAttr.targetCurrencyFormatted)
    }

    testUnknownAttribute() {
        const json = `{"status":"OK","responseObject":[{"id":"930febe7-f350-419a-8bc0-c8883e7f71e3","name":"authorize_payment","data":"A1*A100CZK*Q238400856/0300**D20170629*NUtility Bill Payment - 05/2017","operationCreated":"2018-08-08T12:30:42+0000","operationExpires":"2018-08-08T12:35:43+0000","allowedSignatureType":{"type":"2FA","variants":["possession_knowledge", "possession_biometry"]},"formData":{"title":"Potvrzení platby","message":"Dobrý den,prosíme o potvrzení následující platby:","attributes":[{"type":"THIS_IS_FAKE_ATTR","id":"operation.amount","label":"Částka","amount":965165234082.23,"currency":"CZK","valueFormatted":"965165234082.23 CZK"},{"type":"KEY_VALUE","id":"operation.account","label":"Na účet","value":"238400856/0300"}]}}]}`
        const response = JSON.parse(json) as MobileTokenResponse<UserOperation[]>
        this.assertNotNull(response)
        this.assertEquals(1, response.responseObject!!!.length)
        this.assertEquals(2, response.responseObject!!![0].formData.attributes.length)
        this.assertEquals("THIS_IS_FAKE_ATTR", response.responseObject!!![0].formData.attributes[0].type)
    }

    testHistoryResponse() {
        const json =`{ "status":"OK", "responseObject":[ { "id":"0775afb2-4f06-4ed9-b990-a35bab4cac3b", "name":"login-tpp", "data":"A2*R666*R123", "status":"PENDING", "operationCreated":"2021-08-09T15:32:24+0000", "operationExpires":"2021-08-09T15:37:24+0000", "allowedSignatureType":{ "type":"2FA", "variants":[ "possession_knowledge", "possession_biometry" ] }, "formData":{ "title":"Login Approval", "message":"Are you logging in to the third party application?", "attributes":[ { "type":"KEY_VALUE", "id":"party.name", "label":"Third Party App", "value":"Datová schránka" }, { "type":"KEY_VALUE", "id":"party.id", "label":"Application ID", "value":"666" }, { "type":"KEY_VALUE", "id":"session.id", "label":"Session ID", "value":"123" }, { "type":"KEY_VALUE", "id":"session.ip-address", "label":"IP Address", "value":"192.168.0.1" } ] } }, { "id":"5bbe1d48-d2f0-43fb-8612-75917a9761fb", "name":"login-tpp", "data":"A2*R666*R123", "status":"REJECTED", "operationCreated":"2021-08-09T15:32:15+0000", "operationExpires":"2021-08-09T15:37:15+0000", "allowedSignatureType":{ "type":"2FA", "variants":[ "possession_knowledge", "possession_biometry" ] }, "formData":{ "title":"Login Approval", "message":"Are you logging in to the third party application?", "attributes":[ { "type":"KEY_VALUE", "id":"party.name", "label":"Third Party App", "value":"Datová schránka" }, { "type":"KEY_VALUE", "id":"party.id", "label":"Application ID", "value":"666" }, { "type":"KEY_VALUE", "id":"session.id", "label":"Session ID", "value":"123" }, { "type":"KEY_VALUE", "id":"session.ip-address", "label":"IP Address", "value":"192.168.0.1" } ] } }, { "id":"8bbff7b6-03c4-470c-9320-4660c3bf1f01", "name":"login-tpp", "data":"A2*R666*R123", "status":"APPROVED", "operationCreated":"2021-08-09T15:31:55+0000", "operationExpires":"2021-08-09T15:36:55+0000", "allowedSignatureType":{ "type":"2FA", "variants":[ "possession_knowledge", "possession_biometry" ] }, "formData":{ "title":"Login Approval", "message":"Are you logging in to the third party application?", "attributes":[ { "type":"KEY_VALUE", "id":"party.name", "label":"Third Party App", "value":"Datová schránka" }, { "type":"KEY_VALUE", "id":"party.id", "label":"Application ID", "value":"666" }, { "type":"KEY_VALUE", "id":"session.id", "label":"Session ID", "value":"123" }, { "type":"KEY_VALUE", "id":"session.ip-address", "label":"IP Address", "value":"192.168.0.1" } ] } }, { "id":"8bbff7b6-03c4-470c-9320-4660c3bf1f01", "name":"login-tpp", "data":"A2*R666*R123", "status":"CANCELED", "operationCreated":"2021-08-09T15:31:55+0000", "operationExpires":"2021-08-09T15:36:55+0000", "allowedSignatureType":{ "type":"2FA", "variants":[ "possession_knowledge", "possession_biometry" ] }, "formData":{ "title":"Login Approval", "message":"Are you logging in to the third party application?", "attributes":[ { "type":"KEY_VALUE", "id":"party.name", "label":"Third Party App", "value":"Datová schránka" }, { "type":"KEY_VALUE", "id":"party.id", "label":"Application ID", "value":"666" }, { "type":"KEY_VALUE", "id":"session.id", "label":"Session ID", "value":"123" }, { "type":"KEY_VALUE", "id":"session.ip-address", "label":"IP Address", "value":"192.168.0.1" } ] } }, { "id":"8bbff7b6-03c4-470c-9320-4660c3bf1f01", "name":"login-tpp", "data":"A2*R666*R123", "status":"EXPIRED", "operationCreated":"2021-08-09T15:31:55+0000", "operationExpires":"2021-08-09T15:36:55+0000", "allowedSignatureType":{ "type":"2FA", "variants":[ "possession_knowledge", "possession_biometry" ] }, "formData":{ "title":"Login Approval", "message":"Are you logging in to the third party application?", "attributes":[ { "type":"KEY_VALUE", "id":"party.name", "label":"Third Party App", "value":"Datová schránka" }, { "type":"KEY_VALUE", "id":"party.id", "label":"Application ID", "value":"666" }, { "type":"KEY_VALUE", "id":"session.id", "label":"Session ID", "value":"123" }, { "type":"KEY_VALUE", "id":"session.ip-address", "label":"IP Address", "value":"192.168.0.1" } ] } }, { "id":"8bbff7b6-03c4-470c-9320-4660c3bf1f01", "name":"login-tpp", "data":"A2*R666*R123", "status":"FAILED", "operationCreated":"2021-08-09T15:31:55+0000", "operationExpires":"2021-08-09T15:36:55+0000", "allowedSignatureType":{ "type":"2FA", "variants":[ "possession_knowledge", "possession_biometry" ] }, "formData":{ "title":"Login Approval", "message":"Are you logging in to the third party application?", "attributes":[ { "type":"KEY_VALUE", "id":"party.name", "label":"Third Party App", "value":"Datová schránka" }, { "type":"KEY_VALUE", "id":"party.id", "label":"Application ID", "value":"666" }, { "type":"KEY_VALUE", "id":"session.id", "label":"Session ID", "value":"123" }, { "type":"KEY_VALUE", "id":"session.ip-address", "label":"IP Address", "value":"192.168.0.1" } ] } } ] }`
        const response = JSON.parse(json) as MobileTokenResponse<UserOperation[]>

        response.responseObject!!!.forEach(operation => {
            this.assertNotNull(operation.status)
        })
    }

    testResultTexts() {

        const json = `{"status":"OK", "currentTimestamp":"2023-02-10T12:30:42+0000", "responseObject":[{"id":"930febe7-f350-419a-8bc0-c8883e7f71e3", "name":"authorize_payment", "data":"A1*A100CZK*Q238400856/0300**D20170629*NUtility Bill Payment - 05/2017", "operationCreated":"2018-08-08T12:30:42+0000", "operationExpires":"2018-08-08T12:35:43+0000", "allowedSignatureType": {"type":"2FA", "variants": ["possession_knowledge", "possession_biometry"]}, "formData": {"title":"Potvrzení platby", "message":"Dobrý den,prosíme o potvrzení následující platby:", "attributes": [{"type":"AMOUNT", "id":"operation.amount", "label":"Částka", "currency":"CZK"}, { "type": "AMOUNT_CONVERSION", "id": "operation.conversion", "label": "Conversion", "dynamic": true, "sourceAmount": 1.26, "sourceCurrency": "ETC", "targetAmount": 1710.98, "targetCurrency": "USD"}]}}, {"id":"930febe7-f350-419a-8bc0-c8883e7f71e3", "name":"authorize_payment", "data":"A1*A100CZK*Q238400856/0300**D20170629*NUtility Bill Payment - 05/2017", "operationCreated":"2018-08-08T12:30:42+0000", "operationExpires":"2018-08-08T12:35:43+0000", "allowedSignatureType": {"type":"2FA", "variants": ["possession_knowledge", "possession_biometry"]}, "formData": {"title":"Potvrzení platby", "message":"Dobrý den,prosíme o potvrzení následující platby:", "resultTexts": {"success": "Payment of was confirmed"}, "attributes": [{"type":"AMOUNT", "id":"operation.amount", "label":"Částka", "currency":"CZK"}, { "type": "AMOUNT_CONVERSION", "id": "operation.conversion", "label": "Conversion", "dynamic": true, "sourceAmount": 1.26, "sourceCurrency": "ETC", "targetAmount": 1710.98, "targetCurrency": "USD"}]}}, {"id":"930febe7-f350-419a-8bc0-c8883e7f71e3", "name":"authorize_payment", "data":"A1*A100CZK*Q238400856/0300**D20170629*NUtility Bill Payment - 05/2017", "operationCreated":"2018-08-08T12:30:42+0000", "operationExpires":"2018-08-08T12:35:43+0000", "allowedSignatureType": {"type":"2FA", "variants": ["possession_knowledge", "possession_biometry"]}, "formData": {"title":"Potvrzení platby", "message":"Dobrý den,prosíme o potvrzení následující platby:", "resultTexts": {"success": "Payment of was confirmed", "reject": "Payment was rejected", "failure": "Payment approval failed"},"attributes": [{"type":"AMOUNT", "id":"operation.amount", "label":"Částka", "currency":"CZK"}, { "type": "AMOUNT_CONVERSION", "id": "operation.conversion", "label": "Conversion", "dynamic": true, "sourceAmount": 1.26, "sourceCurrency": "ETC", "targetAmount": 1710.98, "targetCurrency": "USD"}]}}]}`
        const response = JSON.parse(json) as MobileTokenResponse<UserOperation[]>

        const responseObject = response.responseObject!!!
        this.assertNotNull(responseObject, "Response object is null")

        this.assertNull(responseObject[0].formData.resultTexts)

        const resultTexts1 = responseObject[1].formData.resultTexts
        this.assertNotNull(resultTexts1, "Failed to get resultTexts1")
        this.assertEquals(resultTexts1?.success, "Payment of was confirmed")
        this.assertNull(resultTexts1?.reject)
        this.assertNull(resultTexts1?.failure)

        const resultTexts2 = responseObject[2].formData.resultTexts
        this.assertNotNull(resultTexts2, "Failed to get resultTexts2")
        this.assertEquals(resultTexts2?.success, "Payment of was confirmed")
        this.assertEquals(resultTexts2?.reject, "Payment was rejected")
        this.assertEquals(resultTexts2?.failure, "Payment approval failed")
    }
}
