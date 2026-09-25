# React Native example and device tests

This app is a Yarn workspace. It links `react-native-mtoken-sdk` locally, and Metro resolves the editable source in `packages/lib-shared/js`. SDK edits reach the app after reload; there is no tarball reinstall step.

TypeScript also resolves the SDK directly from shared source, so autocomplete and Go to Definition work after `yarn install` and follow SDK edits immediately. Run `yarn typecheck` from the repository root to check both the SDK and this example, or `yarn typecheck:example` to check the example alone. These checks do not require a prior SDK build.

## Setup

Build the `0.0.1-dev` Networking SDK tarballs in a sibling `networking-js` checkout first. Then, from this repository root:

```bash
yarn install
cd exampleReactNative/ios && pod install && cd ../..
```

For live integration tests, copy `exampleReactNative/src/tests/utils/credentials.json` to `credentials-private.json` and set the test server values. The private file is ignored by Git.

## Run

Start Metro in one terminal:

```bash
yarn startReact
```

In another terminal, run one platform:

```bash
yarn runReactIos
yarn runReactAndroid
```

The `TestExecutor` runs on app launch and reports the total, successful, and skipped tests in the device log and an alert. The suites cover deserialization, pre-approval screens, PAC utilities, QR parsing, logging, operations, inbox, and OIDC. Inspect failures and unexplained skips before treating a run as successful.
