# Changelog

## 3.0.0 (TBA)
- Implemented OIDC activation
- Added PreApproval Screens & PreApprovalScreensRecorder support ([documentation](Using-Operations.md#pre-approval-screens))
- Added `reject(operation, reason)` overload that includes `operation.mobileTokenData` in the request for passing customer-specific data

## 2.1.0
- Added `mobileTokenData` to authorize request for passing customer-specific data ([documentation](Using-Operations.md#Passing-Additional-Mobile-Token-Data))
  - Available with PowerAuth server 1.10+
  - Can be used for fraud detection systems (FDS) or other custom business logic
- `register` method in `WMTPush` now accepts `WMTPushData` object instead of separate parameters
  - for more information, see [migration guide](Version-2.1.md)

## 2.0.0

- Removed `react-native-device-info` dependency for react-native
- Removed `cordova-plugin-device` and `cordova-plugin-buildinfo` dependencies for Cordova
- `WMTPlatformUtils.getDefaultUserAgent` now return promise (`Promise<string>`)
- Minimal required version for `PowerAuth Mobile JS SDK` raised to `4.1.0`
- `PowerAuth Mobile JS SDK` is now a peer dependency, and you need to add it manually alongside the `mtoken-sdk-js`

## 1.1.0

- Removed `react-native-device-info` dependency for react-native
- Removed `cordova-plugin-device` and `cordova-plugin-buildinfo` dependencies for Cordova
- `WMTPlatformUtils.getDefaultUserAgent` now return promise (`Promise<string>`)
- Minimal required version for `PowerAuth Mobile JS SDK` raised to `3.2.0`
- `PowerAuth Mobile JS SDK` is now a peer dependency, and you need to add it manually alongside the `mtoken-sdk-js`

## 1.0.0

- Initial SDK release
- Supported platforms: React Native, Cordova
