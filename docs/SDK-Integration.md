# SDK Integration

- [PowerAuth JS SDK Dependency](#powerauth-js-sdk-dependency)
- [Installation for React Native](#react-native-installation)
- [Installation for Cordova](#cordova-installation)

## PowerAuth JS SDK Dependency

The PowerAuth JS SDK is a required peer dependency for the mToken SDK. You must install it in a compatible version. 

Defining it as a peer dependency ensures that only a single instance of the PowerAuth SDK is used in your project, preventing issues with multiple npm clones.

- For **React Native**, install both `react-native-powerauth-mobile-sdk` and `react-native-mtoken-sdk` using `npm` or `yarn`.
- For **Cordova**, add both `cordova-powerauth-mobile-sdk` and `cordova-mtoken-sdk` using the `cordova plugin add` command.

### Compatible PowerAuth Mobile JS SDK Versions

| mToken Version | PowerAuth JS SDK |
|----------------|------------------|
| `1.1.x`        | `^3.2.0`         |
| `1.0.x`        | `^3.0.0`         |

## React Native Installation

### Supported Platforms

The library is available for the following __React Native (0.73+)__ platforms:

- __Android 5.0 (API 21)__ and newer
- __iOS 13.4__ and newer

### How To Install

#### 1. Install packages via npm
```sh
# if now added yet, add powerauth mobile sdk first (compatible versions are on the top of this document)
npm i react-native-powerauth-mobile-sdk --save
npm i react-native-mtoken-sdk --save
```

#### 2. Install pods for iOS (if needed)

To make integration work with iOS, you might need to install Pods (needed for PowerAuth):

```sh
cd ios
pod install
```

#### 3. Import in your js/ts files

```typescript
import { PowerAuth } from 'react-native-powerauth-mobile-sdk';

function createMtokenInstance() {
    const powerAuth = new PowerAuth("my-instance")
    // note that an activated PowerAuth instance is required. How to activate the PowerAuth instance, follow https://github.com/wultra/react-native-powerauth-mobile-sdk documentation.
    
    // Then, use PowerAuth's helper function to create the mtoken instance:
    const mtoken = powerAuth.createWultraMobileToken()
}
```

## Cordova Installation

### Supported Platforms

The library is available for the following __Apache Cordova (>=12.0.0)__ platforms:

- __Android 7.0 (API 24)__ and newer (cordova-android version >=12.0.0)
- __iOS 11.0__ and newer (cordova-ios version >=7.0.0)

### How To Install

#### 1. Install plugins via the Cordova plugin installer
```sh
# if now added yet, add powerauth mobile sdk first (compatible versions are on the top of this document)
cordova plugin add cordova-powerauth-mobile-sdk
cordova plugin add cordova-mtoken-sdk
```

#### 2. Install pods for iOS (if needed)

To make integration work with iOS, you might need to install Pods (needed for PowerAuth):

```sh
cd platforms/ios
pod install
```

#### 3. Start using Wultra Mobile Token classes

```typescript
const powerAuth = new PowerAuth("my-instance")
// note that an activated PowerAuth instance is required. How to activate the PowerAuth instance, follow https://github.com/wultra/react-native-powerauth-mobile-sdk documentation.

// Then, use PowerAuth's helper function to create the mtoken instance:
const mtoken = powerAuth.createWultraMobileToken()
```

## Read Next

- [Example Usage](./Example-Usage.md)
