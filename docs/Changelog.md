# Changelog

## 1.1.0 (6/2025)

- Removed `react-native-device-info` dependency for react-native
- Removed `cordova-plugin-device` and `cordova-plugin-buildinfo` dependencies for Cordova
- `WMTPlatformUtils.getDefaultUserAgent` now return promise (`Promise<string>`)
- Minimal required version for `PowerAuth Mobile JS SDK` raised to `3.2.0`
- `PowerAuth Mobile JS SDK` is now a peer dependency, and you need to add it manually alongside the `mtoken-sdk-js`

## 1.0.0 (2/2025)

- Initial SDK release
- Supported platforms: React Native, Cordova
