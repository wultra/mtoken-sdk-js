# Language and User-Agent Configuration

## Content Language

Before using any methods from this SDK that call the backend, a proper language should be set. A properly translated content is served based on this configuration. The property that stores language settings does not persist. You need to set `setAcceptLanguage` every time that the application boots.

<!-- begin box warning -->
Note: Content language capabilities are limited by the implementation of the server - it must support the provided language.
<!-- end -->

### Usage

The `WultraMobileToken` class offers an `setAcceptLanguage` method to change requested server language.

### Format

The default value is `en`. With other languages, we use values compliant with standard RFC [Accept-Language](https://tools.ietf.org/html/rfc7231#section-5.3.5).

## User-Agent

In the same manner, a user agent can be set via `setUserAgent` method. 
The user agent is sent with every request to the server (as a standard `User-Agent` HTTP header) and can be used for device/system detection.

User agent can be override on per-call basis in the `requestProcessor` parameter for each API call of the SDK.

### Default User Agent

Default value will look like: `MobileTokenJS/1.0.0 com.mycompany.myapp/1.5.2 (Apple; iOS/18.0; iPhone 14,3)`.

## Example

```typescript

const mtoken = new WultraMobileToken(powerAuth, "https://my-instance.mycompany.com/enrollment-server") // create the WultraMobileToken instance
mtoken.setAcceptLanguage("de") // set "requested content" to german language (default is english - "en")
mtoken.setUserAgent("myuseragent") // custom user agent
```
