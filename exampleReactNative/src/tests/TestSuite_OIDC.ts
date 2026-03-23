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

import { PowerAuth, PowerAuthActivation, PowerAuthAuthentication } from "react-native-powerauth-mobile-sdk"
import { TestSuite } from "./TestSuite"
import { IntegrationUtils, OIDCProps } from "./utils/IntegrationUtils"

import { WMTOIDC, WMTOIDCConfig, WMTOIDCUtils } from "react-native-mtoken-sdk"

export class TestSuite_OIDC extends TestSuite {
    private utils = new IntegrationUtils()

    private pa!: PowerAuth
    private oidc!: WMTOIDC
    private oidcProps?: OIDCProps

    protected async beforeAll(): Promise<void> {
        console.log("")
        console.log("beforeAll(OIDC): loading test credentials...")
        await this.utils.loadCredentials()

        this.oidcProps = this.utils.getOidcProps() ?? undefined
        this.pa = await this.utils.createPaInstance((Math.random() + 1).toString(36))
        this.oidc = this.pa.createWultraMobileToken().oidc
        console.log("beforeAll(OIDC): SDK configured.")
    }

    protected async afterAll(): Promise<void> {
        if (this.pa) {
            console.log("")
            console.log("afterAll(OIDC): cleaning up PA instance...")
            this.pa.removeActivationLocal()
            console.log("afterAll(OIDC): done.")
        }
    }

    // -----------------------------------------------------------------------------------------------
    // Basic tests
    // -----------------------------------------------------------------------------------------------

    async testGetConfigFails() {
        const invalidProviderId = "xxx"

        try {
            await this.oidc.getConfig(invalidProviderId)
            this.fail(`Expected getConfig() to fail for invalid providerId "${invalidProviderId}", but it succeeded`)
        } catch (e: any) {
            if (e && typeof e === "object" && "responseError" in e) {
                this.assertNotNull((e as any).responseError, "Expected responseError to be present")
            } else {
                this.assertTrue(true)
            }
        }
    }

    async testGetConfigSucceed() {
        const providerId = this.oidcProps?.providerId?.trim()
        if (!providerId) {
            console.log("providerId not provided -> skipping testGetConfigSucceed")
            return
        }

        const config = await this.fetchConfigOrFail(this.oidc, providerId)
        this.assertLooksLikeConfig(config)

        if ("pkceEnabled" in (config as any)) {
            this.assertFalse(!!(config as any).pkceEnabled, "pkceEnabled should be false for non-PKCE provider")
        }
    }

    async testGetConfigPKCESucceed() {
        const providerIdPkce = this.oidcProps?.providerIdPkce?.trim()
        if (!providerIdPkce) {
            console.log("providerIdPkce not provided -> skipping testGetConfigPKCESucceed")
            return
        }

        const config = await this.fetchConfigOrFail(this.oidc, providerIdPkce)
        this.assertLooksLikeConfig(config)

        if ("pkceEnabled" in (config as any)) {
            this.assertTrue(!!(config as any).pkceEnabled, "pkceEnabled should be true for PKCE provider")
        }
    }

    async testOIDCPreparesAuthorizationData() {
        const providerIdPkce = this.oidcProps?.providerIdPkce?.trim()
        if (!providerIdPkce) {
            console.log("providerIdPkce not provided -> skipping testOIDCPreparesAuthorizationData")
            return
        }

        const config = await this.fetchConfigOrFail(this.oidc, providerIdPkce)

        try {
            const authData = await this.oidc.prepareAuthorizationData(config)

            this.assertNotNull(authData, "authData is null")
            this.assertNotNull(authData.authorizeUri, "authorizeUri should not be null")
            this.assertNotNull(authData.state, "state should not be null")
            this.assertNotNull(authData.nonce, "nonce should not be null")
            this.assertNotNull(authData.codeVerifier, "codeVerifier should not be null for PKCE provider")
        } catch (e) {
            this.fail(`Authorization data preparation failed: ${String(e)}`)
        }
    }

    // -----------------------------------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------------------------------
    private async fetchConfigOrFail(oidc: WMTOIDC, providerId: string): Promise<WMTOIDCConfig> {
        const resp: any = await oidc.getConfig(providerId)
        const cfg = resp?.responseObject ?? resp
        if (!cfg) this.fail(`getConfig() returned no config (providerId="${providerId}"). Raw: ${JSON.stringify(resp)}`)
        return cfg
    }

