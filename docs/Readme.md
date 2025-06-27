# Wultra Mobile Token JS SDK

__Wultra Mobile Token JS SDK__ is a high-level SDK for operation approval.

<!-- begin box info -->
We currently support __REACT NATIVE__ and __APACHE CORDOVA__ development platforms.
<!-- end -->
 
With Wultra Mobile Token (WMT) SDK, you can integrate an out-of-band operation approval into an existing mobile app, instead of using a standalone mobile token application. WMT is built on top of [PowerAuth Mobile JS SDK](https://github.com/wultra/react-native-powerauth-mobile-sdk). Individual endpoints are described in the [Mobile Token API](https://developers.wultra.com/components/enrollment-server/develop/documentation/Mobile-Token-API).

To understand the Wultra Mobile Token SDK purpose on a business level better, you can visit our own [Mobile Token application](https://www.wultra.com/mobile-token). We use (native) Wultra Mobile Token SDK in our mobile token application as well.

WMT SDK library does precisely this:

- Retrieves the list of operations that are pending approval for a given user.
- Approves or rejects operations with PowerAuth transaction signing.
- Registers an existing PowerAuth activation to receive push notifications.

Remarks:

- This library does not contain any UI.
- We also provide an [Android](https://github.com/wultra/mtoken-sdk-android) and [iOS](https://github.com/wultra/mtoken-sdk-ios) version of this library. 

## Open Source Code

The code of the library is open source and you can freely browse it in our GitHub at [https://github.com/wultra/mtoken-sdk-js](https://github.com/wultra/mtoken-sdk-js/#docucheck-keep-link)

<!-- begin remove -->
## Integration Tutorials

**Tutorials**

- [SDK Integration](./SDK-Integration.md)
- [Example Usage](./Example-Usage.md)
- [Using Operations](./Using-Operations.md)
- [Using Push](./Using-Push.md)
- [Using Inbox](./Using-Inbox.md)
- [Language and User-Agent Configuration](./Language-UserAgent-Configuration.md)

**Other**

- [Changelog](./Changelog.md)
- [Migration Guide](./Migration-Instructions.md)
<!-- end -->

## Support and compatibility

| Version | React Native<sup>1</sup> | Cordova   | PowerAuth JS SDK | Support Status  |
|---------|--------------------------|-----------|------------------|-----------------|
| `1.1.x` | `0.73+`                  | `12.0.0+` | `^3.2.0`         | Bugfixes        |
| `1.0.x` | `0.73+`                  | `12.0.0+` | `^3.0.0`         | Not supported   |

<!-- begin box info -->
> Note 1: The library may also work with other React Native versions but we don't guarantee compatibility. The specified version is the version that we use for the development and for the tests.
<!-- end -->

## License

All sources are licensed using the Apache 2.0 license. You can use them with no restrictions. If you are using this library, please let us know. We will be happy to share and promote your project.

## Contact

If you need any assistance, do not hesitate to drop us a line at [hello@wultra.com](mailto:hello@wultra.com) or our official [wultra.com/discord](wultra.com/discord) channel.

### Security Disclosure

If you believe you have identified a security vulnerability with Wultra Mobile Token SDK, you should report it as soon as possible via email to [support@wultra.com](mailto:support@wultra.com). Please do not post it to a public issue tracker.
