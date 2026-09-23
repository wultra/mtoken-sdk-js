# PowerAuth 5 migration

Construction remains synchronous. Service URLs now resolve from asynchronous PowerAuth configuration on each request; missing configuration rejects the request. Individual services still accept an explicit URL.

`authorizeOffline()` keeps its public signature and uses `offlineAuthenticationCode()`. Protocol 4 offline QR signatures use `WMTSigningKey.MAC_PERSONALIZED` (type `2`, 32 bytes); legacy types `0` and `1` remain supported. See [QR signature verification](Using-Operations.md#processing-scanned-qr-operation).

Networking owns authentication headers and encryption. Encrypted request processors receive a `Uint8Array` body: preserve its bytes and the supplied headers. Algorithm selection remains with PowerAuth and the backend.
