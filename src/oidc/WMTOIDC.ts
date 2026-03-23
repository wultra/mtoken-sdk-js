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

import { WMTE2EEConfiguration, WMTNetworking, WMTRequestProcessor, WMTResponse } from "../networking/WMTNetworking";
import { WMTOIDCAuthorizationRequest } from "./WMTOIDCAuthorizationRequest";
import { WMTOIDCConfig } from "./WMTOIDCConfig";
import { WMTOIDCUtils } from "./WMTOIDCUtils";
import { WMTException } from "../WMTException"
import { PowerAuth, PowerAuthActivation } from "react-native-powerauth-mobile-sdk";
import { WMTLogger } from "../WMTLogger";

/** OIDC handling */
export class WMTOIDC extends WMTNetworking {
    
    /**
     * Retrieves configuration based on predefined providerId.
     * 
     * Encrypted with the ECIES application scope.
     * 
     * @param providerId is the identification of the configuration record, used as a key for the configuration.
     * @param requestProcessor is an optional request processor for customizing the HTTP request.
     * @returns Server response (with {@link WMTOIDCConfig})
     */
    async getConfig(providerId: string, requestProcessor?: WMTRequestProcessor): Promise<WMTResponse<WMTOIDCConfig>> {
        return await this.post<WMTOIDCConfig>(
            JSON.stringify({ providerId }),
            "/api/config/oidc",
            true,
            new Headers(),
            requestProcessor,
            undefined,
            WMTE2EEConfiguration.applicationScope
        )
    }

    /**
     * Prepares authorization data required to start an OIDC login flow.
     *
     * This method:
     *  - Generates a `state` and `nonce` value for request validation.
     *  - Generates PKCE values when the provider configuration enables PKCE.
     *  - Builds the full authorization URL that must be opened in a browser or web view.
     *
     * The returned {@link WMTOIDCAuthorizationRequest} contains everything needed to:
     *  1. Redirect the user to the provider’s login page (`authorizeUri`)
     *  2. Later be validated with the final redirect URL from the OIDC provider
     *
     * @returns {@link WMTOIDCAuthorizationRequest} containing all necessary data for starting the OIDC authorization flow.
     * @throws {@link WMTException} if PKCE generation, random value generation, or URL construction fails.
     * 
     * After the provider finishes authentication, the resulting redirect/deeplink URL
     * can be passed to `WMTOIDCUtils.processWebCallback(...)`, which validates the state,
     * extracts authorization parameters, which can be passed
     * to `PowerAuthActivation.createWithOIDCParameters(parameters, name)` 
     * and the created object can be used in `powerAuth.createActivation()`.
     */
    async prepareAuthorizationData(config: WMTOIDCConfig): Promise<WMTOIDCAuthorizationRequest> {

        // Using 32 bytes for PKCE code verifiers aligns with RFC 7636 (https://datatracker.ietf.org/doc/html/rfc7636).
        // For nonce and state, OpenID Connect does not specify a strict length, but 32 bytes ensures strong randomness to prevent replay and CSRF attacks.
        const pkceCodes = config.pkceEnabled ? await WMTOIDCUtils.createPKCE(32) : undefined
        const nonce = await WMTOIDCUtils.getRandomBase64UrlSafe(32)
        const state = await WMTOIDCUtils.getRandomBase64UrlSafe(32)

        const authorizeUri = WMTOIDCUtils.createAuthorizationUrl({
            config,
            nonce,
            state,
            pkceCodes,
        })

        return {
            authorizeUri,
            providerId: config.providerId,
            nonce,
            state,
            codeVerifier: pkceCodes?.codeVerifier,
        }
    }
}