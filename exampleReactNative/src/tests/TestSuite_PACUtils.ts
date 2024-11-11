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

import { WMTPACUtils  } from 'react-native-mtoken-sdk';
import { TestSuite } from './TestSuite';

export class TestSuite_PACUtils extends TestSuite {
    
    testParseQRCodeWithEmptyCode() {
        const code = ""
        this.assertThrow(() => WMTPACUtils.parseQRCode(code))
    }

    testQRPACParserWithShortInvalidCode() {
        const code = "abc"
        this.assertThrow(() => WMTPACUtils.parseQRCode(code))
    }

    testQRTPACParserWithValidDeeplinkCode() {
        const code = "scheme://operation?oid=6a1cb007-ff75-4f40-a21b-0b546f0f6cad&potp=73743194"
        const parsed = WMTPACUtils.parseQRCode(code)
        this.assertEquals("73743194", parsed?.potp, "Parsing of potp")
        this.assertEquals("6a1cb007-ff75-4f40-a21b-0b546f0f6cad", parsed?.oid, "Parsing of operationId")
    }

    testQRTPACParserWithValidDeeplinkCodeAndBase64EncodedOID() {
        const code = "scheme://operation?oid=E%2F%2BDRFVmd4iZABEiM0RVZneImQARIjNEVWZ3iJkAESIzRFVmd4iZAA%3D&totp=12345678"
        const parsed = WMTPACUtils.parseQRCode(code)
        this.assertEquals("12345678", parsed?.potp, "Parsing of totp")
        this.assertEquals("E/+DRFVmd4iZABEiM0RVZneImQARIjNEVWZ3iJkAESIzRFVmd4iZAA=", parsed?.oid, "Parsing of operationId")
    }

    testQRPACParserWithValidJWT() {
        const code = "eyJhbGciOiJub25lIiwidHlwZSI6IkpXVCJ9.eyJvaWQiOiIzYjllZGZkMi00ZDgyLTQ3N2MtYjRiMy0yMGZhNWM5OWM5OTMiLCJwb3RwIjoiMTQzNTc0NTgifQ=="
        const parsed = WMTPACUtils.parseQRCode(code)
        this.assertEquals("14357458", parsed?.potp, "Parsing of totp")
        this.assertEquals("3b9edfd2-4d82-477c-b4b3-20fa5c99c993", parsed?.oid, "Parsing of operationId")
    }

    testQRPACParserWithValidJWTWithoutPadding() {
        const code = "eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJvaWQiOiJMRG5JY0NjRGhjRHdHNVNLejhLeWdQeG9PbXh3dHpJc29zMEUrSFBYUHlvIiwicG90cCI6IjU4NTkwMDU5In0"
        const parsed = WMTPACUtils.parseQRCode(code)
        this.assertEquals("58590059", parsed?.potp, "Parsing of totp")
        this.assertEquals("LDnIcCcDhcDwG5SKz8KygPxoOmxwtzIsos0E+HPXPyo", parsed?.oid, "Parsing of operationId")
    }

    testQRPACParserWithInvalidJWT() {
        this.assertThrow(() => WMTPACUtils.parseQRCode("eyJhbGciOiJub25lIiwidHlwZSI6IkpXVCJ9eyJvaWQiOiIzYjllZGZkMi00ZDgyLTQ3N2MtYjRiMy0yMGZhNWM5OWM5OTMiLCJwb3RwIjoiMTQzNTc0NTgifQ=="))
    }

    testQRPACParserWithInvalidJWT2() {
        this.assertThrow(() => WMTPACUtils.parseQRCode("eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.1eyJvaWQiOiJMRG5JY0NjRGhjRHdHNVNLejhLeWdQeG9PbXh3dHpJc29zMEUrSFBYUHlvIiwicG90cCI6IjU4NTkwMDU5In0"))
    }

    testQRPACParserWithInvalidJWT3() {
        this.assertThrow(() => WMTPACUtils.parseQRCode(""))
    }

    testQRPACParserWithInvalidJWT4() {
        this.assertThrow(() => WMTPACUtils.parseQRCode("eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.1eyJvaWQiOiJMRG5JY0NjR.GhjRHdHNVNLejhLeWdQeG9PbXh3dHpJc29zMEUrSFBYUHlvIiwicG90cCI6IjU4NTkwMDU5In0====="))
    }

    testDeeplinkPACParserWithInvalidURL() {
        this.assertThrow(() => WMTPACUtils.parseDeeplink("scheme://an-invalid-url.com"))
    }

    testDeeplinkParserWithValidURLButInvalidQuery() {
        this.assertThrow(() => WMTPACUtils.parseDeeplink("scheme://operation?code=abc"))
    }

    testDeeplinkPACParserWithValidJWTCode() {
        const parsed = WMTPACUtils.parseDeeplink("scheme://operation?code=eyJhbGciOiJub25lIiwidHlwZSI6IkpXVCJ9.eyJvaWQiOiIzYjllZGZkMi00ZDgyLTQ3N2MtYjRiMy0yMGZhNWM5OWM5OTMiLCJwb3RwIjoiMTQzNTc0NTgifQ==")
        this.assertEquals("14357458", parsed?.potp)
        this.assertEquals("3b9edfd2-4d82-477c-b4b3-20fa5c99c993", parsed?.oid, "Parsing of operationId failed")
    }

    testDeeplinkParserWithValidPACCode() {
        const parsed = WMTPACUtils.parseDeeplink("scheme://operation?oid=df6128fc-ca51-44b7-befa-ca0e1408aa63&potp=56725494")
        this.assertEquals("56725494", parsed?.potp, "Parsing of totp failed")
        this.assertEquals("df6128fc-ca51-44b7-befa-ca0e1408aa63", parsed?.oid, "Parsing of operationId failed")
    }

    testDeeplinkPACParserWithValidAnonymousDeeplinkQRCode() {
        const parsed = WMTPACUtils.parseQRCode("scheme://operation?oid=df6128fc-ca51-44b7-befa-ca0e1408aa63")
        this.assertNull(parsed?.potp)
        this.assertEquals("df6128fc-ca51-44b7-befa-ca0e1408aa63", parsed?.oid, "Parsing of operationId failed")
    }

    testDeeplinkPACParserWithAnonymousJWTQRCodeWithOnlyOperationId() {
        const parsed = WMTPACUtils.parseQRCode("eyJhbGciOiJub25lIiwidHlwZSI6IkpXVCJ9.eyJvaWQiOiI1YWM0YjNlOC05MjZmLTQ1ZjAtYWUyOC1kMWJjN2U2YjA0OTYifQ==")
        this.assertNull(parsed?.potp)
        this.assertEquals("5ac4b3e8-926f-45f0-ae28-d1bc7e6b0496", parsed?.oid, "Parsing of operationId failed")
    }
}
