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

import { WMT_SDK_VERSION } from "./WMTSDKVersion"
import { Platform } from "react-native"
import { WMTLogger } from "./WMTLogger"
import { PowerAuthEnvironmentInfo, PowerAuthUtils } from "react-native-powerauth-mobile-sdk"

/* @internal */
export class WMTPlatformUtils {

    private static cachedEnvironmentInfo?: PowerAuthEnvironmentInfo

    static getPlatform():  "ios" | "android" {
        return Platform.OS == "ios" ? "ios" : "android"
    }

    static async getDefaultUserAgent(): Promise<string> {
        const product = "MobileTokenJS"
        const sdkVer = WMT_SDK_VERSION
        const envInfo = await this.getEnvironmentInfo()
        const appVer = envInfo.applicationVersion || "0.0"
        const appId = envInfo.applicationIdentifier || "unknown"
        const maker = envInfo.deviceManufacturer
        const model = envInfo.deviceId
        const os = envInfo.systemName
        const osVer = envInfo.systemVersion
        const userAgent = `${product}/${sdkVer} ${appId}/${appVer} (${maker}; ${os}/${osVer}; ${model}`
        return userAgent
    }

    private static async getEnvironmentInfo(): Promise<PowerAuthEnvironmentInfo> {
        try {
            // If we have cached environment info, return it to avoid unnecessary calls.
            // This expects that the environment info does not change during the app lifetime.
            if (!this.cachedEnvironmentInfo) {
                this.cachedEnvironmentInfo = await PowerAuthUtils.getEnvironmentInfo();
            }
            return this.cachedEnvironmentInfo
        } catch (e) {
            WMTLogger.error(`Failed to get environment info: ${e}`)
            // In case of error, we return a default object with "unknown" values.
            return {
                systemName: "unknown",
                systemVersion: "0.0",
                applicationVersion: "0.0",
                applicationIdentifier: "unknown",
                deviceManufacturer: "unknown",
                deviceId: "unknown",
                sdkVersion: "0.0"
            }
        }
    }
}
