# Cordova example and device tests

This Yarn workspace runs the same `TestExecutor` suites as the React Native example on actual Cordova iOS and Android apps. The SDK plugin is installed from `packages/lib-cordova/build`.

## Setup

From this repository root:

```bash
yarn install
cd exampleCordova
yarn setup
cd ..
```

`yarn setup` creates missing iOS and Android platforms from the Cordova packages installed by Yarn, builds the Mobile Token plugin, and installs all three SDK plugins. Set `exampleReactNative/src/tests/utils/credentials-private.json` for live integration tests. The Cordova bundle embeds these credentials at build time without logging them; the generated bundle is ignored by Git.

## Run

```bash
yarn runCordovaIos
yarn runCordovaAndroid
```

Each command bundles the shared tests, prepares the platform, and runs the app. Tests start after `deviceready`; results appear in the device log and an alert. Use `yarn workspace com.wultra.mtokentest installPlugin` after changing SDK source or plugin dependencies; it rebuilds the SDK and refreshes all three Cordova plugins.
