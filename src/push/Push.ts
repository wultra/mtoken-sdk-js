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

import { Networking, type RequestProcessor, type MobileTokenResponse } from "../networking/Networking";
import { Platform } from 'react-native';
import { PowerAuthAuthentication } from 'react-native-powerauth-mobile-sdk';

/** Push handling */
export class Push extends Networking {

  /** 
   * Registers the given powerauth activation for push notifications.
   * 
   * @param token Push token
   * @param platform ios, android or huawei. When not specified, `Platform.OS` is used to determine if ios or android will be used. There is currently no automatic huawei platform detection.
   * @param requestProcessor You may modify the request via this processor. It's highly recommended to only modify HTTP headers.
   * @returns Server response
   */
  async register(token: string, platform?: "ios" | "android" | "huawei", requestProcessor?: RequestProcessor): Promise<MobileTokenResponse<void>> {

    if (platform == undefined) {
      // only
      platform = Platform.OS == "ios" ? "ios" : "android";
    }

    return await this.postSignedWithToken<void>(
      { requestObject: { token: token, platform: platform } },
      PowerAuthAuthentication.possession(),
      "/api/push/device/register/token",
      "possession_universal",
      false,
      requestProcessor
    );
  }
}