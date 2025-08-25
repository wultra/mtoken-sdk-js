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
   * const pushData = WMTPushData.fcm("your_fcm_token")
   * await mtoken.push.register(pushData)
   * ```
   * ----
   *
   * If you are using an older version of the Wultra Mobile Token API (1.9 or earlier), you may need to use the legacy format:
   * ```typescript
   * const pushData = WMTPushData.fcm("your_fcm_token").supportLegacyServer()
   * await mtoken.push.register(pushData)
   * ```
   */
  async register(data: WMTPushData, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<void>> {

    return await this.postSignedWithToken<void>(
      { requestObject: data.requestObject },
      PowerAuthAuthentication.possession(),
      "/api/push/device/register/token",
      "possession_universal",
      false,
      requestProcessor
    )
  }
}

/// Environment for Apple Push Notification Service (APNs).
export enum WMTAPNSEnvironment {
  production = "production",
  development = "development"
}

/// Represents a push platform and its token for Wultra Mobile Token API.
export class WMTPushData {

  private readonly token: string
  private readonly platform: WMTPushPlatform | WMTLegacyPushPlatform
  private readonly apnsEnvironment?: WMTAPNSEnvironment

  private constructor(token: string, platform: WMTPushPlatform | WMTLegacyPushPlatform, apnsEnvironment?: WMTAPNSEnvironment) {
    this.token = token
    this.platform = platform
    this.apnsEnvironment = apnsEnvironment
  }

  /** Create a WMTPushData instance for Apple Push Notification Service (APNs).
   *
   * @param token device token received from APNs. Format of the token is usually a hexadecimal string.
   * @param environment optional environment for APNs.
   *                    The environment can be either `development` or `production`.
   *                    If not set, then the environment is not specified and the server will use the configured environment.
   * @param supportLegacyServer If your server is running an older version of the Wultra Mobile Token API (1.9 or earlier), 
   *                            you may need to use the legacy format.
   */
  static apns(token: string, environment?: WMTAPNSEnvironment, supportLegacyServer?: boolean): WMTPushData {
    return new WMTPushData(token, supportLegacyServer ? "ios" : "apns", supportLegacyServer ? undefined : environment)
  }

  /** Create a WMTPushData instance for Firebase Cloud Messaging (FCM).
   *
   * @param token device token received from FCM.
   * @param supportLegacyServer If your server is running an older version of the Wultra Mobile Token API (1.9 or earlier), 
   *                            you may need to use the legacy format.
   */
  static fcm(token: string, supportLegacyServer?: boolean): WMTPushData {
    return new WMTPushData(token, supportLegacyServer ? "android" : "fcm")
  }

  /** Create a WMTPushData instance for Huawei Mobile Services (HMS).
   *
   * @param token device token received from HMS.
   * @param supportLegacyServer If your server is running an older version of the Wultra Mobile Token API (1.9 or earlier), 
   *                            you may need to use the legacy format.
   */
  static huawei(token: string, supportLegacyServer?: boolean): WMTPushData {
    return new WMTPushData(token, supportLegacyServer ? "huawei" : "hms")
  }

  /** Returns the request object to be sent to the server. */
  get requestObject() {
    return {
      token: this.token,
      platform: this.platform,
      environment: this.apnsEnvironment
    }
  };
}

/** Represents a push platform for Wultra Mobile Token API.
 *
 * Internal type
 */
type WMTPushPlatform = "apns" | "fcm" | "hms"

/**
 * Legacy push platform types for Wultra Mobile Token API versions 1.9 and earlier.
 * 
 * Internal type
 */  
type WMTLegacyPushPlatform = "ios" | "android" | "huawei"
