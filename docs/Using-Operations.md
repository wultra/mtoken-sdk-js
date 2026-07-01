# Using Operations

<!-- begin remove -->
- [Introduction](#introduction)
- [Getting an Instance](#getting-an-instance)
- [Retrieve Pending Operations](#retrieve-pending-operations)
- [Approve an Operation](#approve-an-operation)
- [Reject an Operation](#reject-an-operation)
- [Operation detail](#operation-detail)
- [Claim the Operation](#claim-the-operation)
- [Off-line Authorization](#off-line-authorization)
- [Operations API Reference](#operations-api-reference)
- [WMTUserOperation](#wmtuseroperation)
- [Creating a Custom Operation](#creating-a-custom-operation)
- [Pre-Approval Screens](#pre-approval-screens)
- [Mobile Token Data](#mobile-token-data)
- [TOTP ProximityCheck](#totp-proximity-check)

## Introduction
<!-- end -->

`WMTOperations` is responsible for operation handling like fetching the operation list or approving operations.

An operation can be anything you need to be approved or rejected by the user. It can be for example money transfer, login request, access approval, ...

<!-- begin box warning -->
Note: Before using `WMTOperations`, you need to have a `PowerAuth` object available and initialized with a valid activation. Without a valid PowerAuth activation, all endpoints will return an error.
<!-- end -->

`WMTOperations` communicates with the [Mobile Token API](https://developers.wultra.com/components/enrollment-server/develop/documentation/Mobile-Token-API).

## Getting an Instance

The instance of the `WMTOperations` can be accessed after creating the main object of the SDK:

```typescript
const mtoken = powerAuthInstance.createWultraMobileToken()
const operations = mtoken.operations
```

## Retrieve Pending Operations

To fetch the list with pending operations, you can call:

```typescript
async function fetch() {
    try {
        const response = await this.operations.getOperations()
        if (response.responseObject) {
            // process list
        } else {
            // process server error
        }
    } catch (e) {
        // failure
    }
}
```

After you retrieve the pending operations, you can render them in the UI, for example, as a list of items with a detail of the operation shown after a tap.

<!-- begin box warning -->
Note: The language of the UI data inside the operation depends on the configuration of the `WultraMobileToken.setAcceptLanguage`.
<!-- end -->

## Approve an Operation

To approve an operation use `authorize`. You can simply use it with the following examples:

```typescript
// Approve operation with a password
async function approve(operation: WMTOnlineOperation, password: string) {
    try {
        const auth = PowerAuthAuthentication.password(password)
        const response = await this.operations.authorize(operation, auth)
        if (response.status == "OK") {
            // operation authorized
        } else {
            // server error (for example wrong PIN)
        }
    } catch (e) {
        // failure (for example network not available or invalid powerauth state)
    }
}
```

To approve operations with biometrics, your PowerAuth instance [needs to be configured with biometric factor](https://github.com/wultra/react-native-powerauth-mobile-sdk/blob/develop/docs/Biometry-Setup.md).

```typescript
// Approve operation with biometrics
async function approveWithBiometrics(operation: WMTUserOperation) {

    // UserOperation contains information on biometrics that can be used
    if (!operation.allowedSignatureType.variants.find(variant => variant === "possession_biometry")) {
        //Biometrics usage is not allowed on this operation
        return
    }

    try {
        const auth = PowerAuthAuthentication.biometry({
            promptTitle: 'Authenticate',
            promptMessage: 'Please authenticate with biometry'
        })
        const response = await this.operations.authorize(operation, auth)
        if (response.status == "OK") {
            // operation authorized
        } else {
            // server error (for example operation was already authorized)
        }
    } catch (e) {
        // failure (for example network not available or invalid powerauth state)
    }

}
```

### Passing Additional Mobile Token Data

You can attach customer-specific metadata to operations during authorization or rejection. See the [Mobile Token Data](#mobile-token-data) section for details and examples.

## Reject an Operation

To reject an operation use `reject`. Operation rejection is confirmed by the possession factor, so there is no need to create the `PowerAuthAuthentication` object.

Two overloads are available:

```typescript
// Reject by operation ID
const response = await this.operations.reject(operation.id, "INCORRECT_DATA")

// Reject with the full operation object (includes mobileTokenData in the request)
const response = await this.operations.reject(operation, "PREAPPROVAL")
```

Standard rejection reasons: `"INCORRECT_DATA"`, `"UNEXPECTED_OPERATION"`, `"UNKNOWN"`, `"PREAPPROVAL"`. Custom string reasons are also accepted.

## Operation Detail

To get a detail of the operation based on operation ID use `detail`. Operation detail is confirmed by the possession factor so there is no need for creating a `PowerAuthAuthentication` object. The returned result is the operation and its current status.

```typescript
// Retrieve operation details based on the operation ID.
async function getDetail(operationId: string) {
    try {
        const response = await this.mtoken.operations.getDetail(operationId)
        if (response.responseObject) {
            // operation retrieved
        } else {
            // server error (for example operation does not exist)
        }
    } catch (e) {
        // failure (for example network not available or invalid powerauth state)
    }
}
```

## Claim the Operation

To claim a non-personalized operation use `claim`. 

A non-personalized operation refers to an operation that is initiated without a specific userId. In this state, the operation is not tied to a particular user. 

Operation claim is confirmed by the possession factor, so there is no need for creating a `PowerAuthAuthentication` object. The returned result is the operation and its current status. You can simply use it with the following example.

```typescript
// Assigns the 'non-personalized' operation to the user
async function claim(operationId: string) {
    try {
        const response = await this.mtoken.operations.claim(operationId)
        if (response.responseObject) {
            // operation claimed, you can now auhthorieze it
        } else {
            // server error (for example operation does not exist)
        }
    } catch (e) {
        // failure (for example network not available or invalid powerauth state)
    }
}
```

## Operation History

You can retrieve an operation history via the `history` method. The returned result is operations and their current status.

```typescript
// Retrieve operation history with password
async function history(password: string) {

    const auth = PowerAuthAuthentication.password(password)

    try {
        const response = await this.mtoken.operations.getHistory(auth)
        if (response.responseObject) {
            // history retrieved
        } else {
            // server error (for example wrong password)
        }
    } catch (e) {
        // failure (for example network not available or invalid powerauth state)
    }
}
```

## Off-line Authorization

In case the user is not online, you can use off-line authorizations. In this operation mode, the user needs to scan a QR code, enter a PIN code, or use biometrics, and rewrite the resulting code. Wultra provides a special format for [the operation QR codes](https://github.com/wultra/enrollment-server/blob/develop/docs/Offline-Signatures-QR-Code.md), which are automatically processed with the SDK.

### Processing Scanned QR Operation

```typescript
async function onQROperationScanned(scannedCode: string): Promise<WMTQROperation> {
    // retrieve parsed operation
    const qrOperation = WMTQROperationParser.parse(scannedCode) // this method can throw an error
    // verify the signature against the powerauth instance
    const verified = await this.powerAuth.verifyServerSignedData(qrOperation.signedData, qrOperation.signature.signatureString, qrOperation.signature.signingKey == WMTSigningKey.MASTER)
    if (!verified) {
        throw "Invalid offline operation"
    }
    return operation
}
```

### Authorizing Scanned QR Operation

<!-- begin box info -->
An offline operation needs to be __always__ approved with __a 2-factor scheme__ (password or biometrics).
<!-- end -->

<!-- begin box info -->
Each offline operation created on the server has an __URI ID__ to define its purpose and configuration. The default value used here is `/operation/authorize/offline` and can be modified with the `uriId` parameter in the `authorizeOffline` method.
<!-- end -->

#### With Password

```typescript
async function approveOfflineOperation(qrOperation: WMTQROperation, password: string) {
    const auth = PowerAuthAuthentication.password(password)
    try {
        const offlineSignature = await this.mtoken.operations.authorizeOffline(qrOperation, auth)
        // Display the signature to the user so it can be manually rewritten.
        // Note that the operation will be signed even with the wrong password!
    } catch (e) {
       // Failed to sign the operation
    }
}
```

<!-- begin box info -->
An offline operation can and will be signed even with an incorrect password. The signature cannot be used for manual approval in such a case. This behavior cannot be detected, so you should warn the user that an incorrect password will result in an incorrect "approval code".
<!-- end -->

#### With Password and Custom `uriId`

```typescript
async function approveOfflineOperation(qrOperation: WMTQROperation, password: string) {
    const auth = PowerAuthAuthentication.password(password)
    try {
        const offlineSignature = await this.mtoken.operations.authorizeOffline(qrOperation, auth, "/confirm/offline/operation")
        // Display the signature to the user so it can be manually rewritten.
        // Note that the operation will be signed even with the wrong password!
    } catch (e) {
       // Failed to sign the operation
    }
}
```

#### With Biometrics

To approve offline operations with biometrics, your PowerAuth instance [needs to be configured with biometric factor](https://github.com/wultra/react-native-powerauth-mobile-sdk/blob/develop/docs/Biometry-Setup.md).

To determine if biometrics can be used for offline operation authorization, use `WMTQROperation.flags.biometricsAllowed`.

```typescript
// Approves QR operation with biometrics
async function approveQROperationWithBiometrics(operation: WMTQROperation) {

    if (!operation.flags.biometricsAllowed) {
        // biometrics usage is not allowed on this operation
        return
    }

    const auth = PowerAuthAuthentication.biometry({
        promptTitle: 'Authenticate',
        promptMessage: 'Please authenticate with biometry'
    })

    try {
        const offlineSignature = await this.mtoken.operations.authorizeOffline(operation, auth)
        // Display the signature to the user so it can be manually rewritten.
    } catch (e) {
        // Failed to sign the operation
    }
}
```

## Operations API Reference

All available methods and attributes of `WMTOperations` API are:

> Each call has a `requestProcessor` parameter - an option to modify the request.

- `async getOperations(requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTUserOperation[]>>` - Retrieves pending operations from the server.
- `async getDetail(operationId: string, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTUserOperation>>` - Retrieves operation detail based on operation ID.
  - `operationId` - ID of the operation to retrieve.
- `async getHistory(authentication: PowerAuthAuthentication, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTUserOperation[]>>` - Retrieves operation history.
  - `authentication` - PowerAuth authentication object for signing.
- `async authorize(operation: WMTOnlineOperation, authentication: PowerAuthAuthentication, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>>` - Authorize provided operation.
  - `operation` - An operation to approve, retrieved from `getOperations` call or [created locally](#creating-a-custom-operation).
  - `authentication` - PowerAuth authentication object for operation signing.
- `async reject(operationId: string, reason: WMTRejectionReason, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>>` - Reject operation by ID.
  - `operationId` - ID of the operation to reject.
  - `reason` - Rejection reason.
- `async reject(operation: WMTOnlineOperation, reason: WMTRejectionReason, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>>` - Reject operation.
  - `operation` - Operation to reject (from `getOperations` or created locally).
  - `reason` - Rejection reason.
- `async authorizeOffline(operation: WMTQROperation, authentication: PowerAuthAuthentication, uriId: string = "/operation/authorize/offline"): Promise<string>` - Sign offline (QR) operation.
  - `operation` - Offline operation retrieved via the `QROperationParser.parse` method (or otherwise).
  - `authentication` - PowerAuth authentication object for operation signing.
  - `uriId` - Custom signature URI ID of the operation. Use the URI ID under which the operation was created on the server. The default value is `/operation/authorize/offline`.
- `async claim(operationId: string, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTUserOperation>>` - Assigns the 'non-personalized' operation to the user.
  - `operationId` - ID of the operation.

## WMTUserOperation

Operation objects retrieved through the `getOperations` or `getDetail` methods are called "user operations".

Under this abstract name, you can imagine for example "Login operation", which is a request for signing in to the online account in a web browser on another device. **In general, it can be any operation that can be either approved or rejected by the user.**

Visually, the operation should be displayed as an info page with all the attributes (rows) of such an operation, where the user can decide if he wants to approve or reject it.

Definition of the `WMTUserOperation`:

```typescript
export interface WMTUserOperation extends WMTOnlineOperation {

    /** Processing status of the operation */
    status: "APPROVED" | "REJECTED" | "PENDING" | "CANCELED" | "EXPIRED" | "FAILED"

    /**
     * System name of the operation (for example login).
     * 
     * Name of the operation shouldn't be visible to the user. You can use it to distinguish how 
     * the operation will be presented. (for example when the template for login is different than payment).
     */
    name: string
    
    /**
     * Date and time when the operation was created.
     */ 
    operationCreated: Date
    
    /**
     * Date and time when the operation will expire.
     * 
     * You should never use this to hide the operation (visually) from the user
     * as the time set for the user system can differ with the backend.
     */ 
    operationExpires: Date
    
    /**
     * Data that should be presented to the user.
     */ 
    formData: WMTOperationFormData
    
    /** 
     * Enum-like reason why the status has changed.
     * 
     *  Max 32 characters are expected. Possible values depend on the backend implementation and configuration.
     */ 
    statusReason?: string
    
    /**
     * Allowed signature types.
     * 
     * This hints if the operation needs a 2nd factor or can be approved simply by
     * tapping an approve button. If the operation requires 2FA, this value also hints if
     * the user may use the biometry, or if a password is required.
     */ 
    allowedSignatureType: WMTAllowedOperationSignature
    
    /**
     * UI data to be shown
     *
     * Accompanying information about the operation additional UI which should be presented such as
     * Pre-Approval Screen or Post-Approval Screen
     */
    ui?: WMTUserOperationUIData

    /** 
     * Proximity Check Data to be passed when OTP is handed to the app.
     */
    proximityCheck?: WMTUserOperationProximityCheck
}
```

Definition of `WMTOperationFormData`:

```typescript
export interface WMTOperationFormData {
    
    /** Title of the operation */
    title: string
    
    /** Message for the user. */
    message: string
    
    /**
     * Texts for the result of the operation
     * 
     * This includes messages for different outcomes of the operation such as success, rejection, and failure.
     */
    resultTexts?: WMTResultTexts
     
    /**
     * Other attributes.
     * 
     * Note that attributes can be presented with different classes (Starting with `MobileTokenOperationAttribute*`) based on the attribute type.  
     */ 
    attributes: WMTUserOperationAttribute[]
}
```

Definition of `WMTResultTexts`:

```typescript
export interface WMTResultTexts {
    /** Optional message to be displayed when the approval of the operation is successful. */
    success?: string
    
    /** Optional message to be displayed when the operation approval or rejection fails. */
    failure?: string
    
    /** Optional message to be displayed when the operation is rejected. */
    reject?: string
}
```

Attributes types:  
- `AMOUNT` Like "100.00 CZK".
- `KEY_VALUE` Any key-value pair.
- `NOTE` Just like `KEY_VALUE`, emphasizing that the value is a note or message.
- `HEADING` Single highlighted text, written in a larger font, used as a section heading.
- `AMOUNT_CONVERSION` Provides data about Money conversion.
- `IMAGE` Image row.
- `ALERT` view to display success, info, warning or error message.
- `UNKNOWN` Fallback option when an unknown attribute type is passed. Such an attribute only contains the label.

Definition of `WMTUserOperationUIData`:

```typescript
export interface WMTUserOperationUIData {

    /** Confirm and Reject buttons should be flipped both in position and style */
    flipButtons?: boolean

    /** Block approval when on call (for example when on phone or skype call) */
    blockApprovalOnCall?: boolean

    /** Pre-approval screens to display before the operation can be approved */
    preApprovalScreens?: WMTPreApprovalScreen[]

    /**
     * UI for post-approval operation screen
     *
     * Type of PostApprovalScreen is presented with different classes based on its type (Starting with `PostApprovalScreen*`).
     * 
     * For example: WMTPostApprovalScreenRedirect that provides data after URL redirect.
     */
    postApprovalScreen?: WMTPostApprovalScreen
}
```

PreApprovalScreen types: see [Pre-Approval Screens](#pre-approval-screens) for the full list and details.

PostApprovalScreen types:
`PostApprovalScreen*` classes commonly contain `heading` and `message` and different payload data

- `REVIEW` provides an array of operations attributes with data: type, id, label, and note
- `REDIRECT` providing text for button, countdown, and redirection URL
- `GENERIC` may contain any object

Definition of `WMTUserOperationProximityCheck`:

```typescript
export interface WMTUserOperationProximityCheck {
    /** The actual Time-based one time password */
    totp: string

    /** Type of the Proximity check */
    type: "QR_CODE" | "DEEPLINK"

    /** Timestamp when the operation was scanned (qrCode) or delivered to the device (deeplink) */
    timestampReceived: Date
}
```

## Creating a Custom Operation

In some specific scenarios, you might need to approve or reject an operation that you received through a different channel than `getOperations`. In such cases, you can implement the `WMTOnlineOperation` interface in your custom class and then feed created objects to both `authorize` and `reject` methods.

Definition of the `WMTOnlineOperation`:

```typescript
export interface WMTOnlineOperation {

    /** Unique operation identifier. */
    id: string

    /**
     * Actual data that will be signed.
     * 
     * This shouldn't be visible to the user.
     */
    data: string

    /** 
     * Additional information with proximity check data 
     */
    proximityCheck?: WMTUserOperationProximityCheck

    /**
     * Optional customer-specific data sent alongside authorize/reject requests.
     */
    mobileTokenData?: Record<string, unknown>
}
```

## Pre-Approval Screens

Pre-approval screens define additional UI that can be displayed before the user decides to approve or reject an operation. They allow displaying structured instructions, warnings, or interactive elements to the user.

The screens are available via `WMTUserOperation.ui.preApprovalScreens` and may contain multiple screens that the user navigates through.

Types:

- `WARNING`
- `INFO`
- `QR_SCAN` – this type indicates that the `WMTUserOperationProximityCheck` must be used
- `UNKNOWN` – fallback value assigned by the SDK when the server sends an unrecognized screen type

A pre-approval screen can contain the following building blocks:

- Heading and message – textual content displayed at the top of the screen.
- Optional metadata:
  - `id` – unique screen identifier
  - `backButton` – show a navigation back button
  - `image` – in-app asset identifier
- Elements – structured items that form the main content of the screen:
  - List item (`LIST_ITEM`) – text with optional `icon` and `style` (`INFO`, `WARNING`, `DANGER`).
  - Alert (`ALERT`) – highlighted box with `style` (`INFO`, `WARNING`, `DANGER`).
  - Button (`BUTTON`) – action element with `action` (`LINK`, `MAIL`, `PHONE`), plus optional `actionSettings` string describing additional behavior (e.g. `"REJECT"`).
- Controls – configuration of approve/decline actions:
  - Decline – `BACK` or `REJECT`, with optional `text`.
  - Approve – `SLIDER` or `BUTTON`, with optional `text` and optional countdown (`counter`). The counter defines how long (in seconds) the approve control remains disabled after the screen appears.
  - Layout options – `axis` (`HORIZONTAL` or `VERTICAL`) and `flip` (swap order of controls).

### Legacy Format Compatibility

The SDK supports the legacy singular `preApprovalScreen` payload from older server versions and automatically converts it to the new `preApprovalScreens` list via `WMTOperations.normalizeOperation()`. During this conversion, the following sentinel values are injected because the legacy format does not carry these fields:

- **`image`**: Set to `"fallback_image"`. Your UI layer should check for this value and render an appropriate default (e.g. a generic icon or no image).
- **`icon`** (on list item elements): Set to `"fallback_icon"`. Your UI layer should detect this value and provide a suitable default rendering.

These sentinels are only injected during legacy conversion — new-format payloads are passed through as-is. This behavior matches the iOS and Android SDKs.

## Mobile Token Data

With PowerAuth Server **1.10+**, you can pass additional, customer-specific metadata during operation authorization or rejection using the `mobileTokenData` property.

This feature is especially useful for **fraud detection systems (FDS)**, customer risk evaluation, or other backend-specific business logic.

### Direct Object Approach

If you already have a static set of key–value pairs, you can directly assign an object to your operation:

```typescript
operation.mobileTokenData = {
    deviceFingerprint: "abc123def456",
    riskScore: 0.8,
    location: { latitude: 50.0755, longitude: 14.4378 }
}
```

### Builder-Based Approach

For more dynamic, structured, or multi-step data, use the `WMTMobileTokenDataBuilder`.

```typescript
import { WMTMobileTokenDataBuilder } from 'react-native-mtoken-sdk'

// Create the builder (optionally with initial data)
const builder = new WMTMobileTokenDataBuilder({ deviceFingerprint: "abc123" })

// Add generic entries
builder.put("riskScore", 0.82)

// Assign to the operation
operation.mobileTokenData = builder.build()
```

### Record Helpers

Sometimes, additional data attached to `mobileTokenData` is not just a few key–value pairs. It can represent structured sections of information (for example, a timeline of user actions).

To support these cases, the SDK defines the `WMTMobileTokenDataRecord` interface:

```typescript
interface WMTMobileTokenDataRecord {
    /** Top-level key under which this record is stored. */
    key: string

    /** Produces the value to store for this key. */
    build(): unknown
}
```

You can pass records to the builder with `builder.put(record)`.

### Predefined Record Helper: `WMTPreApprovalScreensRecorder`

The SDK includes a predefined implementation, `WMTPreApprovalScreensRecorder`, which records how users navigate through Pre-Approval screens.

Each recorded "visit" contains:

- Screen identifier (`screen`)
- Opening timestamp
- Closing timestamp
- User action (`CONTINUE`, `CLOSE`, `REJECT`, `SCAN`, etc.)

The `WMTPreApprovalScreensRecorder` exposes the following methods:

- `begin(id)` – starts a new visit for the given screen ID. If another visit is already open, it is automatically added to the list (without a closing timestamp or action).
- `end(id, action)` – closes the current visit if the given id matches. Otherwise, falls back to the most recent recorded visit if it has the same id and is still unclosed.
- `reset()` – resets recorded visits.

```typescript
import { WMTMobileTokenDataBuilder, WMTPreApprovalScreensRecorder } from 'react-native-mtoken-sdk'

// Create MobileTokenData builder instance
const builder = new WMTMobileTokenDataBuilder()

// Create the screen recorder
const screenRecorder = new WMTPreApprovalScreensRecorder()

// Display UI for the PreApproval screen and record that it was shown
screenRecorder.begin(screen.id)
// Record when user leaves the PreApproval screen
screenRecorder.end(screen.id, "CONTINUE")

// ... repeat for all screens from operation.ui.preApprovalScreens

// When the PreApproval flow is finished, pass the recorder to the builder
builder.put(screenRecorder)

// Assign created mobileTokenData to the Operation before approving/rejecting
operation.mobileTokenData = builder.build()
```

The `mobileTokenData` is completely optional and the structure is customer-specific. If you don't need this functionality, you can continue using operations without providing this property.

## TOTP Proximity Check

Two-Factor Authentication (2FA) using Time-Based One-Time Passwords (TOTP) in the Operations is facilitated through the use of proximity check. This allows secure approval of operations through QR code scanning or deeplink handling.

**QR Code Flow:**

When the `WMTUserOperation.ui.preApprovalScreens` contains a screen with `type` == `QR_SCAN`, the app should open the camera to scan the QR code before confirming the operation. Use the camera to scan the QR code containing the necessary data payload for the operation.

**Deeplink Flow:**

When the app is launched via a deeplink, preserve the data from the deeplink and extract the relevant data. When operations are loaded compare the operation ID from the deeplink data to the operations within the app to find a match.

- Assign TOTP and Type to the Operation.
- Once the QR code is scanned or a match from the deeplink is found, create a `WMTUserOperationProximityCheck` with:
  - `totp`: The actual Time-Based One-Time Password.
  - `type`: Set to `QR_CODE` or `DEEPLINK`.
  - `timestampReceived`: The timestamp when the QR code was scanned (by default, it is created as the current timestamp when the object is instantiated).

- Authorizing the `WMTUserOperationProximityCheck`
  When authorizing, the SDK will by default add `timestampSent` to the `WMTUserOperationProximityCheck` object. This timestamp indicates when the operation was sent.

### WMTPACUtils

- For convenience, a utility class for parsing and extracting data from QR codes and deeplinks used in the PAC (Proximity Anti-fraud Check), is provided.

```typescript
export interface WMTPACData {

    /** The ID of the operation associated with the TOTP */
    oid: string

    /** The actual Time-based one time password (proximity OTP) */
    potp?: string
}
```

- two methods are provided:
  - `parseDeeplink(url: string): WMTPACData?` - url is expected to be in the format `scheme://code=$JWT` or `scheme://operation?oid=5b753d0d-d59a-49b7-bec4-eae258566dbb&potp=12345678`
  - `parseQRCode(code: string): WMTPACData?` - code is to be expected in the same format as deeplink formats or as a plain JWT
  - mentioned JWT should be in the format `{"type":"JWT", "alg":"none"}.{"oid":"5b753d0d-d59a-49b7-bec4-eae258566dbb", "potp":"12345678"}`

- Accepted formats:
  - notice that the totp key in JWT and in query shall be `potp`!

## Read Next

- [Using Push](./Using-Push.md)