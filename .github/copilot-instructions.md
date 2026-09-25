# Copilot Instructions — Wultra Mobile Token JS SDK

## Project Overview

TypeScript SDK for out-of-band operation approval (approve/reject pending operations via PowerAuth transaction signing). Built on top of [PowerAuth Mobile JS SDK](https://github.com/wultra/react-native-powerauth-mobile-sdk). Supports **React Native** and **Apache Cordova** from a single TypeScript source.

## Build and examples

The repository uses Yarn 4 workspaces with `nodeLinker: node-modules`. The shared TypeScript source is in `packages/lib-shared/js`; platform-specific Cordova overrides are in `packages/lib-cdv/src`. `scripts/build.mjs` stages the same published file layout as the pre-migration packages.

```bash
yarn install
yarn build             # both SDK packages
yarn build:rn          # React Native package
yarn build:cdv         # Cordova package
yarn typecheck         # shared TypeScript source
yarn packAll           # build and create release tarballs
```

Build the `0.0.1-dev` PowerAuth Networking tarballs in a sibling `networking-js` checkout before installing dependencies. The example apps are Yarn workspaces. React Native Metro loads `packages/lib-shared/js` directly and the start/run commands stage the version module in `.build/rn/src`; SDK edits appear after reload without a tarball reinstall. Cordova plugin installation rebuilds the Mobile Token SDK and refreshes its PowerAuth and Networking dependencies. The Cordova example uses `scripts/build-cordova-example.mjs` to bundle the shared on-device suites. Configure credentials in `exampleReactNative/src/tests/utils/credentials-private.json` and run both examples on iOS and Android as described in their READMEs.

The platform package manifests supply published package metadata. The build stages a copy of each manifest with paths adjusted to the packed layout. Keep the published entry points, declarations, Cordova globals, and dependency contracts compatible with prior releases. `yarn build` does not pack by default.

## Architecture

### Dual-platform from single source

```
packages/lib-shared/js/  → Shared TypeScript source (React Native imports)
packages/lib-cdv/src/    → Cordova-specific overrides
scripts/build.mjs        → Build and package staging
```

The Cordova build replaces React Native PowerAuth imports with Cordova equivalents and applies platform overrides from `packages/lib-cdv/src/`.

### SDK structure

Entry point: `packages/lib-shared/js/index.ts` → re-exports everything via `export * from`.

```
WultraMobileToken       → Main class, holds all service managers
├── operations          → WMTOperations (fetch, approve, reject operations)
├── push                → WMTPush (push notification registration)
├── inbox               → WMTInbox (user message inbox)
└── oidc                → WMTOIDC (OpenID Connect activation flow)
```

`PWAExtension.ts` extends `PowerAuth.prototype` with `createWultraMobileToken()` — this is how consumers instantiate the SDK from a PowerAuth instance.

### Networking

Each service owns a published PowerAuth Networking client and calls `networking.call()` with `WPNEndpoint` definitions. The internal `WMTService` base provides setup, User-Agent resolution, and response validation. Networking failures propagate as `WPNException`; Mobile Token validation uses `WMTException`. HTTP logging uses `WPNLoggerConfig`.

### Key types

- `WMTResponse<T>` — standard API response wrapper (`status: "OK" | "ERROR"`)
- `WMTResponseError` — server error with `code` (see `WMTKnownRestApiError`) and `message`
- `WMTException` — Mobile Token validation error; Networking can also throw `WPNException`

## Conventions

- **Releases:** On non-release branches, keep the SDK version at `0.0.1-dev`. Prepare package and changelog updates with `sh scripts/prepare-release.sh -v X.Y.Z`; use `--verify` to validate a release and `--prepare-dev` to restore development metadata afterward.
- **Naming:** All public types prefixed with `WMT` (e.g., `WMTOperations`, `WMTInbox`, `WMTException`). Files match their primary export name.
- **No trailing commas** in TypeScript (matches `.editorconfig` / project style).
- **Peer dependency:** `react-native-powerauth-mobile-sdk` (5.0.0) is a peer dependency — never bundle it.
- **`%%SDK_VERSION%%`:** Use this placeholder in source code for the SDK version string. The build stages a versioned copy; Metro resolves the staged version module.
- **Cordova compatibility:** Lines marked with `@cordova-remove` comment are stripped during Cordova build. Don't use RN-specific APIs without considering the Cordova path.
- **License header:** All source files must include the Apache 2.0 license header.
- **Module format:** TypeScript compiles to ES6 modules (`"module": "ES6"` in tsconfig).