    private assertLooksLikeConfig(config: any) {
        this.assertNotNull(config, "Config is null")
        this.assertNotNull(config.authorizeUri, "authorizeUri missing")
        this.assertNotNull(config.providerId, "providerId missing")
        this.assertNotNull(config.scopes, "scopes missing")
        this.assertNotNull(config.clientId, "clientId missing")
        this.assertNotNull(config.redirectUri, "redirectUri missing")
    }

    // -----------------------------------------------------------------------------------------------
    // Full activation flow (Auth0-like, DISABLED by default)
    // -----------------------------------------------------------------------------------------------
    /// The entire OIDC activation flow is highly dependent on third-party implementations.
    /// This flow was tested using our configuration with `auth0.com` on RN - iOS.
    /// Below is a summary of the process outside our system:
    ///
    /// 1. GET request with the authorization URI → Extract the redirect URI and `authState` from the response.
    /// 2. Send a POST request to the login URI with the body containing `username`, `password`, and `authState` → Extract the resume URI from the response.
    /// 3. Send a GET request to the resume URI → Extract the deeplink URI containing the authorization `code`.
    ///
    /// ## Redirect Handling
    /// Unlike typical HTTP clients that automatically follow redirects, this test
    /// deliberately disables automatic redirect handling and inspects `Location`
    /// headers manually. This lets us capture intermediate redirects and support
    /// flows with mixed HTTP methods (e.g. GET → redirect → POST → redirect → GET → redirect),
    /// while still maintaining a single logical browser-like session.
    ///
    /// ## Testing Requirements
    /// Required test configuration (provided via {@link IntegrationUtils} / credentials file):
    /// - `providerIdPkce` (OIDC provider ID with PKCE enabled)
    /// - `username`, `password` (test account for the hosted login at the OIDC provider)
    /// Dependencies used by this flow:
    /// `@react-native-cookies/cookies`:
    /// - Used to clear cookie stores before the flow to reduce state bleed between runs.
    /// `react-native-blob-util`:
    /// - Used instead of `fetch()` so we can disable redirect following (`followRedirect: false`)
    ///   and capture intermediate `Location` headers, including the final `scheme://...` deeplink.
    // 
    // Required dependencies (install in exampleReactNative/):
    //   cd exampleReactNative
    //   yarn add @react-native-cookies/cookies react-native-blob-util
    //   cd ios && pod install && cd ..
    // ---------------------------------------------------------------------------------------------------
    // UNCOMMENT BELOW THIS POINT AND MOVE THE IMPORTS AND TYPES TO THE TOP OF THE FILE TO ENABLE THE TEST
    
// import CookieManager from "@react-native-cookies/cookies"
// import ReactNativeBlobUtil from "react-native-blob-util"
// type HeadersDict = Record<string, string>

// type HttpResponse = {
//     status: number
//     redirectUrl?: string
//     bodyText?: string
//     headers?: HeadersDict
// }

    // // Safety limit to avoid infinite redirect loops
    // private readonly MAX_REDIRECT_HOPS = 5

    // async testOIDCActivationFlow() {
    //     const providerIdPkce = this.oidcProps?.providerIdPkce?.trim()
    //     const username = this.oidcProps?.username?.trim()
    //     const password = this.oidcProps?.password?.trim()

    //     if (!providerIdPkce) {
    //         this.fail("providerIdPkce not provided for OIDC activation test")
    //         return
    //     }
    //     if (!username || !password) {
    //         this.fail("oidcUsername/oidcPassword not provided for OIDC activation test")
    //         return
    //     }

    //     // 0) Clear cookies (both stores). Some providers (Auth0) keep transaction state in cookies.
    //     await CookieManager.clearAll(false)
    //     await CookieManager.clearAll(true)

    //     // 1) Fetch provider config (SDK scope)
    //     const config = await this.fetchConfigOrFail(this.oidc, providerIdPkce)
    //     this.assertNotNull(config.redirectUri, "redirectUri missing in provider config")

    //     // 2) Prepare auth data (state, nonce, PKCE verifier, ...) (SDK scope)
    //     const authData = await this.oidc.prepareAuthorizationData(config)
    //     this.assertNotNull(authData.authorizeUri, "authorizeUri missing from authorization data")

    //     // 3) Drive hosted login (out of SDK scope, depends on IdP HTML/redirect behavior)
    //     let finalRedirectUrlString: string
    //     try {
    //         finalRedirectUrlString = await this.loginWithAuth0LikeFlow(
    //             authData.authorizeUri,
    //             username,
    //             password,
    //             config.redirectUri
    //         )
    //     } catch (e) {
    //         this.fail(`OIDC login flow failed: ${String(e)}`)
    //         return
    //     }
        
