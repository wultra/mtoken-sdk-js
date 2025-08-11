//
// Copyright 2024 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions
// and limitations under the License.
//

import { WMTNetworking, type WMTRequestProcessor, type WMTResponse } from "../networking/WMTNetworking"
import { PowerAuthAuthentication } from 'react-native-powerauth-mobile-sdk'

/** Push handling */
export class WMTPush extends WMTNetworking {

  /** 
   * Registers the PowerAuth activation for push notifications on the PowerAuth backend.
   * 
   * @param data Push platform and token retrieved from the device.
   * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
   * @returns Server response
   * 
   * ----
   * For example, to register an FCM (Firebase Cloud Messaging) token, you can use:
   * ```typescript
   * const pushData = WMTPushPlatform.fcm("your_fcm_token")
   * await mtoken.push.register(pushData)
   * ```
   * ----
   *
   * If you are using an older version of the Wultra Mobile Token API (1.9 or earlier), you may need to use the legacy format:
   * ```typescript
   * const pushData = WMTPushPlatform.fcm("your_fcm_token").supportLegacyServer()
   * await mtoken.push.register(pushData)
   * ```
   */
  async register(data: WMTPushPlatform, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>> {

    let anyData = data as any

    return await this.postSignedWithToken<void>(
      { requestObject: { token: anyData.token, platform: anyData.platform, environment: anyData.apnsEnvironment } },
      PowerAuthAuthentication.possession(),
      "/api/push/device/register/token",
      "possession_universal",
      false,
      requestProcessor
    )
  }
}

/// Environment for Apple Push Notification Service (APNs).
type WMTAPNSEnvironment = "production" | "development"

/// Represents a push platform and its token for Wultra Mobile Token API.
export class WMTPushPlatform {

  private token: string
  private platform: string
  private apnsEnvironment?: WMTAPNSEnvironment

  private constructor(token: string, platform: string, apnsEnvironment?: WMTAPNSEnvironment) {
    this.token = token
    this.platform = platform
    this.apnsEnvironment = apnsEnvironment
  }

  /** Create a WMTPushPlatform instance for Apple Push Notification Service (APNs).
   *
   * @param token device token received from APNs. Format of the token is usually a hexadecimal string.
   * @param environment optional environment for APNs.
   *                    The environment can be either `development` or `production`.
   *                    If not set, then the environment is not specified and the server will use the configured environment.
   */
  static apns(token: string, environment: WMTAPNSEnvironment | undefined): WMTPushPlatform {
    return new WMTPushPlatform(token, "apns", environment)
  }

  /** Create a WMTPushPlatform instance for Firebase Cloud Messaging (FCM).
   *
   * @param token device token received from FCM.
   */
  static fcm(token: string): WMTPushPlatform {
    return new WMTPushPlatform(token, "fcm")
  }

  /** Create a WMTPushPlatform instance for Huawei Mobile Services (HMS).
   *
   * @param token device token received from HMS.
   */
  static huawei(token: string): WMTPushPlatform {
    return new WMTPushPlatform(token, "hms")
  }

  /**
   * If your server is running an older version of the Wultra Mobile Token API (1.9 or earlier), 
   * you may need to use the legacy format.
   */
  supportLegacyServer(): WMTPushPlatform {
    if (this.platform === "apns") {
      this.platform = "ios"
      this.apnsEnvironment = undefined // Legacy server does not support APNS environment.
    } else if (this.platform === "fcm") {
      this.platform = "android"
    } else if (this.platform === "hms") {
      this.platform = "huawei"
    }
    return this
  }
}
