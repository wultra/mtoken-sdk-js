# exampleCordova

Apache Cordova test app for the Wultra Mobile Token JS SDK. Runs the integration tests against a live PowerAuth server. Tests execute automatically on `deviceready`.

## Prerequisites

- Node.js ≥ 18
- Xcode (for iOS) or Android Studio (for Android)
- CocoaPods (for iOS)
- Root SDK dependencies installed (`yarn install` in the repo root)

## Configure Credentials

Tests share credentials with the React Native example. Copy the template and fill in your values:

```bash
cp ../exampleReactNative/src/tests/utils/credentials.json \
   ../exampleReactNative/src/tests/utils/credentials-private.json
# Edit credentials-private.json with your server URL, login, password, app ID, etc.
```

The Cordova build copies credentials from `exampleReactNative/src/tests/utils/` automatically.

## Running on iOS

```bash
# 1. Build the Cordova SDK package (from repo root)
cd /path/to/mtoken-sdk-js
yarn install
gulp cdv

# 2. Install deps, plugin, build and run (all-in-one)
cd exampleCordova
npm install
npm run freshIos
```

**What `freshIos` does:** reinstalls the Cordova plugin from the built package → builds the iOS project → runs on simulator.

### Step by step (if you need more control)

```bash
npm run reinstallPlugin   # removes old plugin, rebuilds via gulp cdv, re-adds plugin
npm run buildIos          # bundles test JS with esbuild, runs cordova build ios
npm run ios               # runs on iOS simulator
```

## Running on Android

```bash
# 1. Build the Cordova SDK package (from repo root)
cd /path/to/mtoken-sdk-js
yarn install
gulp cdv

# 2. Install deps, plugin, build and run
cd exampleCordova
npm install
npm run freshAndroid
```

> **Note:** `config.xml` specifies `GradleVersion` and `AndroidGradlePluginVersion`. If you see `Unsupported class file major version` errors, your Java version may be too new for the configured Gradle. Update these preferences in `config.xml` or set `JAVA_HOME` to a compatible JDK.

## Build Process

The Cordova example has its own `gulpfile.js` that bundles the test app:

1. Copies test suites from `exampleReactNative/src/tests/` (shared test code)
2. Strips React Native–specific imports
3. Bundles everything with esbuild into `www/js/index.js`
4. Runs `cordova prepare ios` and patches native files from `patch-files/`

## Troubleshooting

- **`Unsupported class file major version`** — Your Java version is newer than the Gradle version in `config.xml` supports. Either update `GradleVersion`/`AndroidGradlePluginVersion` in `config.xml` or set `JAVA_HOME` to an older JDK (e.g., `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`).
- **`PowerAuth is not defined` / `deviceready` never fires** — The `cordova-powerauth-mobile-sdk` plugin is missing. This can happen when the Android platform is added after plugins were installed. Fix: `npx cordova plugin remove cordova-mtoken-sdk && npx cordova plugin add cordova-powerauth-mobile-sdk && npx cordova plugin add ../build/cdv`, then rebuild.
- **App stuck on "Loading javascript..."** — Usually caused by a missing plugin (see above). Check `adb logcat` for JS errors.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run freshIos` | Full clean rebuild + run on iOS |
| `npm run freshAndroid` | Full clean rebuild + run on Android |
| `npm run reinstallPlugin` | Remove & re-add the SDK Cordova plugin |
| `npm run rebuildPlugin` | Rebuild the SDK Cordova package via `gulp cdv` |
| `npm run buildIos` | Bundle JS + `cordova build ios` |
| `npm run buildAndroid` | Bundle JS + `cordova build android` |
| `npm run ios` | `cordova run ios` |
| `npm run android` | `cordova run android` |
| `npm run pods` | Re-run `pod install` in `platforms/ios/` |
