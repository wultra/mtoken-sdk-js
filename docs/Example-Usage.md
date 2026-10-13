# Example Usage

This is an example of the most common use case of this SDK - fetching operations and approving them.

## SDK Integration

Follow the [SDK Integration](./SDK-Integration.md) tutorial for SDK installation.

## Example Code

Example Typescript usage:

```typescript

// PowerAuth instance needs to be configured and a user-activated instance.
// More about PowerAuth SDK can be found here: https://github.com/wultra/react-native-powerauth-mobile-sdk

async function exampleUsage(powerAuth: PowerAuth) {
    const mtoken = powerAuth.createWultraMobileToken() // create the WultraMobileToken instance
    mtoken.setAcceptLanguage("de") // set "requested content" to german language (default is english - "en")
    try {
        const listResponse = await this.mtoken.operations.getOperations() // get operation list

        if (listResponse.responseObject && listResponse.responseObject.length > 0) { // make sure that we retrieved some operations
            
            const operation = listResponse.responseObject[0] // get the first operation from the list
            const auth = PowerAuthAuthentication.password("1234") // simulate that user entered PIN 1234
            const authResponse = await this.mtoken.operations.authorize(operation, auth) // authorize the operation
            if (authResponse.status == "OK") {
                // operation authorized
            } else {
                // error
            }
        }
    } catch (e) {
        //operation failed
        console.log(`Failure: ${e.message}`)
    }
}

```

## Request Interceptors

You can pass request interceptors to the `WultraMobileToken` constructor or the `createWultraMobileToken` factory method. Interceptors are called in the provided order for every request sent by the Mobile Token services (`operations`, `push`, `inbox`, `oidc`) of the instance, after the SDK has prepared the request, including its authentication headers and encryption. Each interceptor receives the request from the previous one and must synchronously return the request to send.

Interceptors are useful, for example, for adding custom HTTP headers like a correlation ID:

```typescript
import { WPNRequestInterceptor } from "react-native-powerauth-networking"

const correlationIdInterceptor: WPNRequestInterceptor = request => {
    const headers = new Headers(request.headers)
    headers.set("X-Correlation-ID", generateCorrelationId())
    return { ...request, headers }
}

const mtoken = powerAuth.createWultraMobileToken(undefined, undefined, [correlationIdInterceptor])
```

<!-- begin box warning -->
Do not modify the URL, the request body, or the `X-PowerAuth-*` headers. The body of an encrypted request is a `Uint8Array`, and changing any of these will cause the request to fail on the server.
<!-- end -->

## Read Next

- [Using Operations](./Using-Operations.md)