import { PowerAuth } from "react-native-powerauth-mobile-sdk";
import { WultraMobileToken } from "./WultraMobileToken";
import { WMTUserAgent } from "./networking/WMTNetworking";

// TODO test cross-compilation to vanilla & CDV integration. Include in int tests. Include in docs.
declare module "react-native-powerauth-mobile-sdk" {
    interface PowerAuth {
        createWultraMobileToken(acceptLanguage?: string, userAgent?: WMTUserAgent): WultraMobileToken
    }
}

PowerAuth.prototype.createWultraMobileToken = function (acceptLanguage?: string, userAgent?: WMTUserAgent) {
    return new WultraMobileToken(this, acceptLanguage, userAgent)
}
