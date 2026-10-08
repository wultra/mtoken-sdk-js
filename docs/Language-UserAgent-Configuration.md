# Language and User-Agent Configuration

## Content Language

Before using any methods from this SDK that call the backend, a proper language should be set. 
A properly translated content is served based on this configuration. 

<!-- begin box warning -->
Note: Content language capabilities are limited by the implementation of the server - it must support the provided language.
<!-- end -->

### Usage

You can specify the language in the `WultraMobileToken` constructor or `createWultraMobileToken` factory method of the `PowerAuth` class.

If you need to change the language at runtime, you can use the `setAcceptLanguage` method.

### Default Value and Format

The default value is `en`. With other languages, we use values compliant with standard RFC [Accept-Language](https://tools.ietf.org/html/rfc7231#section-5.3.5).

## User-Agent

In the same manner, a user agent can be set. 
The user agent is sent with every request to the server (as a standard `User-Agent` HTTP header) and can be used for device/system detection.

### Usage

You can specify the user-agent in the `WultraMobileToken` constructor or `createWultraMobileToken` factory method of the `PowerAuth` class.

User-agent can be overridden on the per-call basis in the `requestProcessor` parameter for each API call of the SDK.

Each service (`operations`, `push`, `inbox`, `oidc`) exposes its PowerAuth Networking client as `networking`. The user agent can also be changed there at runtime, for example `mtoken.operations.networking.userAgent = "MyApp/1.0"`. The SDK does not overwrite such a value.

### Default User Agent

The default value is provided by PowerAuth Networking and will look like: `PowerAuthNetworkingJS/1.0.0 com.mycompany.myapp/1.5.2 (Apple; iOS/18.0; iPhone 14,3)`.

## Example

```typescript
// create the WultraMobileToken instance set to french
const mtoken = powerAuth.createWultraMobileToken("fr")

// If needed, you can change the language at runtime
mtoken.setAcceptLanguage("de") // set "requested content" to german language
```
