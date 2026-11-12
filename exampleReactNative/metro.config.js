const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sharedSource = path.join(root, 'packages/lib-shared/js');
const appModules = path.join(__dirname, 'node_modules');
const rootModules = path.join(root, 'node_modules');
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const singletons = ['react', 'react-native',
  'react-native-powerauth-mobile-sdk', 'react-native-powerauth-networking'];

// `yarn e2e rn` sets this to the extracted npm tarball so tests exercise the published bundle.
const sdkPackage = process.env.MTOKEN_E2E_SDK_PACKAGE;
const sdkEntry = sdkPackage
  ? path.join(sdkPackage, JSON.parse(fs.readFileSync(path.join(sdkPackage, 'package.json'), 'utf8')).main)
  : path.join(sharedSource, 'index.ts');

/** Metro loads editable SDK source from the workspace, or the packed SDK during `yarn e2e rn`. */
const config = {
  watchFolders: [sharedSource, rootModules, ...(sdkPackage ? [sdkPackage] : [])],
  resolver: {
    unstable_enableSymlinks: true,
    nodeModulesPaths: [appModules, rootModules],
    extraNodeModules: Object.fromEntries(singletons.map(name =>
      [name, path.join(appModules, name)])),
    blockList: new RegExp(`^${escapeRegex(rootModules)}[\\/](${singletons.join('|')})[\\/].*$`),
    resolveRequest: (context, moduleName, platform) => {
      if (context.originModulePath.includes(`${path.sep}src${path.sep}tests${path.sep}`) &&
          ['./credentials.json', './utils/test-config.json'].includes(moduleName)) {
        const fallback = path.resolve(path.dirname(context.originModulePath), moduleName);
        const privateFile = fallback.replace('.json', '-private.json');
        return {filePath: fs.existsSync(privateFile) ? privateFile : fallback, type: 'sourceFile'};
      }
      if (moduleName === 'react-native-mtoken-sdk') {
        return {filePath: sdkEntry, type: 'sourceFile'};
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
