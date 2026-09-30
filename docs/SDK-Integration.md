# SDK Integration

- [PowerAuth JS SDK Dependencies](#powerauth-js-sdk-dependencies)
- [Installation for React Native](#react-native-installation)
- [Installation for Cordova](#cordova-installation)

## PowerAuth JS SDK Dependencies

The PowerAuth Mobile JS SDK and the PowerAuth Networking JS SDK are required peer dependencies for the mToken SDK. You must install them in a compatible version.

Defining them as peer dependencies ensures that only a single instance of each SDK is used in your project, preventing issues with multiple npm clones (for example, `WPNLoggerConfig` settings not applied or `instanceof WPNException` checks failing).

- For **React Native**, install `react-native-powerauth-mobile-sdk`, `react-native-powerauth-networking`, and `react-native-mtoken-sdk` using `npm` or `yarn`.
- For **Cordova**, add both `cordova-powerauth-mobile-sdk` and `cordova-mtoken-sdk` using the `cordova plugin add` command. `cordova-mtoken-sdk` declares `cordova-powerauth-mobile-sdk` and `cordova-powerauth-networking` as plugin dependencies, so compatible plugins are installed if missing, and the installation fails if an incompatible version is already installed.

## React Native Installation

### Supported Platforms

The library is available for the following __React Native (0.87+)__ platforms:

- __Android 7.0 (API 24)__ and newer
- __iOS 15.1__ and newer

### How To Install

#### 1. Install packages via npm
```sh
# if not added yet, add PowerAuth Mobile SDK and PowerAuth Networking SDK first
npm i react-native-powerauth-mobile-sdk --save
npm i react-native-powerauth-networking --save
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
- __iOS 13.0__ and newer (cordova-ios version >=7.0.0)

### How To Install

#### 1. Install plugins via the Cordova plugin installer
```sh
# if not added yet, add PowerAuth Mobile SDK first
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
