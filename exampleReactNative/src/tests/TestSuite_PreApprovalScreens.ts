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

import {
    WMTResponse,
    WMTUserOperation,
    WMTOperations,
    WMTMobileTokenDataBuilder,
    WMTPreApprovalScreensRecorder,
    WMTPreApprovalElementListItem,
    WMTPreApprovalElementAlert,
    WMTPreApprovalElementButton,
    WMTPreApprovalElementBase
} from 'react-native-mtoken-sdk';
import type {
    WMTPreApprovalScreen,
    WMTPreApprovalControls,
    WMTPreApprovalScreenVisit
} from 'react-native-mtoken-sdk';
import { PowerAuth } from 'react-native-powerauth-mobile-sdk';
import { TestSuite } from './TestSuite';

export class TestSuite_PreApprovalScreens extends TestSuite {

    /**
     * Creates a recorder with injected time providers so the PowerAuth
     * platform channel is never called during tests.
     */
    private createRecorder(timeProvider?: () => Date, timeAdjustmentProvider?: () => Promise<number>): WMTPreApprovalScreensRecorder {
        return new WMTPreApprovalScreensRecorder(
            new PowerAuth("test-instance"),
            timeProvider ?? (() => new Date()),
            timeAdjustmentProvider ?? (async () => 0)
        )
    }

    // --- Deserialization: New format (preApprovalScreens array) ---

