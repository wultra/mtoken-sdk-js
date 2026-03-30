# exampleReactNative

React Native test app for the Wultra Mobile Token JS SDK. Runs integration tests on-device against a live PowerAuth server. Tests execute automatically at app launch.

## Prerequisites

- Node.js ≥ 18
- [React Native environment](https://reactnative.dev/docs/environment-setup) set up (Xcode, CocoaPods, Android Studio)
- Root SDK dependencies installed (`yarn install` in the repo root)

## Configure Credentials

Tests require a live PowerAuth server. Copy the credentials template and fill in your values:

```bash
cp src/tests/utils/credentials.json src/tests/utils/credentials-private.json
# Edit credentials-private.json with your server URL, login, password, app ID, etc.
```

The `credentials-private.json` file is git-ignored.

## Running on iOS

> **Note:** This app uses **npm** (not yarn). The SDK is installed from a gulp-built `.tgz` file.

```bash
# 1. Build the SDK (from repo root)
cd /path/to/mtoken-sdk-js
yarn install
gulp

# 2. Install dependencies and the SDK package
cd exampleReactNative
npm install
npm r react-native-mtoken-sdk
npm i ../build/react-native/react-native-mtoken-sdk-0.0.1-dev.tgz

# 3. Install CocoaPods (use system pod, not bundle exec)
cd ios
pod install
cd ..

# 4. Start Metro bundler
npx react-native start --reset-cache

# 5. Build & run from Xcode
#    Open: ios/exampleReactNative.xcworkspace
#    Press ⌘R to build and run
```

**Quick reinstall after SDK changes:**

```bash
npm run reinstall        # rebuilds SDK via gulp + reinstalls .tgz
# Then reload Metro (⌘R in Simulator) or restart the app
```

## Running on Android

Follow steps 1–2 from the iOS section (build SDK + install deps), then:

```bash
# Start Metro bundler
npx react-native start --reset-cache

# In a second terminal — build and run on Android
npx react-native run-android
```

Or open `android/` in Android Studio and run from there.

**Physical device:** If the app shows "Unable to load script", Metro can't be reached from the phone. Run:

```bash
adb reverse tcp:8081 tcp:8081
```

Then restart the app. This tunnels the Metro port from the device to your Mac (only needed for physical devices, not emulators).

## Test Structure

Tests auto-discover and run all methods starting with `test` in each suite:

| Suite | What it tests |
|-------|---------------|
| `TestSuite_Deserialization` | Response/model deserialization |
| `TestSuite_Integration` | Operations (approve, reject, fetch) |
| `TestSuite_IntegrationInbox` | Inbox message management |
| `TestSuite_Logger` | SDK logger |
| `TestSuite_OIDC` | OpenID Connect activation flow |
| `TestSuite_PACUtils` | PowerAuth activation code utilities |
| `TestSuite_QRParser` | QR code parsing |

## Troubleshooting

- **`Unable to load script` on Android physical device** — The phone can't reach Metro on your Mac. Run `adb reverse tcp:8081 tcp:8081` to tunnel the port, then restart the app. This is only needed for physical devices, not emulators.
- **`createWultraMobileToken is not a function`** — You likely compiled with `npx tsc` instead of `gulp`. Always use `gulp` to build the SDK.
- **CocoaPods errors with Ruby 3.4** — Use system `pod install` directly, not `bundle exec pod install`. System CocoaPods 1.16+ handles Ruby 3.4 correctly.
- **`Cannot find module 'react-native/scripts/react_native_pods.rb'`** — `node_modules` is missing. Run `npm install` in `exampleReactNative/` first, then `pod install`.
