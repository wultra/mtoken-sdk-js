//
// Copyright 2026 Wultra s.r.o.
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

/**
 * Represents a request for OIDC authorization.
 *
 * This object contains the necessary data to initiate an OIDC authorization process.
 */
export interface WMTOIDCAuthorizationRequest {

    /**
     * The URL to initiate the authorization process.
     * This URL is typically opened in a browser or web view.
     */
    authorizeUri: URL

    /**
     * The identifier of the OIDC provider.
     */
    providerId: string

    /**
     * A unique value used to prevent replay attacks.
     * Must match the value returned by the provider.
     */
    nonce: string

    /**
     * A unique value used to maintain state between the request and callback.
     * Used to prevent CSRF attacks.
     */
    state: string

    /**
     * Optional PKCE code verifier.
     * Required to complete the authorization flow when PKCE is enabled.
     */
    codeVerifier?: string
}