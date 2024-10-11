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

import { KnownRestApiError } from "./KnownRestApiError";
import { MobileTokenException } from "../MobileTokenException";
import { PowerAuth, PowerAuthAuthentication } from 'react-native-powerauth-mobile-sdk';

export type RequestProcessor = (name: RequestInit) => RequestInit;

export class Networking {

    acceptLanguage = "en";

    private pa: PowerAuth;
    private baseURL: string;

    constructor(powerAuth: PowerAuth, baseURL: string) {
        this.pa = powerAuth;
        this.baseURL = baseURL
    }

    protected async postSigned<T>(
        requestData: any,
        auth: PowerAuthAuthentication,
        endpoindPath: string,
        uriId: string,
        returnDataExpected: boolean,
        requestProcessor?: RequestProcessor
    ): Promise<MobileTokenResponse<T>> {

        let body = JSON.stringify(requestData);
        let paHeader = await this.pa.requestSignature(auth, "POST", uriId, body);
        let headers = new Headers();
        headers.set(paHeader.key, paHeader.value);
        return await this.post(JSON.stringify(requestData), endpoindPath, returnDataExpected, headers, requestProcessor);
    }

    protected async postSignedWithToken<T>(
        requestData: any,
        auth: PowerAuthAuthentication,
        endpoindPath: string,
        tokenName: string,
        returnDataExpected: boolean,
        requestProcessor?: RequestProcessor
    ): Promise<MobileTokenResponse<T>> {

        let token = await this.pa.tokenStore.requestAccessToken(tokenName, auth);
        let paHeader = await this.pa.tokenStore.generateHeaderForToken(token.tokenName);

        let headers = new Headers();
        headers.set(paHeader.key, paHeader.value);

        return await this.post(JSON.stringify(requestData), endpoindPath, returnDataExpected, headers, requestProcessor);
    }

    protected async post<T>(
        requestSerialized: string,
        endpoindPath: string,
        returnDataExpected: boolean,
        headers: Headers,
        requestProcessor?: RequestProcessor
    ): Promise<MobileTokenResponse<T>> {
        let method = "POST";
        let url = (this.baseURL + endpoindPath).replace("//","/");

        let jsonType = "application/json";
        headers.set("Accept", jsonType);
        headers.set("Content-Type", jsonType);
        headers.set("Accept-Language", this.acceptLanguage);
        headers.set("User-Agent", "react-native-mtoken-sdk"); // TODO: improve!

        let request: RequestInit = {
        method: method,
        headers: headers,
        body: requestSerialized
        }

        if (requestProcessor) {
            request = requestProcessor(request);
        }

        let result = await fetch(url, request);
        let responseBody = await result.text()
        let response = JSON.parse(responseBody, (key: string, value: any) => {
        if (key == "operationExpires" || key == "operationCreated") {
            return new Date(value);
        }
        return value
        }) as MobileTokenResponse<T>;

        if (response.status == "ERROR") {
        if (response.responseObject == undefined) {
            throw new MobileTokenException("Error retrieved but no error data", { ...result })
        }
        response.responseError = response.responseObject as any
        response.responseObject = undefined
        }

        if (response.status == "OK" && returnDataExpected && response.responseObject == undefined) {
        throw new MobileTokenException("No data object retieved.", { ...result })
        }

        return response;
    }
}

/** Response from the API. */
export interface MobileTokenResponse<T> {
    status: "OK" | "ERROR";
    responseError?: MobileTokenResponseError;
    responseObject?: T;
} 
  
  /** Error object when error on the server happens. */
export interface MobileTokenResponseError {
    code: KnownRestApiError | string;
    message: string;
}
