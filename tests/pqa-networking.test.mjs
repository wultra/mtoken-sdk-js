// Copyright 2026 Wultra s.r.o.
// Licensed under the Apache License, Version 2.0.

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'
import { build } from 'esbuild'
import ts from 'typescript'

// Exercise both generated SDKs with real networking-js and fixed native responses.
// These tests validate the integration contract, not native cryptography.
const rnBundle = await build({
    entryPoints: ['build/react-native/lib/index.js'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react-native', 'react-native-powerauth-mobile-sdk'],
    write: false
})
const cdvBundle = await readFile('build/cdv/lib/WultraMobileTokenPlugin.js', 'utf8')
const cdvNetworking = await readFile('node_modules/cordova-powerauth-networking/lib/index.js', 'utf8')
const encode = text => Buffer.from(text).toString('base64')
const encryptedRequest = Uint8Array.from([0, 255, 128, 42])
const encryptedResponse = Uint8Array.from([254, 0, 129, 10])

for (const platform of ['rn', 'cordova']) {
    test(`${platform}: generated consumer declarations expose networking and synchronous construction`, () => {
        const program = ts.createProgram([`tests/fixtures/${platform}.ts`], {
            noEmit: true,
            strict: true,
            skipLibCheck: true,
            types: [],
            target: ts.ScriptTarget.ES2020,
            moduleResolution: ts.ModuleResolutionKind.Node10
        })
        const diagnostics = ts.getPreEmitDiagnostics(program)
        assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
            getCanonicalFileName: file => file,
            getCurrentDirectory: () => process.cwd(),
            getNewLine: () => '\n'
        }))
    })
}

function load(platform) {
    const requests = []
    const nativeCalls = []
    const state = {
        baseURL: 'https://example.test/enrollment/',
        configurationReads: 0,
        response: { status: 'OK', responseObject: [] },
        encrypted: false,
        releases: 0,
        decryptions: 0
    }
    class PowerAuth {
        get configuration() {
            state.configurationReads++
            return state.configurationError
                ? Promise.reject(state.configurationError)
                : Promise.resolve({ baseEndpointUrl: state.baseURL })
        }
        tokenStore = {
            requestAccessToken: async (tokenName, authentication) => {
                nativeCalls.push(['token', tokenName, authentication])
                return { tokenName }
            },
            generateAuthenticationHeader: async tokenName => {
                nativeCalls.push(['tokenHeader', tokenName])
                return { name: 'X-PowerAuth-Token', value: 'token-value' }
            }
        }
        async authenticationHeaderForRequestWithBody(...args) {
            nativeCalls.push(['authentication', ...args])
            return { name: 'X-PowerAuth-Authorization', value: 'auth-value' }
        }
        async offlineAuthenticationCode(...args) {
            nativeCalls.push(['offline', ...args])
            return '12345678'
        }
        async getEncryptorForApplicationScope() {
            state.encrypted = true
            return {
                async encryptRequest(body) {
                    nativeCalls.push(['encrypt', Buffer.from(body, 'base64').toString('utf8')])
                    return {
                        requestBody: Buffer.from(encryptedRequest).toString('base64'),
                        requestHeaders: [{ name: 'X-PowerAuth-Encryption', value: 'encryption-context' }]
                    }
                },
                async decryptResponse(body) {
                    state.decryptions++
                    assert.equal(body, Buffer.from(encryptedResponse).toString('base64'))
                    return encode(JSON.stringify(state.response))
                },
                async release() { state.releases++ }
            }
        }
    }
    const powerAuthExports = {
        PowerAuth,
        PowerAuthAuthentication: { possession: () => ({ possession: true }) },
        PowerAuthUtils: { getEnvironmentInfo: async () => ({
            applicationIdentifier: 'test.app', applicationVersion: '1.0',
            deviceManufacturer: 'Apple', deviceId: 'test', systemName: 'iOS', systemVersion: '18'
        }) }
    }
    const context = vm.createContext({
        ...powerAuthExports, Buffer, Headers, Response, Uint8Array, URL, btoa, atob, console,
        cordova: { platformId: 'ios' },
        fetch: async (url, request) => {
            requests.push({ url, ...request })
            return new Response(state.encrypted
                ? encryptedResponse : JSON.stringify(state.response), { status: 200 })
        }
    })
    function evaluate(code, require) {
        context.module = { exports: {} }
        context.exports = context.module.exports
        context.require = require
        vm.runInContext(`(function (module, exports, require) {\n${code}\n})(module, exports, require)`, context)
        return context.module.exports
    }
    const networking = platform === 'cordova' ? evaluate(cdvNetworking) : undefined
    const sdk = evaluate(platform === 'cordova' ? cdvBundle : rnBundle.outputFiles[0].text, name => {
        if (name === 'react-native') return { Platform: { OS: 'ios' } }
        if (name === 'react-native-powerauth-mobile-sdk') return powerAuthExports
        if (name === 'buffer') return { Buffer }
        if (name === 'cordova-powerauth-networking.WultraPowerAuthNetworking') return networking
        throw new Error(`Unexpected dependency: ${name}`)
    })
    return { sdk, pa: new PowerAuth(), state, requests, nativeCalls }
}

