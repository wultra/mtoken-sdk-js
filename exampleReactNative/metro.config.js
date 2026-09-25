const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sharedSource = path.join(root, 'packages/lib-shared/js');
const versionSource = path.join(root, '.build/rn/src/WMTSDKVersion.ts');
const appModules = path.join(__dirname, 'node_modules');
const rootModules = path.join(root, 'node_modules');
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const singletons = ['react', 'react-native',
  'react-native-powerauth-mobile-sdk', 'react-native-powerauth-networking'];

/** Metro loads editable SDK source from the workspace. */
const config = {
  watchFolders: [sharedSource, path.join(root, '.build/rn/src'),
    path.join(root, 'packages/lib-rn'), rootModules],
  resolver: {
    unstable_enableSymlinks: true,
    nodeModulesPaths: [appModules, rootModules],
    extraNodeModules: Object.fromEntries(singletons.map(name =>
      [name, path.join(appModules, name)])),
    blockList: new RegExp(`^${escapeRegex(rootModules)}[\\/](${singletons.join('|')})[\\/].*$`),
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native-mtoken-sdk') {
        return {filePath: path.join(sharedSource, 'index.ts'), type: 'sourceFile'};
      }
      if (context.originModulePath.startsWith(sharedSource + path.sep) &&
          moduleName.startsWith('.') &&
          path.resolve(path.dirname(context.originModulePath), moduleName) ===
            path.join(sharedSource, 'WMTSDKVersion')) {
        return {filePath: versionSource, type: 'sourceFile'};
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
