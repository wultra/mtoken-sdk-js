# Using Push

<!-- begin remove -->
- [Introduction](#introduction)
- [Getting an Instance](#getting-an-instance)
- [WMTPush API Reference](#wmtpush-api-reference)
- [Registering to Push Notifications Example](#registering-to-push-notifications-example)
## Introduction
<!-- end -->

`WMTPush` is responsible for registering the device for the push notifications about the operations that are tied to the current `PowerAuth` activation. For example, a push notification is received when a new operation is created.

<!-- begin box warning -->
Note: Before using `WMTPush`, you need to have a `PowerAuth` object available and initialized with a valid activation. Without a valid `PowerAuth` activation, the service will return an error.
<!-- end -->

<!-- begin box warning -->
Note: `WMTPush` only registers the device to receive push notifications, it does not process them - you need to handle that by yourself.
<!-- end -->

`WMTPush` communicates with the [Mobile Token API](https://developers.wultra.com/components/enrollment-server/develop/documentation/Mobile-Token-API).

## Getting an Instance

The instance of the `WMTPush` can be accessed after creating the main object of the SDK:

```typescript
const mtoken = powerAuthInstance.createWultraMobileToken()
const push = mtoken.push
```

## WMTPush API Reference

`WMTPush` has only one method:

- `async register(token: string, platform?: "ios" | "android" | "huawei", requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>>` - Language settings, that will be sent along with each request.
    - the value of the `token` parameter is platform dependent.
    - when the `platform` parameter is not provided, it is automatically resolved


## Registering to Push Notifications Example

```typescript
//This example uses expo-notifications package
import * as Notifications from 'expo-notifications'

private mtoken: WultraMobileToken

async function registerForPushNotifications() {

    const { status: existingStatus } = await Notifications.getPermissionsAsync()

    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
    }
    if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!')
        return
    }
    let token = (await Notifications.getDevicePushTokenAsync()).data

    let response = await this.mtoken.push.register(token)

    if (response.status == "OK") {
        // push registered
    } else {
        // error - see response.responseError for more info
    }
}
```

## Read Next
  
- [Using Inbox](./Using-Inbox.md)