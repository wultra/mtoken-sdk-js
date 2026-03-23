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

// WMTOIDCUtils.ts

import { PowerAuthCryptoUtils, PowerAuthOIDCParameters } from "react-native-powerauth-mobile-sdk"
import { WMTException } from "../WMTException"
import { WMTLogger } from "../WMTLogger"
import type { WMTOIDCConfig } from "./WMTOIDCConfig"
import { WMTOIDCAuthorizationRequest } from "./WMTOIDCAuthorizationRequest"
import { WMTPKCECodes } from "./WMTPKCECodes"

/**
 * Utility helpers for OIDC flows (PKCE, authorization URL construction, callback processing).
 * Uses `PowerAuthCryptoUtils` for randomness and hashing.
 */
export class WMTOIDCUtils {
    private static readonly MIN_LENGTH = 32 // 32 bytes ≈ 43 Base64url chars
    private static readonly MAX_LENGTH = 96 // 96 bytes ≈ 128 Base64url chars

    /**
     * Creates PKCE codes using randomness and SHA-256.
     *
     * @param dataLength Number of *bytes* to generate before Base64url encoding.
     *                   If outside allowed bounds, `MIN_LENGTH` is used.
     *
     * @returns {@link WMTPKCECodes}: codeVerifier, codeChallenge and codeMethod.
     * @throws {@link WMTException} when PKCE code generation fails.
     */
    static async createPKCE(dataLength: number): Promise<WMTPKCECodes> {
        const length = dataLength >= this.MIN_LENGTH && dataLength <= this.MAX_LENGTH ? dataLength : this.MIN_LENGTH

        try {
            // RFC 7636 §4.2: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))

            // Generate cryptographically secure random bytes (returned as standard Base64).
            const verifierB64 = await PowerAuthCryptoUtils.randomBytes(length)
            // Convert to Base64URL (RFC 4648 §5, no padding) — this is the code_verifier string.
            const codeVerifier = this.base64ToBase64Url(verifierB64)
            // Wrap ASCII bytes of codeVerifier into Base64 so hashSha256 can accept them.
            const codeVerifierAsciiAsB64 = btoa(codeVerifier)
            // SHA-256 hash of the ASCII codeVerifier bytes, returned as standard Base64.
            const challengeB64 = await PowerAuthCryptoUtils.hashSha256(codeVerifierAsciiAsB64)
            // Convert the hash to Base64URL (no padding) for the authorization request.
            const codeChallenge = this.base64ToBase64Url(challengeB64)

            return { codeVerifier, codeChallenge, codeMethod: "S256" }
        } catch (e: any) {
            WMTLogger.error(`OIDC: PKCE generation failed: ${String(e)}`)
            throw new WMTException(`Failed to generate PKCE codes`, { cause: String(e) })
        }
    }   

    /**
     * Generates a random Base64Url-safe string (RFC 4648 §5, no padding).
     *
     * Uses `PowerAuthCryptoUtils.randomBytes()` as the source of randomness and then converts
     * the returned Base64 string to Base64Url (replaces `+`/`/` and removes `=` padding).
     *
     * @param dataLength Number of bytes to generate before Base64Url encoding.
     * @returns Base64Url-encoded random string (no `=` padding).
     * @throws {@link WMTException} When random bytes generation fails.
     */
    static async getRandomBase64UrlSafe(dataLength: number): Promise<string> {
        try {
            const random = await PowerAuthCryptoUtils.randomBytes(dataLength)
            return this.base64ToBase64Url(random)
        } catch (e: any) {
            WMTLogger.error(`OIDC: Random bytes generation failed: ${String(e)}`)
            throw new WMTException(`Failed to generate random bytes`, { cause: String(e) })
        }
    }

