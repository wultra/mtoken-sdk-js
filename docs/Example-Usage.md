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

## Read Next

- [Using Operations](./Using-Operations.md)