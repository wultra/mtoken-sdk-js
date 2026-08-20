# Copilot Instructions — Wultra Mobile Token JS SDK

## Project Overview

TypeScript SDK for out-of-band operation approval (approve/reject pending operations via PowerAuth transaction signing). Built on top of [PowerAuth Mobile JS SDK](https://github.com/wultra/react-native-powerauth-mobile-sdk). Supports **React Native** and **Apache Cordova** from a single TypeScript source.

## Build

The build system uses **gulp** to produce two separate packages from the shared `src/`. The root uses **Yarn 4** with `nodeLinker: node-modules` (configured in `.yarnrc.yml`). The example app uses **npm**.

```bash
# Install root dependencies (Yarn 4, Node 18+)
yarn install

# Build both RN and Cordova packages
gulp                # or: yarn build
gulp rn             # React Native only
gulp cdv            # Cordova only
```

Output goes to `build/react-native/` and `build/cdv/` (each with its own `package.json` and `.tgz`).

### What the build does

1. Copies `src/` to a temp dir, replaces `%%SDK_VERSION%%` placeholders with the version from `package.json`
2. **React Native:** compiles TS → `build/react-native/lib/`, packs `.tgz`
3. **Cordova:** replaces RN imports with Cordova equivalents, patches `cordova/src/` overrides (e.g., `PWAExtension.ts`, `WMTPlatformUtils.ts`), bundles into a single CJS file via esbuild, generates `typings.d.ts`, packs `.tgz`

### Running the exampleReactNative iOS app

The example app installs the SDK from the gulp-built `.tgz` (not a workspace symlink). **Do not use `npx tsc`** to compile `lib/` locally — `PWAExtension.ts` has `export {}` which `tsc` drops, causing Metro to tree-shake the file and `createWultraMobileToken()` to never register.

```bash
# 1. Root — install deps and build SDK
cd /path/to/mtoken-sdk-js
yarn install
gulp

# 2. Example app — install deps and SDK from .tgz (uses npm, not yarn)
cd exampleReactNative
npm install
npm r react-native-mtoken-sdk
npm i ../build/react-native/react-native-mtoken-sdk-0.0.1-dev.tgz

# 3. iOS pods (use system CocoaPods, not bundler — avoids Ruby 3.4 gem issues)
cd ios
pod install
cd ..

# 4. Start Metro bundler
npx react-native start --reset-cache

# 5. Build & run from Xcode (⌘R)
#    Open: exampleReactNative/ios/exampleReactNative.xcworkspace
```

After changes to `src/`, repeat steps 1-2 (`gulp` + `npm i …tgz`) and reload Metro (or ⌘R in Xcode).

### Running the exampleCordova iOS app

```bash
# 1. Root — build Cordova package
cd /path/to/mtoken-sdk-js
yarn install
gulp cdv

# 2. Cordova example — install deps, plugin, build and run
cd exampleCordova
npm install
npm run freshIos          # reinstalls plugin, builds, and runs on iOS
```

Or step by step: `npm run reinstallPlugin` → `npm run buildIos` → `npm run ios`.

### Running tests

Tests are integration tests that run on-device against a live PowerAuth server. They execute automatically at app launch. Configure credentials in `exampleReactNative/src/tests/utils/credentials-private.json` before running.

## Architecture

### Dual-platform from single source

```
src/                    → Shared TypeScript source (React Native imports)
cordova/src/            → Cordova-specific overrides (replaces files during build)
gulpfile.js             → Build orchestration for both platforms
```

The Cordova build replaces all `react-native-powerauth-mobile-sdk` imports with `cordova-powerauth-mobile-sdk` and patches platform-specific files from `cordova/src/`.

### SDK structure

Entry point: `src/index.ts` → re-exports everything via `export * from`.

```
WultraMobileToken       → Main class, holds all service managers
├── operations          → WMTOperations (fetch, approve, reject operations)
├── push                → WMTPush (push notification registration)
├── inbox               → WMTInbox (user message inbox)
└── oidc                → WMTOIDC (OpenID Connect activation flow)
```

`PWAExtension.ts` extends `PowerAuth.prototype` with `createWultraMobileToken()` — this is how consumers instantiate the SDK from a PowerAuth instance.

### Networking

`WMTNetworking` is the base class for all service managers. It uses:
- Native `fetch()` for HTTP
- PowerAuth SDK for request signing (transaction signatures, token-based auth)
- Optional E2EE (end-to-end encryption) via `PowerAuthDecryptor`
- Configurable `Accept-Language` and `User-Agent` headers

### Key types

- `WMTResponse<T>` — standard API response wrapper (`status: "OK" | "ERROR"`)
- `WMTResponseError` — server error with `code` (see `WMTKnownRestApiError`) and `message`
- `WMTException` — SDK-level exception thrown on API or validation errors

## Conventions

- **Releases:** On non-release branches, keep the SDK version at `0.0.1-dev`. Prepare package and changelog updates with `sh scripts/prepare-release.sh -v X.Y.Z`; use `--verify` to validate a release and `--prepare-dev` to restore development metadata afterward.
- **Naming:** All public types prefixed with `WMT` (e.g., `WMTOperations`, `WMTInbox`, `WMTException`). Files match their primary export name.
- **No trailing commas** in TypeScript (matches `.editorconfig` / project style).
- **Peer dependency:** `react-native-powerauth-mobile-sdk` (^4.3.0) is a peer dependency — never bundle it.
- **`%%SDK_VERSION%%`:** Use this placeholder in source code for the SDK version string. It gets replaced during gulp build.
- **Cordova compatibility:** Lines marked with `@cordova-remove` comment are stripped during Cordova build. Don't use RN-specific APIs without considering the Cordova path.
- **License header:** All source files must include the Apache 2.0 license header.
- **Module format:** TypeScript compiles to ES6 modules (`"module": "ES6"` in tsconfig).
