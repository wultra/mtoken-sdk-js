import { PowerAuth } from "react-native-powerauth-mobile-sdk"
import { WultraMobileToken } from "./WultraMobileToken"
import { WMTUserAgent } from "./networking/WMTNetworking"

declare module "react-native-powerauth-mobile-sdk" {
    export interface PowerAuth {

        /**
         * Creates Wultra Mobile Token services from on top of the `PowerAuthSDK`.
         * URL from the `PowerAuthSDK` instance is used for services.
         *
         * `PowerAuthSDK` instance needs to be activated when calling any method of this class; otherwise, an error will be thrown.
         * @param acceptLanguage Optionally sets the accept language for the outgoing requests headers for `operations`, `push` and `inbox` objects.
         *                       The default value is "en".
         *                       The value can be further modified in the each service object individualy.
         *                       Standard RFC "Accept-Language" https://tools.ietf.org/html/rfc7231#section-5.3.5
         *                       Response texts are based on this setting. For example when "de" is set, server
         *                       will return operation texts in german (if available).
         * @param userAgent Optionally sets the User agent that will be used in a HTTP hader.
         *                  Note that user-agent can be overriden by request processor in each API call.
         * @returns Mobile Token SDK main wrapper.
         */
        createWultraMobileToken(
            acceptLanguage?: string,
            userAgent?: WMTUserAgent | string
        ): WultraMobileToken
    }
}

/**
 * Creates Wultra Mobile Token services from on top of the `PowerAuthSDK`.
 * URL from the `PowerAuthSDK` instance is used for services.
 *
 * `PowerAuthSDK` instance needs to be activated when calling any method of this class; otherwise, an error will be thrown.
 * @param acceptLanguage Optionally sets the accept language for the outgoing requests headers for `operations`, `push` and `inbox` objects.
 *                       The default value is "en".
 *                       The value can be further modified in the each service object individualy.
 *                       Standard RFC "Accept-Language" https://tools.ietf.org/html/rfc7231#section-5.3.5
 *                       Response texts are based on this setting. For example when "de" is set, server
 *                       will return operation texts in german (if available).
 * @param userAgent Optionally sets the User agent that will be used in a HTTP hader.
 *                  Note that user-agent can be overriden by request processor in each API call.
 * @returns Mobile Token SDK main wrapper.
 */
PowerAuth.prototype.createWultraMobileToken = function (
    acceptLanguage?: string,
    userAgent?: WMTUserAgent | string
) {
    return new WultraMobileToken(this, acceptLanguage, userAgent)
}

export {}
