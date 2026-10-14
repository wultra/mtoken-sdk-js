# Migration from 2.1.x to 3.0.x

This guide provides instructions for migration from **Mobile Token JS SDK** version `2.1.x` to version `3.0.x`.

## Supported Platforms

- React Native 0.87+ and iOS 15.1+ are required on React Native.
- iOS 15.0+ is required on Cordova. The plugin sets the `deployment-target` preference to `15.0`. If your `config.xml` sets a lower value, raise it.

## Networking

- PowerAuth Networking JS is a new required peer dependency. On React Native, add `react-native-powerauth-networking` to your app. On Cordova, `cordova-powerauth-networking` is installed automatically as a plugin dependency.
- `WMTNetworking`, `WMTJsonConfig`, and `WMTE2EEConfiguration` have been removed. For custom requests, use `WPNNetworking`, `WPNResponseConfig`, and `WPNE2EEConfiguration` from PowerAuth Networking JS.
- `WMTResponse`, `WMTResponseError`, `WMTRequestProcessor`, `WMTKnownRestApiError`, and `WMTUserAgent` have been removed. Use `WPNResponse`, `WPNResponseError`, `WPNKnownRestApiError`, and `WPNUserAgent` from PowerAuth Networking JS instead. Existing members and values are unchanged; `WPNKnownRestApiError` additionally contains `ActivationCodeFailed`.
- The per-call `requestProcessor` parameter has been removed from all `WMTOperations`, `WMTPush`, `WMTInbox`, and `WMTOIDC` methods. To modify requests, pass `WPNRequestInterceptor` functions as the `requestInterceptors` parameter of the `WultraMobileToken` constructor or the `createWultraMobileToken` factory method. The interceptors are applied to all requests sent by the instance. See [Request Interceptors](Example-Usage.md#request-interceptors).

  ```typescript
  // Before (2.1.x)
  await mtoken.operations.getOperations(request => { /* modify request */ return request })

  // After (3.0.x)
  const mtoken = powerAuth.createWultraMobileToken(undefined, undefined, [request => { /* modify request */ return request }])
  await mtoken.operations.getOperations()
  ```
- The default User-Agent is now provided by PowerAuth Networking and starts with `PowerAuthNetworkingJS/` instead of `MobileTokenJS/`. `WMTPlatformUtils.getDefaultUserAgent()` has been removed.
- Networking can throw `WPNException`. Mobile Token validation still uses `WMTException`, and server errors remain in `response.responseError`.
- Configure HTTP logging through `WPNLoggerConfig`. `WMTLogger` only controls Mobile Token logs.

Service constructors remain synchronous. Unless you pass an explicit URL to a service, each request resolves its URL from the asynchronous PowerAuth configuration. A request rejects if that configuration is missing.

If you are upgrading from `3.0.0-beta-1`, also upgrade PowerAuth Networking JS from `2.0.0-beta-1` to `2.0.0-beta-2`. Both prereleases report version `2.0.0`, so an already installed beta-1 package or plugin satisfies the dependency and is not replaced automatically. On React Native, install the `2.0.0-beta-2` release of `react-native-powerauth-networking`. On Cordova, remove the `cordova-mtoken-sdk` plugin, which also removes `cordova-powerauth-networking` if it was installed as its dependency (if you added `cordova-powerauth-networking` directly, remove it as well), then add `cordova-mtoken-sdk` again. It installs PowerAuth Networking `2.0.0-beta-2` as its dependency.

PowerAuth Networking handles authentication headers and encryption. If you use a request interceptor, preserve the supplied headers and body. An encrypted request body is a `Uint8Array`; do not JSON-encode it. PowerAuth and the backend select the authentication algorithm.

## Offline Authorization and QR Signatures

`authorizeOffline()` keeps its public signature and uses PowerAuth's `offlineAuthenticationCode()`.

Protocol 4 offline QR signatures use `WMTSigningKey.MAC_PERSONALIZED` (type `2`, 32 bytes). QR signatures with legacy key types `0` and `1` remain supported. If your app verifies scanned QR operations, select the verification key from the parsed signature as shown in [QR signature verification](Using-Operations.md#processing-scanned-qr-operation).

## Pre-Approval Screen API

The singular `preApprovalScreen` property on `WMTUserOperationUIData` has been replaced by the plural `preApprovalScreens` array to support multi-screen pre-approval flows.

### Reading

```typescript
// Before (2.1.x)
const screen = operation.ui?.preApprovalScreen

// After (3.0.x)
const screens = operation.ui?.preApprovalScreens
const firstScreen = screens?.[0]
```

### Constructing

If you were constructing `WMTUserOperationUIData` manually, use `preApprovalScreens` (an array) instead:

```typescript
// Before (2.1.x)
const ui: WMTUserOperationUIData = {
  preApprovalScreen: myScreen,
}

// After (3.0.x)
const ui: WMTUserOperationUIData = {
  preApprovalScreens: [myScreen],
}
```

### Legacy Server Compatibility

If your server still sends the old singular `preApprovalScreen` payload, the SDK handles this automatically. The `WMTOperations` methods (`getOperations`, `getDetail`, `getHistory`, `claim`) call `normalizeOperation()` internally, which converts the legacy singular format to the new `preApprovalScreens` array.

## Pre-Approval Screen Model

The `WMTPreApprovalScreen` interface has been moved from `WMTUserOperationUIData` to its own module and has a new structure with support for elements and controls. The old `items` and `approvalType` fields are no longer part of the public model — they are converted automatically during legacy normalization.

### Old model (2.1.x)

```typescript
interface WMTPreApprovalScreen {
  type?: "INFO" | "WARNING" | "QR_SCAN" | "UNKNOWN"
  heading: string
  message: string
  items?: string[]
  approvalType?: "SLIDER" | "BUTTON"
}
```

### New model (3.0.x)

```typescript
interface WMTPreApprovalScreen {
  type?: WMTPreApprovalScreenType  // "INFO" | "WARNING" | "QR_SCAN" | "UNKNOWN"
  heading: string
  message: string
  id?: string
  backButton?: boolean
  image?: string
  elements?: WMTPreApprovalElement[]
  controls?: WMTPreApprovalControls
}
```

New supporting types are exported from the package: `WMTPreApprovalElement`, `WMTPreApprovalElementListItem`, `WMTPreApprovalElementAlert`, `WMTPreApprovalElementButton`, `WMTPreApprovalControls`, and related type aliases.

## Import Path

The import path for `WMTPreApprovalScreen` is unchanged — it is still exported from the package root. However, the type's shape has changed (new optional fields like `id`, `backButton`, `image`, `elements`, `controls`). All new supporting types (`WMTPreApprovalElement`, `WMTPreApprovalControls`, etc.) are also exported from the package root.

Deep imports (for example `react-native-mtoken-sdk/lib/operations/WMTOperations`) no longer work. Import everything from `react-native-mtoken-sdk`:

```ts
import { WMTOperations, WMTPreApprovalScreen } from "react-native-mtoken-sdk"
```
