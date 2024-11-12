# How to Use the SDK

> [!WARNING]
> The SDK is still in development and not available in the npm. Full documentation will be available later.

## Integration

Add the SDK to your `package.json`:

```json
"dependencies": {
    "react-native-powerauth-mobile-sdk": "^2.5.1",
    "react-native-mtoken-sdk" : "git://github.com/wultra/react-native-mtoken-sdk.git#develop"
}
```

> [!NOTE]
> This adds a development version of the SDK MobileToken to your project. A stable version will be released soon.

## Usage

### Prerequisites

To use the `MobileToken` object, you need a `PowerAuth` instance. 

When calling any of the `MobileToken` methods, be sure that the `PowerAuth` instance is active, otherwise, you'll get a PowerAuth error.

### Sample code

```ts
import { PowerAuth } from 'react-native-powerauth-mobile-sdk';
import { MobileToken } from 'react-native-mtoken-sdk';

let powerAuth = new PowerAuth("my-instance");
let mtoken = new MobileToken(powerAuth);

// fetches operation list. PowerAuth instance needs to be activated.
let list = await mtoken.operationList();
```

## Language configuration

The `MobileToken` class contains the `acceptLanguage` property that "informs the server" in which languages should be operations returned.

For example, when the value is set to `en`, the title of the message could return "System Login" and when `de`, it might be "Systemanmeldung".

> [!NOTE]
> Availability of the language depends on the configuration of the backend and the operation.

## Available Features

### Operation List

Fetches list of operations waiting for approval from the server.

#### Example

```ts
let list = await mtoken.operationList();
if (list.responseObject) { // success
    // do something with the list
} else if (list.responseError) { // API error
    // process the error
}
```

### Operation Detail

Fetches a single operation that is waiting for approval.

#### Example

```ts
let operationId = "id-of-the-operation" // operation ID

let list = await mtoken.operationDetail(operationId);
if (list.responseObject) { // success
    // do something with the operation
} else if (list.responseError) { // API error
    // process the error
}
```

### Operation Authorization

Authorizes an operation that is waiting for approval.

#### Example

```ts
// operation to approve from the server
let operation = await mtoken.operationDetail("my-operation-to-approve");
// or you can create your own. Both of these values need to be fetched from your own API endpoint/server.
let ownOperation = {
    id: "my-operation-to-approve",
    data: "DataToSign"
};

// Password that the user set up when activating the PowerAuth instance. 
// This should be entered by the user.
let pin = "1111"; 
// Authentication object that will sign the operation
// Or use PowerAuthAuthentication.biometry when operation allows it.
let auth = PowerAuthAuthentication.password(pin);
let response = await mtoken.authorize(operation, auth);
if (response.status == "OK") {
    // operation authorized
} else {
    // error - see response.responseError for more
}
```

### Operation Reject

Rejects an operation that is waiting for approval.

#### Example

```ts
let operationId = "your-operation-id";
let response = await mtoken.reject(operationId, "INCORRECT_DATA");
if (response.status == "OK") {
    // operation rejected
} else {
    // error - see response.responseError for more info
}
```

### Register for push notifications

Registering the device for the push notifications about operations tied to the current PowerAuth activation.

> [!TIP]
> It's recommended to call this method at each app's start as the token might expire without any prior warning.

#### Example

```ts
// this example uses expo-notifications package
import * as Notifications from 'expo-notifications';

const { status: existingStatus } = await Notifications.getPermissionsAsync();
let finalStatus = existingStatus;

if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
}
if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
}
let token = (await Notifications.getDevicePushTokenAsync()).data;

let response = await mtoken.registerForPush(token);

if (response.status == "OK") {
    // push registered
} else {
    // error - see response.responseError for more info
}
```