    //     // Final URL should be our custom-scheme redirect (sometimes providers add a trailing slash)
    //     this.assertTrue(this.isDeeplinkStyleUrl(finalRedirectUrlString, config.redirectUri), "Final redirect does not match expected redirect URI")

    //     // 4) Validate callback + extract OIDC parameters (SDK utility scope)
    //     const oidcParams = WMTOIDCUtils.processWebCallback(finalRedirectUrlString, authData)
    //     this.assertNotNull(oidcParams, "Processing web callback did not return OIDC parameters")

    //     // 5) Create PowerAuth activation object
    //     let activation = PowerAuthActivation.createWithOIDCParameters(oidcParams, "JS OIDC Test")

    //     // 6) Create + persist activation
    //     await this.pa.createActivation(activation)
    //     await this.pa.persistActivation(PowerAuthAuthentication.persistWithPassword("1234"))

    //     const hasValid = await this.pa.hasValidActivation()
    //     this.assertTrue(hasValid, "Expected valid activation after OIDC flow")
    // }

    // // -----------------------------------------------------------------------------------------------
    // // OIDC Flow Helpers
    // // -----------------------------------------------------------------------------------------------

    // /**
    //  * Performs an Auth0-like login flow (GET authorize -> POST credentials -> follow redirects)
    //  * and returns the final deeplink URL.
    //  */
    // private async loginWithAuth0LikeFlow(
    //     authorizeUrl: string | URL,
    //     username: string,
    //     password: string,
    //     expectedRedirectUriPrefix: string
    // ): Promise<string> {
    //     const startUrl = typeof authorizeUrl === "string" ? authorizeUrl : authorizeUrl.toString()

    //     // 1) GET /authorize -> should respond with 3xx Location to login page (/u/login?state=...)
    //     const step1 = await this.performRequest({ url: startUrl, method: "GET", tag: "authorize(GET)" })
    //     const loginUrl = this.getRedirect(step1, "step1")

    //     // Prepare direct login POST (simplified: we only send username/password/state).
    //     // This is intentionally minimal and may be flaky across IdPs.
    //     const fields: Record<string, string> = {}

    //     // State is typically carried via query param in the login URL.
    //     const loginPost = this.getURLParams(loginUrl)
    //     if (loginPost["state"]) {
    //         fields["state"] = loginPost["state"]
    //     }

    //     fields["username"] = username
    //     fields["password"] = password

    //     const body = this.toFormUrlEncoded(fields)

    //     // 2) POST creds -> should respond with 3xx Location (resume URL or directly deeplink)
    //     const resp2 = await this.performRequest({
    //         url: loginUrl,
    //         method: "POST",
    //         body,
    //         headers: {
    //             "content-type": "application/x-www-form-urlencoded",
    //             origin: this.getOrigin(loginUrl),
    //             referer: loginUrl,
    //         },
    //         tag: "login(POST)",
    //     })

    //     const next = this.getRedirect(resp2, "step2")

    //     // 3) Follow redirects until final deeplink
    //     const final = await this.followRedirects(next, expectedRedirectUriPrefix, this.MAX_REDIRECT_HOPS)

    //     return final
    // }

    // /** Follows GET redirects (via Location headers) until a final deeplink is reached. */
    // private async followRedirects(startUrl: string, expectedRedirectUriPrefix: string, maxHops: number): Promise<string> {
    //     const expectedPrefix = expectedRedirectUriPrefix.toLowerCase()
    //     let currentUrl = startUrl

    //     for (let hop = 0; hop < maxHops; hop++) {
    //         // Stop once we hit the custom scheme redirect (in our case - mtoken://...)
    //         if (currentUrl.toLowerCase().startsWith(expectedPrefix)) {
    //             return currentUrl
    //         }

    //         const resp = await this.performRequest({ url: currentUrl, method: "GET", tag: `redirectHop${hop}(GET)` })
    //         currentUrl = this.getRedirect(resp, `redirectHop${hop}`)
    //     }

    //     throw new Error(`OIDC redirect chain exceeded maxHops=${maxHops}. Last url=${currentUrl}`)
    // }

    // /** Executes a single HTTP request with redirects disabled so we can read Location headers manually. */
    // private async performRequest(params: {
    //     url: string
    //     method: "GET" | "POST"
    //     body?: string
    //     headers?: HeadersDict
    //     tag?: string
    // }): Promise<HttpResponse> {
    //     const { url, method } = params
    //     const tag = params.tag ?? method

