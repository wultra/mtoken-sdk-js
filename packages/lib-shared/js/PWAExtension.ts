import { PowerAuth } from "react-native-powerauth-mobile-sdk"
import { WultraMobileToken } from "./WultraMobileToken"
import { WPNUserAgent, WPNRequestInterceptor } from "react-native-powerauth-networking"

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
         * @param userAgent Optionally sets the User agent that will be used in a HTTP header.
         *                  Note that user-agent can be overridden by a request interceptor.
         * @param requestInterceptors Optional interceptors applied, in declaration order, to every request of `operations`, `push`, `inbox`
         *                            and `oidc` right before it is sent. Default is none.
         * @returns Mobile Token SDK main wrapper.
         */
        createWultraMobileToken(
            acceptLanguage?: string,
            userAgent?: WPNUserAgent | string,
            requestInterceptors?: readonly WPNRequestInterceptor[]
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
 * @param userAgent Optionally sets the User agent that will be used in a HTTP header.
 *                  Note that user-agent can be overridden by a request interceptor.
 * @param requestInterceptors Optional interceptors applied, in declaration order, to every request of `operations`, `push`, `inbox`
 *                            and `oidc` right before it is sent. Default is none.
 * @returns Mobile Token SDK main wrapper.
 */
PowerAuth.prototype.createWultraMobileToken = function (
    acceptLanguage?: string,
    userAgent?: WPNUserAgent | string,
    requestInterceptors?: readonly WPNRequestInterceptor[]
) {
    return new WultraMobileToken(this, acceptLanguage, userAgent, requestInterceptors)
}

export {}
