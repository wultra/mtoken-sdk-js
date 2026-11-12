# Native integration tests

The React Native and Cordova examples run the same complete suites against the real PowerAuth native SDK and PowerAuth Cloud (PAC) v2 API. Tests cover serialization, pre-approval screens, PAC parsing, QR signatures and offline OTPs, logging, operations and proximity checks, push registration, inbox and OIDC configuration. No native bridge or backend is mocked in these runs.

The repository uses a small local runner instead of depending on the unpublished test packages from [PowerAuth #257](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/257). It follows the same design: the app runs the tests, streams structured results to an HTTP collector on the host, and explicitly completes the run. The collector validates every result against the test manifest and writes JUnit XML and a JSON summary. Failed setup, cleanup, assertions, incomplete runs, app crashes, unapproved skips and timeouts all produce a nonzero CLI exit status. Each test phase has a 90 second deadline and the full build/run has a 45 minute collector deadline.

## Configuration

Run `yarn install`. Copy `exampleReactNative/src/tests/utils/credentials.json` to `credentials-private.json` in the same directory. The private file is ignored by Git. Configure:

| Key | Required fixture |
| --- | --- |
| `cloudServerUrl` | PAC base URL exposing `/v2/registrations`, `/v2/operations` and `/v2/inbox/messages` |
| `cloudServerLogin`, `cloudServerPassword` | PAC Basic authentication credentials for disposable test data |
| `cloudApplicationId` | PAC application ID |
| `enrollmentUrl`, `sdkConfig` | Enrollment endpoint and mobile SDK configuration for that application |
| `oidcProviderId` | Non-PKCE OIDC provider configured on the enrollment server |
| `oidcProviderIdPkce` | PKCE OIDC provider configured on the enrollment server |

PAC must provide the `login` and `login_preApproval` operation templates used by the suite. The second template must support anonymous claiming, proximity checks and the `QR_SCAN` pre-approval screen. Use a dedicated test environment: these tests create registrations, operations and inbox messages, approve/reject operations, and remove registrations during cleanup.

Missing required PAC keys fail before a native build. Missing OIDC providers are reported as explicit skipped cases, and automated runs fail because the complete suite did not pass. For local runs against an environment without those providers, approve the skips explicitly with `--allow-skip OIDC` (a suite name or `Suite.testName`, repeatable) or `E2E_ALLOW_SKIP=OIDC` (comma-separated). Approved skips remain in the JUnit report; any other skip still fails. CI sets `E2E_ALLOW_SKIP=OIDC` in `mobile-e2e.yml`, so a PAC environment without OIDC providers still passes; remove it to require the OIDC cases. The optional hosted third-party OIDC login flow remains commented out as in the existing suite; OIDC provider configuration and PKCE generation are part of the active suite.

CI supplies the same JSON object in the repository secret `MTOKEN_TEST_CREDENTIALS`. The CLI writes it to a temporary ignored file with restrictive permissions and removes it when the run exits. Do not commit credentials, generated bundles or installed test applications: the app contains PAC test credentials. Uploaded artifacts contain validated case metadata only; arbitrary SDK exceptions, HTTP request/response bodies and device logs are excluded.

## Run all suites

Start one Android emulator (or select an existing device using `ANDROID_SERIAL`), or install an iOS simulator runtime. Android requires Java 17 and the SDK/NDK versions in the example build files. iOS requires Xcode, CocoaPods and the example's Ruby dependencies (`cd exampleReactNative && bundle install`).

From the repository root:

```bash
yarn test                    # runner and collector regression tests, no device/server
yarn typecheck
yarn packAll
yarn e2e rn android
yarn e2e cordova android
yarn e2e rn ios
yarn e2e cordova ios
```

Run the four E2E commands sequentially; they share a generated private collector configuration. Use `E2E_IOS_UDID` to select an iOS simulator; otherwise the CLI uses a booted iPhone or boots an available iPhone. It builds a standalone application with bundled JavaScript, installs and launches it, and waits for all results. Metro is not needed. The React Native run first packs and verifies the npm package (`yarn packReactNative`), extracts it to `.build/e2e/rn-sdk`, and bundles the app against that published `lib/index.js` instead of the workspace source, so the release artifact is what gets tested. Cordova installs the SDK as a built plugin. Android uses `adb reverse` to reach the loopback collector. Physical iOS devices are not supported by this automation.

Results are written to `artifacts/e2e/<runtime>-<platform>/summary.json` and `junit.xml`. Any build/install/launch failure, missing completion or missing case fails the command; an empty or partial run cannot pass. The CLI checks every 5 seconds that the app process is still running (`pidof` on Android, the simulator's `launchctl` list on iOS); after three consecutive misses it fails the run with `Native app process exited before the run completed` instead of waiting for the collector deadline. The manual example buttons remain available for debugging individual device runs.

## CI

`.github/workflows/ci.yml` runs runner/collector regression tests, typechecks and verifies both published packages on every PR. `.github/workflows/mobile-e2e.yml` independently builds and runs the complete suite for React Native and Cordova on Android and iOS on every same-repository PR and push to `develop`, including PR updates. All four results are uploaded separately, even when another combination fails.

Fork PRs run the nonsecret CI checks. The native jobs are visibly skipped for forks because PAC credentials must not be passed to untrusted code. For trusted PRs, a missing secret fails explicitly; it is not counted as native test coverage. Configure the PAC application and templates before enabling required native checks in branch protection; configure both OIDC providers so the OIDC cases run instead of being skipped.