    //     const headers: HeadersDict = {
    //         "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
    //         accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    //         ...(params.headers ?? {}),
    //     }

    //     // Keep these consistent, some providers validate them.
    //     headers.origin = this.getOrigin(url)
    //     headers.referer = url

    //     // Redirects disabled -> we can inspect Location without the client following it (especially important for mtoken://).
    //     const cfg = ReactNativeBlobUtil.config({ followRedirect: false })

    //     const body = method === "POST" ? (params.body ?? "") : undefined
    //     const resp = await cfg.fetch(method, url, headers, body)

    //     // FetchBlobResponse exposes info()
    //     const info = resp.info() as { status?: number; headers?: Record<string, string> }
    //     const status = Number(info?.status ?? 0)

    //     // Headers vary by platform, normalize keys.
    //     const normHeaders = this.normalizeHeaders(info?.headers ?? {})

    //     // If Location is present, it is exposed as redirectUrl (may be relative or absolute, including custom schemes).
    //     const location = normHeaders["location"] ?? normHeaders["Location"]
    //     if (location) {
    //         const resolved = this.resolveRelativeUrl(url, location)
    //         return { status, redirectUrl: resolved, headers: normHeaders }
    //     }

    //     // No Location -> treat as body
    //     const bodyText = String((resp as any).data ?? "")
    //     return { status, bodyText, headers: normHeaders }
    // }

    // /** Normalizes header keys and also provides lowercase aliases for case-insensitive access. */
    // private normalizeHeaders(h: any): HeadersDict {
    //     const out: HeadersDict = {}
    //     if (!h || typeof h !== "object") return out

    //     for (const k of Object.keys(h)) {
    //         const v = (h as any)[k]
    //         if (typeof v === "string") out[k] = v
    //         else if (v != null) out[k] = String(v)
    //     }

    //     // Duplicate keys to lowercase to avoid casing issues (Location vs location).
    //     for (const k of Object.keys(out)) out[k.toLowerCase()] = out[k]
    //     return out
    // }

    // /** Returns redirectUrl from HttpResponse or throws a descriptive error if missing. */
    // private getRedirect(resp: HttpResponse, stepName: string): string {
    //     if (resp.redirectUrl) return resp.redirectUrl
    //     throw new Error(`OIDC ${stepName} expected redirect, got none. status=${resp.status}\nbody=${resp.bodyText ?? ""}`)
    // }
    
    // /** Serializes key-value pairs to application/x-www-form-urlencoded. */
    // private toFormUrlEncoded(fields: Record<string, string>): string {
    //     const parts: string[] = []
    //     for (const k of Object.keys(fields)) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(fields[k] ?? "")}`)
    //     return parts.join("&")
    // }

    // /** Extracts `scheme://host[:port]` from a URL. */
    // private getOrigin(url: string): string {
    //     const m = url.match(/^(https?:\/\/[^\/]+)/i)
    //     if (!m) throw new Error(`Cannot determine origin from url: ${url}`)
    //     return m[1]
    // }

    // /** Resolves relative Location headers against base URL; passes through absolute URLs (incl. mtoken://). */
    // private resolveRelativeUrl(baseUrl: string, maybeRelative: string): string {
    //     // absolute URL (including custom schemes like mtoken://)
    //     if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(maybeRelative)) return maybeRelative

    //     const origin = this.getOrigin(baseUrl)
    //     if (maybeRelative.startsWith("/")) return origin + maybeRelative

    //     const baseNoQuery = baseUrl.split("?")[0]
    //     const dir = baseNoQuery.endsWith("/") ? baseNoQuery : baseNoQuery.substring(0, baseNoQuery.lastIndexOf("/") + 1)
    //     return dir + maybeRelative
    // }

    // /** Parses query parameters from a URL string into a simple dictionary. */
    // private getURLParams(url: string): Record<string, string> {
    //     const regex = /[?&]([^=#]+)=([^&#]*)/g
    //     const params: Record<string, string> = {}
    //     let match: RegExpExecArray | null
    //     while ((match = regex.exec(url)) !== null) {
    //         const key = decodeURIComponent(match[1].replace(/\+/g, " "))
    //         const val = decodeURIComponent(match[2].replace(/\+/g, " "))
    //         params[key] = val
    //     }
    //     return params
    // }

    // /** Checks if the URL is a custom-scheme deeplink matching expected redirect prefix (case-insensitive). */
    // private isDeeplinkStyleUrl(value: string, prefix: string): boolean {
    //     return value.toLowerCase().startsWith(prefix.toLowerCase())
    // }
}
