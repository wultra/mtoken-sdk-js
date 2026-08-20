---
name: code-review
description: Review pull requests in the Wultra Mobile Token JS SDK repository. Use when reviewing TypeScript APIs, transaction signing, OIDC, native bridges, security, or release changes.
---

# mtoken-sdk-js review

Review only PR and repository content already available. Do not run or suggest
commands, scripts, builds, tests, linters, formatters, validation tasks, or Git
operations. Determine the PR target and head from available content only. The
routine target is `develop`. Default to **approve** and raise only a proven
regression introduced in the PR: include `path:line`, concrete impact, and a
correction. Do not offer formatting, style, or CI advice.

Never post, submit, or resolve GitHub content without explicit user approval. Prefix any postable text with `🤖`.

## Published API and build boundary

`src/index.ts` is the React Native source entry point and re-exports the public `WMT*` API. Its extension module `src/PWAExtension.ts` installs `createWultraMobileToken()` onto `PowerAuth`; it must remain retained by the built package. The main public service graph is `WultraMobileToken` with `operations`, `push`, `inbox`, and `oidc`.

Shared TypeScript sources build to both products:

- RN package: root `package.json`, built to `build/react-native/`.
- Cordova package template and plugin: `cordova/package.json`, `cordova/plugin.xml`, with overrides in `cordova/src/`.
- `gulpfile.js` replaces `%%SDK_VERSION%%`, replaces RN imports for Cordova, applies the Cordova overrides, and bundles the Cordova output. Lines marked `@cordova-remove` have platform-specific meaning.

The PowerAuth mobile SDK is a peer/runtime dependency (`react-native-powerauth-mobile-sdk` or `cordova-powerauth-mobile-sdk`), never a bundled replacement. Review changes to `src/index.ts`, `cordova/src/`, `gulpfile.js`, or `PWAExtension.ts` together when they alter exports or platform loading.

## Security and async review

Trace backend changes through `src/networking/WMTNetworking.ts`. It serializes request JSON, signs with PowerAuth, optionally uses application-scope E2EE, calls `fetch`, decrypts a successful encrypted response, and maps the `WMTResponse<T>`/`WMTResponseError` contract. Flag only proven changes that lose signing, alter the signed plaintext, omit/replace an encryption header, decrypt with the wrong data, broaden sensitive logging, or change error/result semantics.

For operations in `src/operations/WMTOperations.ts`, preserve operation IDs, signature URI IDs, mobile-token data, and required MFA (`PowerAuthAuthentication`) when approving or rejecting. Treat QR parsing (`WMTQROperationParser.ts`) and PAC/OIDC helpers as untrusted-input boundaries: malformed Base64, fields, callback URL, or state must remain rejected rather than accepted or logged as sensitive data.

`WMTOIDCUtils.processCallbackUri()` must validate both authorization code and exact opaque `state`; do not allow callbacks to continue on missing/mismatched state. PKCE values and authorization data must not be logged. Promise-returning API operations must remain awaited/returned end-to-end—do not convert them to fire-and-forget calls or mix callback completion with a second Promise completion.

Push tokens, inbox contents, operation data, OTPs, credentials, authentication objects, signatures, E2EE payloads, and OIDC code/state are sensitive. Flag only an introduced exposure in logs, errors, serialization, or bridge handoff.

## Releases, docs, and evidence

The tracked package-build definition is in `gulpfile.js`, with CI configuration
in `.github/workflows/ci.yml`; read these files only as evidence. On a
release-to-`develop` transition, all declared development versions must be
`0.0.1-dev`: root `package.json`, the generated Cordova template/plugin
placeholders defined by Gulp, and `src/WMTSDKVersion.ts` must use
`%%SDK_VERSION%%` rather than a fixed release version.

`.prepare-release.json` requires release entries in `docs/Changelog.md` and compatibility streams in `docs/Readme.md` and `docs/SDK-Integration.md`. Update those public documents when a release, public API, supported PowerAuth version, or integration behavior changes. Only flag grammar in changed public docs/JSDoc when the PR base is not a release branch; do not make private-code grammar findings.

Integration test sources are under `exampleReactNative` for React Native and
`exampleCordova` for Cordova. For a meaningful protocol or bridge change,
require focused evidence in the available content that matches the affected
platform rather than assuming generated archives validate it. Tests may be
inspected as evidence, but never suggested for execution.
