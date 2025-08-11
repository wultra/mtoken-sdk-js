# Migration from 2.0.x to 2.1.x

This guide contains instructions for migration from Mobile Token JS SDK version `2.0.x` to version `2.1.x`.

## Changes in `WMTPush` API

The `WMTPush` API has been updated to provide a more structured way of creating push platform instances. The following changes have been made:

- `register` method now accepts a `WMTPushPlatform` instance instead of individual parameters.
- New static methods for creating `WMTPushPlatform` instances for different push services have been added:
  - `WMTPushPlatform.apns(token: string, environment?: WMTAPNSEnvironment)` for Apple Push Notification Service (APNs).
  - `WMTPushPlatform.fcm(token: string)` for Firebase Cloud Messaging (FCM).
  - `WMTPushPlatform.hms(token: string)` for Huawei Mobile Services (HMS).
- The `supportLegacyServer` method is now a part of the `WMTPushPlatform` class, allowing you to specify if the platform should support legacy push registration (1.9 or earlier versions of the Wultra Mobile Token API).