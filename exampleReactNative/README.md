# React Native example and device tests

For automated full-suite runs with JUnit results and a failing exit status on errors, use `yarn e2e rn android` or `yarn e2e rn ios` from the repository root. The equivalent workspace commands are `yarn workspace exampleReactNative test android` and `yarn workspace exampleReactNative test ios`. See [Native integration tests](../E2E-Tests.md) for PAC fixtures and CI setup.

This app is a Yarn workspace. It links `react-native-mtoken-sdk` locally, and Metro resolves the editable source in `packages/lib-shared/js`. SDK edits reach the app after reload; there is no tarball reinstall step. Only `yarn e2e rn …` bundles the packed npm tarball instead (via `MTOKEN_E2E_SDK_PACKAGE`).

TypeScript also resolves the SDK directly from shared source, so autocomplete and Go to Definition work after `yarn install` and follow SDK edits immediately. Run `yarn typecheck` from the repository root to check both the SDK and this example, or `yarn typecheck:example` to check the example alone. These checks do not require a prior SDK build.

## Setup

From this repository root:

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
