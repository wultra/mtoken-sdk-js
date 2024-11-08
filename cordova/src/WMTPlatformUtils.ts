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

import { WMTLogger } from "./WMTLogger"
import { WMT_SDK_VERSION } from "./WMTSDKVersion"

export class WMTPlatformUtils {

    static getPlatform():  "ios" | "android" {
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            return "ios";
        }
    
        return "android"; // we consider everything else android
    }

    static getDefaultUserAgent(): string {
        const product = "MobileTokenJS"
        const sdkVer = WMT_SDK_VERSION
        const os = this.getPlatform()
        // TODO: !!!
        const osVer = "1.0" // Platform.Version
        try {
            const appVer = "1.0" // DeviceInfo.getVersion()
            const appId = "fake.id" // DeviceInfo.getBundleId()
            const maker = "Wultra" // DeviceInfo.getManufacturerSync()
            const model = "Talisman" // DeviceInfo.getModel()
            return `${product}/${sdkVer} ${appId}/${appVer} (${maker}; ${os}/${osVer}; ${model}`
        } catch(e) {
            WMTLogger.debug(`Failed to create user agent: ${e}`)
            return `${product}/${sdkVer} ${os}/${osVer}`
        }
    }

}