    testNewFormatMultipleScreens() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-1",
                "name": "payment",
                "data": "A1*A100CZK",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "2FA", "variants": ["possession_knowledge"] },
                "formData": { "title": "Payment", "message": "Confirm", "attributes": [] },
                "ui": {
                    "preApprovalScreens": [
                        {
                            "type": "WARNING",
                            "heading": "Warning",
                            "message": "Please verify",
                            "id": "intro-warning",
                            "backButton": true,
                            "image": "warning_icon",
                            "elements": [
                                { "id": "e1", "type": "LIST_ITEM", "text": "Check your phone", "style": "WARNING", "icon": "phone_icon" },
                                { "id": "e2", "type": "ALERT", "text": "Fraud alert!", "style": "DANGER" },
                                { "id": "e3", "type": "BUTTON", "text": "Call center", "action": "PHONE", "actionSettings": "REJECT", "href": "+420123456789" }
                            ],
                            "controls": {
                                "flip": true,
                                "axis": "HORIZONTAL",
                                "decline": { "type": "BACK", "text": "Go Back" },
                                "approve": { "type": "SLIDER", "text": "Slide to confirm", "counter": 5 }
                            }
                        },
                        {
                            "type": "QR_SCAN",
                            "heading": "Scan QR",
                            "message": "Scan the QR code",
                            "id": "qr-scan",
                            "controls": {
                                "decline": { "type": "REJECT", "text": "Cancel" },
                                "approve": { "type": "BUTTON", "text": "Done" }
                            }
                        }
                    ]
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        this.assertEquals("OK", response.status)

        const operation = response.responseObject!![0]
        this.assertNotNull(operation.ui)
        this.assertNotNull(operation.ui!!.preApprovalScreens)

        const screens = operation.ui!!.preApprovalScreens!!
        this.assertEquals(2, screens.length)

        // Screen 1: WARNING with elements and controls
        const screen1 = screens[0]
        this.assertEquals("WARNING", screen1.type)
        this.assertEquals("Warning", screen1.heading)
        this.assertEquals("Please verify", screen1.message)
        this.assertEquals("intro-warning", screen1.id)
        this.assertTrue(screen1.backButton!!)
        this.assertEquals("warning_icon", screen1.image)

        // Elements
        this.assertNotNull(screen1.elements)
        this.assertEquals(3, screen1.elements!!.length)

        const listItem = screen1.elements!![0] as WMTPreApprovalElementListItem
        this.assertEquals("LIST_ITEM", listItem.type)
        this.assertEquals("Check your phone", listItem.text)
        this.assertEquals("WARNING", listItem.style)
        this.assertEquals("phone_icon", listItem.icon)

        const alert = screen1.elements!![1] as WMTPreApprovalElementAlert
        this.assertEquals("ALERT", alert.type)
        this.assertEquals("Fraud alert!", alert.text)
        this.assertEquals("DANGER", alert.style)

        const button = screen1.elements!![2] as WMTPreApprovalElementButton
        this.assertEquals("BUTTON", button.type)
        this.assertEquals("Call center", button.text)
        this.assertEquals("PHONE", button.action)
        this.assertEquals("REJECT", button.actionSettings)
        this.assertEquals("+420123456789", button.href)

        // Controls
        this.assertNotNull(screen1.controls)
        this.assertTrue(screen1.controls!!.flip!!)
        this.assertEquals("HORIZONTAL", screen1.controls!!.axis)
        this.assertEquals("BACK", screen1.controls!!.decline!!.type)
        this.assertEquals("Go Back", screen1.controls!!.decline!!.text)
        this.assertEquals("SLIDER", screen1.controls!!.approve!!.type)
        this.assertEquals("Slide to confirm", screen1.controls!!.approve!!.text)
        this.assertEquals(5, screen1.controls!!.approve!!.counter)

        // Screen 2: QR_SCAN
        const screen2 = screens[1]
        this.assertEquals("QR_SCAN", screen2.type)
        this.assertEquals("Scan QR", screen2.heading)
        this.assertEquals("qr-scan", screen2.id)
        this.assertEquals("REJECT", screen2.controls!!.decline!!.type)
        this.assertEquals("BUTTON", screen2.controls!!.approve!!.type)
    }

    // --- Deserialization: Legacy format (singular preApprovalScreen) ---

    testLegacySingularFormat() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-2",
                "name": "login",
                "data": "A1*LOGIN",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "2FA", "variants": ["possession_knowledge"] },
                "formData": { "title": "Login", "message": "Confirm login", "attributes": [] },
                "ui": {
                    "preApprovalScreen": {
                        "type": "QR_SCAN",
                        "heading": "Scan QR",
                        "message": "Please scan",
                        "items": ["Item 1", "Item 2", "Item 3"],
                        "approvalType": "SLIDER"
                    }
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const operation = response.responseObject!![0]

        // Apply normalization (same as getOperations path)
        WMTOperations.normalizeOperation(operation)

        this.assertNotNull(operation.ui)

        // Legacy singular should be converted to plural
        this.assertNotNull(operation.ui!!.preApprovalScreens)
        this.assertEquals(1, operation.ui!!.preApprovalScreens!!.length)

        const screen = operation.ui!!.preApprovalScreens!![0]
        this.assertEquals("QR_SCAN", screen.type)
        this.assertEquals("Scan QR", screen.heading)
        this.assertEquals("Please scan", screen.message)

        // Fallback image injected by legacy normalization
        this.assertEquals("fallback_image", screen.image)

        // Legacy items converted to elements with fallback icon
        this.assertNotNull(screen.elements)
        this.assertEquals(3, screen.elements!!.length)
        const item1 = screen.elements!![0] as WMTPreApprovalElementListItem
        this.assertEquals("LIST_ITEM", item1.type)
        this.assertEquals("Item 1", item1.text)
        this.assertEquals("fallback_icon", item1.icon)

        // Legacy SLIDER approvalType converted to controls
        this.assertNotNull(screen.controls)
        this.assertTrue(screen.controls!!.flip!!)
        this.assertEquals("BACK", screen.controls!!.decline!!.type)
        this.assertEquals("SLIDER", screen.controls!!.approve!!.type)
    }

    // --- Deserialization: No preApprovalScreen at all ---

    testNoPreApprovalScreen() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-3",
                "name": "login",
                "data": "A1*LOGIN",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "1FA", "variants": ["possession"] },
                "formData": { "title": "Login", "message": "Confirm", "attributes": [] },
                "ui": {
                    "flipButtons": true
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const operation = response.responseObject!![0]

        // Apply normalization
        WMTOperations.normalizeOperation(operation)

        this.assertNotNull(operation.ui)
        this.assertNull(operation.ui!!.preApprovalScreens)
    }

    // --- Deserialization: No UI at all ---

    testNoUI() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-4",
                "name": "login",
                "data": "A1*LOGIN",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "1FA", "variants": ["possession"] },
                "formData": { "title": "Login", "message": "Confirm", "attributes": [] }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const operation = response.responseObject!![0]
        this.assertNull(operation.ui)
    }

    // --- Deserialization: Unknown element types normalized to UNKNOWN ---

    testUnknownElementType() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-5",
                "name": "payment",
                "data": "A1*A100",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "2FA", "variants": ["possession_knowledge"] },
                "formData": { "title": "Payment", "message": "Confirm", "attributes": [] },
                "ui": {
                    "preApprovalScreens": [{
                        "type": "INFO",
                        "heading": "Info",
                        "message": "Details",
                        "elements": [
                            { "id": "e1", "type": "FUTURE_TYPE", "text": "Some future element" },
                            { "id": "e2", "type": "LIST_ITEM", "text": "Known item" }
                        ]
                    }]
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const operation = response.responseObject!![0]
        WMTOperations.normalizeOperation(operation)

        const elements = operation.ui!!.preApprovalScreens!![0].elements!!
        this.assertEquals(2, elements.length)

        // Unknown type is normalized to UNKNOWN
        const unknown = elements[0] as WMTPreApprovalElementBase
        this.assertEquals("UNKNOWN", unknown.type)
        this.assertEquals("Some future element", unknown.text)

        // Known type works normally
        const known = elements[1] as WMTPreApprovalElementListItem
        this.assertEquals("LIST_ITEM", known.type)
        this.assertEquals("Known item", known.text)
    }

    // --- Deserialization: Screen with no elements (valid) ---

    testScreenWithNoElements() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-6",
                "name": "payment",
                "data": "A1*A100",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "2FA", "variants": ["possession_knowledge"] },
                "formData": { "title": "Payment", "message": "Confirm", "attributes": [] },
                "ui": {
                    "preApprovalScreens": [{
                        "type": "INFO",
                        "heading": "Simple Info",
                        "message": "Just a message, no elements"
                    }]
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const screen = response.responseObject!![0].ui!!.preApprovalScreens!![0]
        this.assertEquals("INFO", screen.type)
        this.assertEquals("Simple Info", screen.heading)
        this.assertNull(screen.elements)
        this.assertNull(screen.controls)
    }

    // --- Deserialization: Unknown screen type normalized to UNKNOWN ---

    testUnknownScreenType() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-7",
                "name": "payment",
                "data": "A1*A100",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "2FA", "variants": ["possession_knowledge"] },
                "formData": { "title": "Payment", "message": "Confirm", "attributes": [] },
                "ui": {
                    "preApprovalScreens": [{
                        "type": "FUTURE_SCREEN_TYPE",
                        "heading": "Future",
                        "message": "Something new"
                    }]
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const operation = response.responseObject!![0]
        WMTOperations.normalizeOperation(operation)

        const screen = operation.ui!!.preApprovalScreens!![0]
        this.assertEquals("UNKNOWN", screen.type)
        this.assertEquals("Future", screen.heading)
    }

    // --- MobileTokenDataBuilder tests ---

    testBuilderPutAndBuild() {
        const builder = new WMTMobileTokenDataBuilder()
        builder.put("key1", "value1")
        builder.put("key2", 42)
        builder.put("key3", true)

        const result = builder.build()
        this.assertEquals("value1", result["key1"])
        this.assertEquals(42, result["key2"])
        this.assertEquals(true, result["key3"])
    }

    testBuilderInitialData() {
        const builder = new WMTMobileTokenDataBuilder({ "initial": "data" })
        builder.put("extra", "value")

        const result = builder.build()
        this.assertEquals("data", result["initial"])
        this.assertEquals("value", result["extra"])
    }

    testBuilderOverwrite() {
        const builder = new WMTMobileTokenDataBuilder()
        builder.put("key", "first")
        builder.put("key", "second")

        const result = builder.build()
        this.assertEquals("second", result["key"])
    }

    testBuilderRemove() {
        const builder = new WMTMobileTokenDataBuilder()
        builder.put("key1", "value1")
        builder.put("key2", "value2")

        const removed = builder.remove("key1")
        this.assertTrue(removed)

        const notRemoved = builder.remove("nonexistent")
        this.assertFalse(notRemoved)

        // Keys inherited from Object.prototype must not report a removal
        this.assertFalse(builder.remove("toString"))

        const result = builder.build()
        this.assertNull(result["key1"])
        this.assertEquals("value2", result["key2"])
    }

    testBuilderClear() {
        const builder = new WMTMobileTokenDataBuilder()
        builder.put("key1", "value1")
        builder.put("key2", "value2")
        builder.clear()

        const result = builder.build()
        this.assertEquals(0, Object.keys(result).length)
    }

    testBuilderChaining() {
        const result = new WMTMobileTokenDataBuilder()
            .put("a", 1)
            .put("b", 2)
            .put("c", 3)
            .build()

        this.assertEquals(1, result["a"])
        this.assertEquals(2, result["b"])
        this.assertEquals(3, result["c"])
    }

    testBuilderBuildReturnsSnapshot() {
        const builder = new WMTMobileTokenDataBuilder()
        builder.put("key", "original")

        const snapshot1 = builder.build()
        builder.put("key", "modified")
        const snapshot2 = builder.build()

        this.assertEquals("original", snapshot1["key"])
        this.assertEquals("modified", snapshot2["key"])
    }

    async testBuilderWithRecord() {
        const recorder = this.createRecorder(() => new Date("2025-01-01T12:00:00Z"))
            .begin("screen1")
            .end("screen1", "CONTINUE")

        const builder = new WMTMobileTokenDataBuilder()
        await builder.putRecord(recorder)

        const result = builder.build()
        this.assertNotNull(result["preApprovalScreens"])

        const visits = result["preApprovalScreens"] as WMTPreApprovalScreenVisit[]
        this.assertEquals(1, visits.length)
        this.assertEquals("screen1", visits[0].screen)
    }

    async testBuilderRemoveRecord() {
        const recorder = this.createRecorder()
        const builder = new WMTMobileTokenDataBuilder()
        await builder.putRecord(recorder)

        this.assertTrue(builder.remove(recorder))
        const result = builder.build()
        this.assertNull(result["preApprovalScreens"])
    }

    // --- PreApprovalScreensRecorder tests ---

    async testRecorderBasicFlow() {
        const fixedTime = new Date("2025-06-01T10:00:00Z")
        const recorder = this.createRecorder(() => fixedTime)

        recorder
            .begin("intro-warning")
            .end("intro-warning", "CONTINUE")
            .begin("qr-scan")
            .end("qr-scan", "SCAN")

        const visits = await recorder.build()
        this.assertEquals(2, visits.length)

        this.assertEquals("intro-warning", visits[0].screen)
        this.assertEquals("2025-06-01T10:00:00.000Z", visits[0].timestampOpened)
        this.assertEquals("2025-06-01T10:00:00.000Z", visits[0].timestampClosed)
        this.assertEquals("CONTINUE", visits[0].action)

        this.assertEquals("qr-scan", visits[1].screen)
        this.assertEquals("SCAN", visits[1].action)
    }

    async testRecorderRevisitScreen() {
        const fixedTime = new Date("2025-06-01T10:00:00Z")
        const recorder = this.createRecorder(() => fixedTime)

        recorder
            .begin("intro")
            .end("intro", "CLOSE")
            .begin("intro")
            .end("intro", "CONTINUE")

        const visits = await recorder.build()
        this.assertEquals(2, visits.length)
        this.assertEquals("CLOSE", visits[0].action)
        this.assertEquals("CONTINUE", visits[1].action)
    }

    async testRecorderAutoCloseOnBegin() {
        const fixedTime = new Date("2025-06-01T10:00:00Z")
        const recorder = this.createRecorder(() => fixedTime)

        recorder
            .begin("screen1")
            // no end() — begin next screen pushes previous as-is (no close)
            .begin("screen2")
            .end("screen2", "CONTINUE")

        const visits = await recorder.build()
        this.assertEquals(2, visits.length)
        // screen1 was pushed without closing (matches iOS/Android behavior)
        this.assertNull(visits[0].timestampClosed)
        this.assertNull(visits[0].action)
    }

    async testRecorderAutoCloseOnBuild() {
        const fixedTime = new Date("2025-06-01T10:00:00Z")
        const recorder = this.createRecorder(() => fixedTime)

        recorder.begin("screen1")
        // No end() call

        const visits = await recorder.build()
        this.assertEquals(1, visits.length)
        // Should be auto-closed during build
        this.assertNotNull(visits[0].timestampClosed)
    }

    async testRecorderReset() {
        const recorder = this.createRecorder()

        recorder
            .begin("screen1")
            .end("screen1", "CONTINUE")
            .reset()

        const visits = await recorder.build()
        this.assertEquals(0, visits.length)
    }

    async testRecorderEndMismatch() {
        const recorder = this.createRecorder()

        recorder
            .begin("screen1")
            .end("wrong-id", "CONTINUE") // should be ignored

        const visits = await recorder.build()
        this.assertEquals(1, visits.length)
        // screen1 is still open (end was ignored), auto-closed by build
        this.assertNull(visits[0].action)
    }

    async testRecorderEndAlreadyClosed() {
        const recorder = this.createRecorder()

        recorder
            .begin("screen1")
            .end("screen1", "CONTINUE")
            .end("screen1", "BACK") // duplicate end — should be ignored

        const visits = await recorder.build()
        this.assertEquals(1, visits.length)
        this.assertEquals("CONTINUE", visits[0].action)
    }

    async testRecorderBuildReturnsSnapshot() {
        const recorder = this.createRecorder()

        recorder
            .begin("screen1")
            .end("screen1", "CONTINUE")

        const snapshot1 = await recorder.build()

        recorder
            .begin("screen2")
            .end("screen2", "BACK")

        const snapshot2 = await recorder.build()

        this.assertEquals(1, snapshot1.length)
        this.assertEquals(2, snapshot2.length)
    }

    async testRecorderKey() {
        const recorder = this.createRecorder()
        this.assertEquals("preApprovalScreens", recorder.key)
    }

    async testRecorderCustomAction() {
        const recorder = this.createRecorder(() => new Date("2025-06-01T10:00:00Z"))

        recorder
            .begin("custom-screen")
            .end("custom-screen", "MY_CUSTOM_ACTION")

        const visits = await recorder.build()
        this.assertEquals(1, visits.length)
        this.assertEquals("MY_CUSTOM_ACTION", visits[0].action)
    }

    // --- Full integration: Builder + Recorder ---

    async testBuilderRecorderIntegration() {
        const fixedTime = new Date("2025-06-01T10:00:00Z")
        const builder = new WMTMobileTokenDataBuilder({ "baseKey": "baseValue" })
        builder.put("riskScore", 0.82)

        const recorder = this.createRecorder(() => fixedTime)
            .begin("intro-warning")
            .end("intro-warning", "CLOSE")
            .begin("intro-warning")
            .end("intro-warning", "CONTINUE")
            .begin("qr")
            .end("qr", "SCAN")
            .begin("call-or-confirm")
            .end("call-or-confirm", "CONTINUE")

        await builder.putRecord(recorder)

        const result = builder.build()
        this.assertEquals("baseValue", result["baseKey"])
        this.assertEquals(0.82, result["riskScore"])

        const visits = result["preApprovalScreens"] as WMTPreApprovalScreenVisit[]
        this.assertEquals(4, visits.length)
        this.assertEquals("intro-warning", visits[0].screen)
        this.assertEquals("CLOSE", visits[0].action)
        this.assertEquals("intro-warning", visits[1].screen)
        this.assertEquals("CONTINUE", visits[1].action)
        this.assertEquals("qr", visits[2].screen)
        this.assertEquals("SCAN", visits[2].action)
        this.assertEquals("call-or-confirm", visits[3].screen)
        this.assertEquals("CONTINUE", visits[3].action)
    }

    // --- Deserialization: Controls only (no elements) ---

    testControlsOnly() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-8",
                "name": "payment",
                "data": "A1*A100",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "2FA", "variants": ["possession_knowledge"] },
                "formData": { "title": "Payment", "message": "Confirm", "attributes": [] },
                "ui": {
                    "preApprovalScreens": [{
                        "type": "WARNING",
                        "heading": "Warning",
                        "message": "Are you sure?",
                        "controls": {
                            "flip": false,
                            "axis": "VERTICAL",
                            "decline": { "type": "REJECT" },
                            "approve": { "type": "BUTTON", "counter": 10 }
                        }
                    }]
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const screen = response.responseObject!![0].ui!!.preApprovalScreens!![0]

        this.assertNotNull(screen.controls)
        this.assertFalse(screen.controls!!.flip!!)
        this.assertEquals("VERTICAL", screen.controls!!.axis)
        this.assertEquals("REJECT", screen.controls!!.decline!!.type)
        this.assertNull(screen.controls!!.decline!!.text)
        this.assertEquals("BUTTON", screen.controls!!.approve!!.type)
        this.assertEquals(10, screen.controls!!.approve!!.counter)
        this.assertNull(screen.controls!!.approve!!.text)
    }

    // --- Deserialization: Empty elements array ---

    testEmptyElementsArray() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-9",
                "name": "payment",
                "data": "A1*A100",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "2FA", "variants": ["possession_knowledge"] },
                "formData": { "title": "Payment", "message": "Confirm", "attributes": [] },
                "ui": {
                    "preApprovalScreens": [{
                        "type": "INFO",
                        "heading": "Info",
                        "message": "Nothing to show",
                        "elements": []
                    }]
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const screen = response.responseObject!![0].ui!!.preApprovalScreens!![0]
        this.assertNotNull(screen.elements)
        this.assertEquals(0, screen.elements!!.length)
    }

    // --- Deserialization: Both preApprovalScreen and preApprovalScreens present ---

    testBothSingularAndPluralPresent() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-10",
                "name": "payment",
                "data": "A1*A100",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "2FA", "variants": ["possession_knowledge"] },
                "formData": { "title": "Payment", "message": "Confirm", "attributes": [] },
                "ui": {
                    "preApprovalScreen": {
                        "type": "INFO",
                        "heading": "Legacy",
                        "message": "Legacy screen"
                    },
                    "preApprovalScreens": [
                        { "type": "WARNING", "heading": "New 1", "message": "New screen 1" },
                        { "type": "QR_SCAN", "heading": "New 2", "message": "New screen 2" }
                    ]
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const operation = response.responseObject!![0]

        // Apply normalization
        WMTOperations.normalizeOperation(operation)

        const ui = operation.ui!!

        // preApprovalScreens (plural) should take priority
        this.assertNotNull(ui.preApprovalScreens)
        this.assertEquals(2, ui.preApprovalScreens!!.length)
        this.assertEquals("New 1", ui.preApprovalScreens!![0].heading)
    }

    // --- Deserialization: Empty preApprovalScreens array does NOT trigger legacy fallback ---

    testEmptyPreApprovalScreensArrayNoLegacyFallback() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-empty",
                "name": "payment",
                "data": "A1*A100",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "2FA", "variants": ["possession_knowledge"] },
                "formData": { "title": "Payment", "message": "Confirm", "attributes": [] },
                "ui": {
                    "preApprovalScreen": {
                        "type": "INFO",
                        "heading": "Legacy",
                        "message": "Should be ignored"
                    },
                    "preApprovalScreens": []
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const operation = response.responseObject!![0]
        WMTOperations.normalizeOperation(operation)

        // Empty plural array takes priority — legacy singular is NOT used
        this.assertNotNull(operation.ui!!.preApprovalScreens)
        this.assertEquals(0, operation.ui!!.preApprovalScreens!!.length)
    }

    // --- Deserialization: Element with minimal fields ---

    testElementMinimalFields() {
        const json = `{
            "status": "OK",
            "responseObject": [{
                "id": "op-11",
                "name": "payment",
                "data": "A1*A100",
                "status": "PENDING",
                "operationCreated": "2025-01-01T00:00:00+0000",
                "operationExpires": "2025-01-01T00:05:00+0000",
                "allowedSignatureType": { "type": "2FA", "variants": ["possession_knowledge"] },
                "formData": { "title": "Payment", "message": "Confirm", "attributes": [] },
                "ui": {
                    "preApprovalScreens": [{
                        "type": "INFO",
                        "heading": "Info",
                        "message": "Details",
                        "elements": [
                            { "type": "LIST_ITEM" },
                            { "type": "ALERT" },
                            { "type": "BUTTON" }
                        ]
                    }]
                }
            }]
        }`

        const response = JSON.parse(json) as WMTResponse<WMTUserOperation[]>
        const elements = response.responseObject!![0].ui!!.preApprovalScreens!![0].elements!!
        this.assertEquals(3, elements.length)

        this.assertEquals("LIST_ITEM", elements[0].type)
        this.assertNull(elements[0].text)
        this.assertNull(elements[0].id)

        this.assertEquals("ALERT", elements[1].type)
        this.assertEquals("BUTTON", elements[2].type)
    }

    // --- Recorder time synchronization ---

    async testRecorderAppliesTimeAdjustment() {
        const fixedTime = new Date("2025-06-15T10:30:00Z")
        const recorder = this.createRecorder(() => fixedTime, async () => 90000) // +1.5 minutes

        recorder
            .begin("screen1")
            .end("screen1", "CONTINUE")
            .begin("screen2")

        const visits = await recorder.build()
        this.assertEquals("2025-06-15T10:31:30.000Z", visits[0].timestampOpened)
        this.assertEquals("2025-06-15T10:31:30.000Z", visits[0].timestampClosed)
        this.assertEquals("2025-06-15T10:31:30.000Z", visits[1].timestampOpened)
        this.assertEquals("2025-06-15T10:31:30.000Z", visits[1].timestampClosed)
    }

    async testRecorderAppliesNegativeTimeAdjustment() {
        const fixedTime = new Date("2025-06-15T10:30:00Z")
        const recorder = this.createRecorder(() => fixedTime, async () => -60000) // -1 minute

        recorder
            .begin("screen1")
            .end("screen1", "CONTINUE")

        const visits = await recorder.build()
        this.assertEquals("2025-06-15T10:29:00.000Z", visits[0].timestampOpened)
        this.assertEquals("2025-06-15T10:29:00.000Z", visits[0].timestampClosed)
    }

    async testRecorderTimeAdjustmentFailureFallsBack() {
        const fixedTime = new Date("2025-06-15T10:30:00Z")
        const recorder = this.createRecorder(() => fixedTime, async () => { throw new Error("not available") })

        recorder
            .begin("screen1")
            .end("screen1", "CONTINUE")

        const visits = await recorder.build()
        this.assertEquals("2025-06-15T10:30:00.000Z", visits[0].timestampOpened)
        this.assertEquals("2025-06-15T10:30:00.000Z", visits[0].timestampClosed)
    }

    async testRecorderRepeatedBuildReflectsUpdatedAdjustment() {
        const fixedTime = new Date("2025-06-15T10:30:00Z")
        let adjustment = 0
        const recorder = this.createRecorder(() => fixedTime, async () => adjustment)

        recorder
            .begin("screen1")
            .end("screen1", "CONTINUE")

        // First build: time not synchronized yet (zero adjustment)
        let visits = await recorder.build()
        this.assertEquals("2025-06-15T10:30:00.000Z", visits[0].timestampOpened)

        // Second build: time synchronized in the meantime
        adjustment = 30000
        visits = await recorder.build()
        this.assertEquals("2025-06-15T10:30:30.000Z", visits[0].timestampOpened)
    }

    // --- Legacy singular payload: iOS parity ---

    testLegacyConversionIgnoresNewModelKeys() {
        const operation = {
            ui: {
                preApprovalScreen: {
                    type: "INFO",
                    heading: "Info",
                    message: "Message",
                    id: "screen1",
                    image: "custom_image",
                    elements: [{ type: "ALERT", text: "ignored" }]
                }
            }
        } as unknown as WMTUserOperation

        WMTOperations.normalizeOperation(operation)

        // Singular payload is always legacy-converted; new-model keys are ignored
        const screen = operation.ui!!.preApprovalScreens!![0]
        this.assertNull(screen.id)
        this.assertEquals("fallback_image", screen.image)
        this.assertNull(screen.elements)
        this.assertNull(screen.controls)
    }

    testMalformedLegacyPayloadYieldsNoScreens() {
        const operation = {
            ui: {
                preApprovalScreen: {
                    type: "INFO"
                }
            }
        } as unknown as WMTUserOperation

        WMTOperations.normalizeOperation(operation)

        this.assertNull(operation.ui!!.preApprovalScreens)
    }
}