for (const platform of ['react-native', 'cordova']) {
    test(`${platform}: protocol 4 QR signatures accept exactly 32 bytes and retain legacy formats`, () => {
        const { sdk } = load(platform)
        const prefix = `id\nPayment\nConfirm\nA1*Thello\nB\n${Buffer.alloc(16).toString('base64')}\n`
        const signature = Buffer.alloc(32, 1).toString('base64')
        const operation = sdk.WMTQROperationParser.parse(prefix + '2' + signature)
        assert.equal(operation.signature.signingKey, sdk.WMTSigningKey.MAC_PERSONALIZED)
        assert.equal(operation.signedData, prefix + '2')
        assert.equal(operation.signature.signatureString, signature)
        assert.equal(sdk.WMTSigningKeyUtil.typeValue(operation.signature.signingKey), '2')
        for (const length of [0, 31, 33, 64, 255]) {
            assert.throws(() => sdk.WMTQROperationParser.parse(prefix + '2' + Buffer.alloc(length).toString('base64')),
                error => /Invalid offline operation signature data/.test(error.description))
        }
        for (const key of ['0', '1']) {
            const legacy = sdk.WMTQROperationParser.parse(prefix + key + Buffer.alloc(64).toString('base64'))
            assert.equal(sdk.WMTSigningKeyUtil.typeValue(legacy.signature.signingKey), key)
        }
        assert.equal(sdk.WMTSigningKeyUtil.fromTypeValue('3'), undefined)
    })

    test(`${platform}: construction is synchronous and configuration is read anew for each service call`, async () => {
        const { sdk, pa, state, requests } = load(platform)
        const mtoken = pa.createWultraMobileToken('cs', 'test-agent')
        assert.ok(mtoken instanceof sdk.WultraMobileToken)
        assert.equal(state.configurationReads, 0)
        await mtoken.operations.getOperations()
        state.baseURL = 'https://second.test/enrollment'
        state.response.responseObject = { count: 1 }
        await mtoken.inbox.getUnreadCount()
        await mtoken.push.register(sdk.WMTPushData.fcm('push-token'))
        await mtoken.oidc.getConfig('provider')
        assert.equal(state.configurationReads, 4)
        assert.equal(requests[0].url, 'https://example.test/enrollment/api/auth/token/app/operation/list')
        assert.equal(requests[1].url, 'https://second.test/enrollment/api/inbox/count')
        assert.equal(requests[2].url, 'https://second.test/enrollment/api/push/device/register/token')
        assert.equal(requests[3].url, 'https://second.test/enrollment/api/config/oidc')
        for (const request of requests) {
            assert.equal(request.headers.get('Accept-Language'), 'cs')
            assert.equal(request.headers.get('User-Agent'), 'test-agent')
        }
    })

    test(`${platform}: configuration rejection or missing URL rejects calls before transport and can recover`, async () => {
        const { pa, state, requests } = load(platform)
        const mtoken = pa.createWultraMobileToken('en', 'test-agent')
        state.configurationError = new Error('Not configured')
        await assert.rejects(mtoken.operations.getOperations(), error => error === state.configurationError)
        state.configurationError = undefined
        state.baseURL = undefined
        await assert.rejects(mtoken.operations.getOperations(), error => /Base URL not provided/.test(error.description))
        assert.equal(requests.length, 0)
        state.baseURL = 'https://recovered.test'
        await mtoken.operations.getOperations()
        assert.equal(requests.length, 1)
    })

    test(`${platform}: explicit service URL bypasses native configuration`, async () => {
        const { sdk, pa, state, requests } = load(platform)
        state.configurationError = new Error('Must not be read')
        const operations = new sdk.WMTOperations(pa, 'https://override.test/')
        await operations.getOperations()
        assert.equal(state.configurationReads, 0)
        assert.match(requests[0].url, /^https:\/\/override.test\//)
        assert.match(requests[0].headers.get('User-Agent'), /^MobileTokenJS\//)
        assert.ok(operations.networking)
    })

    test(`${platform}: authorization and token requests use PowerAuth 5 headers and preserve payloads`, async () => {
        const { pa, nativeCalls, requests, state } = load(platform)
        const mtoken = pa.createWultraMobileToken('en', 'test-agent')
        const authentication = { password: 'test-pin' }
        const operation = { id: 'operation-id', data: 'Příliš 🐎' }
        await mtoken.operations.authorize(operation, authentication)
        const call = nativeCalls[0]
        assert.equal(call[0], 'authentication')
        assert.equal(call[1], authentication)
        assert.equal(call[2], 'POST')
        assert.equal(call[3], '/operation/authorize')
        assert.equal(call[4], requests[0].body)
        assert.deepEqual(JSON.parse(call[4]), { requestObject: operation })
        assert.equal(requests[0].headers.get('X-PowerAuth-Authorization'), 'auth-value')
        state.response.responseObject = [{ operationCreated: '2026-09-22T10:00:00Z' }]
        const response = await mtoken.operations.getOperations()
        assert.equal(nativeCalls[1][0], 'token')
        assert.equal(nativeCalls[1][1], 'possession_universal')
        assert.equal(requests[1].headers.get('X-PowerAuth-Token'), 'token-value')
        assert.equal(response.responseObject[0].operationCreated.toISOString(), '2026-09-22T10:00:00.000Z')
    })

    test(`${platform}: OIDC preserves encrypted bytes, headers and releases the encryptor`, async () => {
        const { pa, state, requests, nativeCalls } = load(platform)
        state.response.responseObject = { providerId: 'český-provider' }
        const mtoken = pa.createWultraMobileToken('en', 'test-agent')
        const response = await mtoken.oidc.getConfig('český-provider', request => {
            assert.deepEqual(request.body, encryptedRequest)
            request.headers.set('X-Custom', 'value')
            return request
        })
        assert.equal(nativeCalls[0][0], 'encrypt')
        assert.deepEqual(JSON.parse(nativeCalls[0][1]), { providerId: 'český-provider' })
        assert.deepEqual(requests[0].body, encryptedRequest)
        assert.equal(requests[0].headers.get('X-PowerAuth-Encryption'), 'encryption-context')
        assert.equal(requests[0].headers.get('X-Custom'), 'value')
        assert.equal(response.responseObject.providerId, 'český-provider')
        assert.equal(state.decryptions, 1)
        assert.equal(state.releases, 1)
    })

    test(`${platform}: offline authorization uses the new authentication-code API`, async () => {
        const { pa, nativeCalls } = load(platform)
        const mtoken = pa.createWultraMobileToken()
        const authentication = { password: 'test-pin' }
        for (const totp of [undefined, '1234']) {
            const operation = { operationId: 'id', operationData: { sourceString: 'data' }, nonce: 'nonce', totp }
            assert.equal(await mtoken.operations.authorizeOffline(operation, authentication), '12345678')
            const call = nativeCalls.at(-1)
            assert.equal(call[0], 'offline')
            assert.equal(call[1], authentication)
            assert.equal(call[2], '/operation/authorize/offline')
            assert.equal(call[3], 'nonce')
            assert.equal(call[4], totp ? 'id&data&1234' : 'id&data')
        }
    })
}