    /**
     * Builds an OpenID Connect /authorize URL from the provider configuration and request attributes.
     *
     * This creates a URL equivalent to:
     * `authorizeUri?client_id=...&redirect_uri=...&scope=...&state=...&nonce=...&response_type=code`
     * and optionally appends PKCE parameters when `pkceCodes` are provided.
     *
     * @param params Input parameters for URL construction.
     * @param params.config OIDC provider configuration returned from `getConfig()`.
     * @param params.nonce Cryptographic nonce included in the authorization request.
     * @param params.state Opaque state value used to prevent CSRF and validate the callback.
     * @param params.pkceCodes Optional PKCE codes (codeVerifier/codeChallenge/method) for PKCE providers.
     * @returns Fully constructed authorization {@link URL}.
     * @throws {@link WMTException} When URL construction fails (invalid base URL, encoding issues, etc.).
     */
    static createAuthorizationUrl(params: {
        config: WMTOIDCConfig
        nonce: string
        state: string
        pkceCodes?: WMTPKCECodes
    }): URL {
        const { config, nonce, state, pkceCodes } = params

        try {
            const base = config.authorizeUri

            const query: Record<string, string> = {
                client_id: config.clientId,
                redirect_uri: config.redirectUri,
                scope: config.scopes,
                state,
                nonce,
                response_type: "code",
            }

            if (pkceCodes) {
                query.code_challenge = pkceCodes.codeChallenge
                query.code_challenge_method = pkceCodes.codeMethod
            }

            const qs = Object.entries(query)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join("&")

            const sep = base.includes("?") ? (base.endsWith("?") || base.endsWith("&") ? "" : "&") : "?"
            const url = new URL(`${base}${sep}${qs}`)

            WMTLogger.debug("OIDC: Successfully created authorizationUri")
            return url
        } catch (e: any) {
            WMTLogger.error(`OIDC: Failed to create authorization uri: ${String(e)}`)
            throw new WMTException(`Failed to create authorization uri`, { cause: String(e) })
        }
    }

    /**
     * Processes an OIDC redirect/deeplink URL and returns activation parameters.
     *
     * Extracts `code` and `state` from the callback URL, normalizes them (to avoid platform-specific
     * parsing artifacts), validates the received `state` against the original authorization request,
     * and returns {@link PowerAuthOIDCParameters} that can be used to create a PowerAuth activation.
     *
     * @param deeplinkUrl Callback URL received from the browser (e.g. `scheme://path?code=...&state=...`).
     * @param authData Original authorization request data returned from `prepareAuthorizationData()`.
     * @returns {@link PowerAuthOIDCParameters} suitable for `PowerAuthActivation.createWithOIDCParameters()`.
     * @throws {@link WMTException} When the callback is missing required parameters or state validation fails.
     */
    static processWebCallback(
        deeplinkUrl: string | URL,
        authData: WMTOIDCAuthorizationRequest
    ): PowerAuthOIDCParameters {
        const urlStr = typeof deeplinkUrl === "string" ? deeplinkUrl : deeplinkUrl.toString()
        
        const params = this.getURLParams(urlStr)
        const code = this.sanitizeOidcParam(params["code"])
        const state = this.sanitizeOidcParam(params["state"])

        if (!code && !state) throw new WMTException("Invalid OIDC callback uri")
        if (!code) throw new WMTException("Missing authorization code in callback")
        if (!state) throw new WMTException("Missing state in callback")
        if (state !== authData.state) throw new WMTException("State mismatch in callback")

        WMTLogger.debug("OIDC: Successfully processed callback URL")
            
        return {
            providerId: authData.providerId,
            code,
            nonce: authData.nonce,
            codeVerifier: authData.codeVerifier,
        }
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    /** Converts standard Base64 into Base64URL (RFC 4648 §5), removes padding. */
    private static base64ToBase64Url(b64: string): string {
        return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
    }

    /** Extracts query parameters from a URL string (works also for custom-scheme deeplinks). */
    private static getURLParams(url: string): Record<string, string> {
        const regex = /[?&]([^=#]+)=([^&#]*)/g // matches query parameters (`?key=value` / `&key=value`)
        const params: Record<string, string> = {}
        let match: RegExpExecArray | null

        while ((match = regex.exec(url)) !== null) {
            const key = decodeURIComponent(match[1].replace(/\+/g, " "))
            const val = decodeURIComponent(match[2].replace(/\+/g, " "))
            params[key] = val
        }
        return params
    }

    /** Trims and removes trailing slashes to avoid false state/code mismatches in deeplink parsing. */
    private static sanitizeOidcParam(value?: string): string | undefined {
        if (value == null) return undefined
        // Trim + remove trailing slash that sometimes appears in deeplink parsing
        return value.trim().replace(/\/+$/, "")
    }
}