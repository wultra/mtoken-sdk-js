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

import { WMTKnownRestApiError } from "./WMTKnownRestApiError"

/** Response from the API. */
export interface WMTResponse<T> {
    status: "OK" | "ERROR"
    responseError?: WMTResponseError
    responseObject?: T
}

/** Error object when error on the server happens. */
export interface WMTResponseError {
    code: WMTKnownRestApiError | string
    message: string
}

/**
 * Customizes an outgoing HTTP request. Prefer modifying headers only.
 * Encrypted request bodies are Uint8Array values and must be preserved without JSON encoding.
 */
export type WMTRequestProcessor = (request: RequestInit) => RequestInit

/** Automatic values that will be used for User-Agent HTTP header. */
export enum WMTUserAgent {
    /**
     * Default value provided by the libary.
     *
     * Example value (on an Apple device):
     * `MobileTokenJS/1.0.0 com.yourcompany.yourappid/1.0.0 (Apple; iOS/18.2; iPhone16)`.
     */
    LIBRARY_DEFAULT = "LIBRARY_DEFAULT",

    /**
     * System default.
     */
    SYSTEM_DEFAULT = "SYSTEM_DEFAULT"
}
