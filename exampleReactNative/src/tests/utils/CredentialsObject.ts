export interface CredentialsObject {
    cloudServerUrl: string
    cloudServerLogin: string
    cloudServerPassword: string
    cloudApplicationId: string
    enrollmentUrl: string
    sdkConfig: string

    oidcProviderId?: string
    oidcProviderIdPkce?: string
    oidcUsername?: string
    oidcPassword?: string
}