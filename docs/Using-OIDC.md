# OIDC and PowerAuth Integration

- [Introduction](#introduction)
- [Getting an Instance](#getting-an-instance)
- [Retrieving Configuration](#retrieving-configuration)
- [Preparing OIDC Authorization Data](#preparing-oidc-authorization-data)
- [Registering URL Schemes for Deeplinks](#registering-url-schemes-for-deeplinks)
- [Open authorize URL in a web browser](#open-authorize-url-in-a-web-browser)
- [Handling URL Callbacks](#handling-url-callbacks)
- [Initiating PowerAuth Activation with OIDC](#initiating-powerauth-activation-with-oidc)
- [WMTOIDCUtils](#wmtoidcutils)
- [Read Next](#read-next)

## Introduction

The OIDC and PowerAuth integration enables secure user authentication and the preparation of necessary attributes to initiate a PowerAuth activation. This integration provides tools for managing OpenID Connect (OIDC) flows, including preparing for OIDC activation, processing redirect callbacks, and handling PKCE codes and authorization URLs.

OIDC is commonly used for scenarios like secure user login, authorization to access resources, or linking third‑party accounts and it can be leveraged for PowerAuth to create activation from it.

<!-- begin box warning -->
**Note:** Before using the OIDC and PowerAuth integration, you need to have a `PowerAuth` instance available.
<!-- end -->

The integration follows the [OpenID Connect Standard](https://openid.net/connect/) and enhances the flow with secure PKCE (Proof Key for Code Exchange) and state validation to ensure the integrity of the OIDC flow.


## Getting an Instance

The instance of `WMTOIDC` can be accessed after creating the main object of the SDK.

```ts
const mtoken = powerAuthInstance.createWultraMobileToken()
const oidc = mtoken.oidc
```

> If your app already has an initialized `WultraMobileToken` instance, just reuse that instance and access `mtoken.oidc`.


## Retrieving Configuration

The `getConfig()` method retrieves the OIDC provider configuration based on a predefined `providerId`, returning a `WMTOIDCConfig` object with essential details about the provider, client, and PKCE settings.

```ts
const providerId = "example_provider"
const oidcConfig = await oidc.getConfig(providerId)
```

### WMTOIDCConfig

The `WMTOIDCConfig` structure contains essential OIDC configuration values for authentication.

| Property       | Type      | Description                                                                                     |
|----------------|-----------|-------------------------------------------------------------------------------------------------|
| `providerId`   | `string`  | The unique identifier for the OIDC provider.                                                    |
| `clientId`     | `string`  | The OAuth 2.0 client ID used to form the URL for the authorization request.                     |
| `scopes`       | `string`  | A space-delimited list of OAuth 2.0 scopes for the authorization request.                       |
| `authorizeUri` | `string`  | The OAuth 2.0 authorization URI where the user is redirected for authentication.                |
| `redirectUri`  | `string`  | The OAuth 2.0 redirect URI where the server sends responses after authentication.               |
| `pkceEnabled`  | `boolean` | Indicates whether PKCE (Proof Key for Code Exchange) should be used in the authentication flow. |

---

## Preparing OIDC Authorization Data

The `prepareAuthorizationData()` method generates the necessary data for initiating the OIDC authorization process from `WMTOIDCConfig`. `WMTOIDCConfig` can be obtained by calling `getConfig(providerId)` or instantiated directly.

### WMTOIDCAuthorizationRequest

Encapsulates the data required to initiate the OIDC authorization flow and also other properties for the PowerAuth activation flow.

| Property       | Type        | Description                                              |
|----------------|-------------|----------------------------------------------------------|
| `authorizeUri` | `URL`       | URL to redirect the user for OIDC authentication.        |
| `providerId`   | `string`    | Identifier for the OIDC provider configuration.          |
| `nonce`        | `string`    | Random value to prevent replay attacks.                  |
| `state`        | `string`    | Random value to maintain state between request/callback. |
| `codeVerifier` | `string?`   | PKCE code verifier, if applicable.                       |

### Example

```typescript
try {
  const authRequest = await oidc.prepareAuthorizationData(oidcConfig)
  // Use authRequest.authorizeUri to open the secure browser
} catch (e) {
  // Handle failure
}
```

## Registering URL Schemes for Deeplinks

Before the React Native/Cordova application can receive an OIDC callback, each platform must register the redirect URL scheme used by your OIDC provider. Registration is fully platform-specific.

### iOS (Info.plist)

iOS requires registering a custom URL scheme in `Info.plist` so the app can receive the callback from the OIDC authorization flow.

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
    <key>CFBundleURLName</key>
    <string>com.example.myapp</string>
  </dict>
</array>
```

On iOS, the full callback URI will be `myapp://oidc/callback` (scheme `myapp` + host `oidc` + path `/callback`).

### Android (AndroidManifest.xml)

In your Android project (`android/app/src/main/AndroidManifest.xml`), register an `intent-filter` for your redirect URI, for example `myapp://oidc/callback`:

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="myapp"
            android:host="oidc"
            android:path="/callback" />
    </intent-filter>
</activity>
```

The scheme, host, and path must correspond to your redirect URI (for example, `myapp://oidc/callback`). The activity receiving the callback forwards the URL into the React Native layer via `Linking`.


## Open authorize URL in a web browser

After preparing the OIDC authorization request, the application must open the authorization URL in a secure browser context.

Because this SDK does not include UI logic, opening the URL is up to the app. Recommended secure approaches:

- **iOS:** `ASWebAuthenticationSession`
- **Android:** Chrome Custom Tabs (or equivalent)


## Handling URL Callbacks

Once the platform is able to receive the redirect URI, you must forward the callback URL to the OIDC flow in your JavaScript application.

This SDK does not automatically receive deeplink callbacks. Delivering the callback URL into JavaScript is the responsibility of the host application (React Native, Cordova, or any other JS runtime)


What the callback looks like

After the user finishes authentication in the browser, the OIDC provider redirects back to your app, for example:

```
myapp://path?code=...&state=...
```

Your app must pass this final URL together with previously obtained authRequest (from prepareAuthorizationData method) to `WMTOIDCUtils.processWebCallback(deeplinkUrl, authRequest)`.


## Initiating PowerAuth Activation with OIDC

Once you have the callback URL, process it to obtain OIDC parameters and create a PowerAuth activation.

```ts
import { PowerAuthActivation, PowerAuthAuthentication } from "react-native-powerauth-mobile-sdk"
import { WMTOIDCUtils } from "./oidc/WMTOIDCUtils"

try {
    // Process callback url
    const oidcParams = WMTOIDCUtils.processWebCallback(callbackUrl, authRequest)

    // Create activation object with OIDC parameters
    const activation = PowerAuthActivation.createWithOIDCParameters(oidcParams, "Petr's phone")
    
    const result = await powerAuth.createActivation(activation);
    // No error occurred, proceed to credentials entry (PIN prompt, Enable Biometry, ...) and persist the activation
    // The 'result' contains 'activationFingerprint' property, representing the device public key - it may be used as visual confirmation
    // If server supports recovery codes for activations, then `activationRecovery` property contains object with information about activation recovery.
} catch (error) {
    // Error occurred, report it to the user
}
```

<!-- begin box warning -->
**Note:** The `state` is validated inside `processWebCallback()`. Always pass the same `authRequest` instance you used to open the authorization URL.
<!-- end -->

---

## WMTOIDCUtils

`WMTOIDCUtils` provides helper methods for generating PKCE codes, creating authorization URLs, and processing OIDC callback URLs into PowerAuth activation attributes. The implementation uses `PowerAuthCryptoUtils` for cryptographically secure randomness and SHA‑256 hashing.

### PKCE

Provides methods for generating PKCE codes.

- **`createPKCE(dataLength: number): Promise<WMTPKCECodes>`**

Generates a `WMTPKCECodes` instance containing `codeVerifier`, `codeChallenge`, and `codeMethod` (`S256`). The `dataLength` parameter specifies the number of random bytes used for the code verifier (internally clamped to a safe range, typically 32–96 bytes, which corresponds to 43–128 Base64 URL‑safe characters).

```ts
try {
  const pkceCodes = await WMTOIDCUtils.createPKCE(32)
  // PKCE codes created successfully
} catch (e) {
  // Error generating PKCE codes
}
```

### Random String Generation

Provides a method to generate cryptographically secure random strings in Base64 URL‑safe format, commonly used for nonces, states, or custom PKCE verifiers.

- **`getRandomBase64UrlSafe(dataLength: number): Promise<string>`**

Generates a random Base64 URL‑safe string (without padding) using `PowerAuthCryptoUtils.randomBytes`.

```ts
try {
  const nonce = await WMTOIDCUtils.getRandomBase64UrlSafe(32)
} catch (e) {
  // Error generating random string
}
```

### Authorization URL

Provides a method for constructing the OIDC authorization URL with all required query parameters.

- **`createAuthorizationUrl(params): URL`**

Creates an authorization `URL` using values from `WMTOIDCConfig` (authorize URI, client ID, redirect URI, scopes) and the supplied `nonce`, `state`, and optional PKCE codes.

```ts
const url = WMTOIDCUtils.createAuthorizationUrl({
  config,
  nonce,
  state,
  pkceCodes,
})
```

### Web Callback Processing

Provides a method to process the OIDC callback URL and convert it into PowerAuth activation attributes.

- **`processWebCallback(deeplinkUrl: string | URL, authData: WMTOIDCAuthorizationRequest): PowerAuthOIDCParameters`**

Validates the callback URL, extracts the authorization `code` and `state`, compares the `state` with `authData.state`, and returns `PowerAuthOIDCParameters` suitable for `PowerAuthActivation.createWithOIDCParameters()`.

```ts
try {
  const params = WMTOIDCUtils.processWebCallback(callbackUrl, authRequest)
  const activation = PowerAuthActivation.createWithOIDCParameters(params, "Petr's phone")
} catch (e) {
  // Callback invalid / state mismatch / missing code
}
```

---

## Read Next

- [Server Error Handling](./Server-Error-Handling.md)
