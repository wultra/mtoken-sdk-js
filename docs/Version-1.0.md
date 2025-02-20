# Migration from beta to 1.0.x

This guide contains instructions for migration from Mobile Token JS SDK version `beta` to version `1.0.x`.

## SDK repository change

The SDK codebase on Github has moved from [wultra/react-native-mtoken-sdk](https://github.com/wultra/react-native-mtoken-sdk) to a general [wultra/mtoken-sdk-js](https://github.com/wultra/mtoken-sdk-js) repository.

## Platform support

The SDK is now supported on both __REACT NATIVE__ and __APACHE CORDOVA__ development platforms.
See [SDK Integration guide](./SDK-Integration.md) for detailed information.

## SDK Initialization

The SDK can now be intialised through an extension method `createWultraMobileToken()` on the `PowerAuth` object:

```typescript
import { PowerAuth } from 'react-native-powerauth-mobile-sdk';

function createMtokenInstance() {
    const powerAuth = new PowerAuth("my-instance")
    // note that an activated PowerAuth instance is required. How to activate the PowerAuth instance, follow https://github.com/wultra/react-native-powerauth-mobile-sdk documentation.
    
    // Then, use PowerAuth's helper function to create the mtoken instance:
    const mtoken = powerAuth.createWultraMobileToken()
}
```

This is now the preferred initialization method. For more information, see the [SDK Integration guide](./SDK-Integration.md) and the method's documentation.

## Changes in API

The API surface has changed to mirror the one of native Mobile Token SDKs.

The following service methods have been renamed (while keeping the same signature):

### Operations

`pendingList` -> `getOperations`

`detail` -> `getDetail`

`history` -> `getHistory`

### Inbox

`unreadCount` -> `getUnreadCount`

`list` -> `getMessageList`

`detail` -> `getMessageDetail`

### Push

No changes.


### Set Accept Language API

Each of the services (e.g. `operations`, `inbox` and `push`) now support runtime change of the `Accept-Language` field for the outgoing requests headers through `acceptLanguage(lang: string)` setter.
