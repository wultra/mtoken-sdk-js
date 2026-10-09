const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sharedSource = path.join(root, 'packages/lib-shared/js');
const appModules = path.join(__dirname, 'node_modules');
const rootModules = path.join(root, 'node_modules');
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const singletons = ['react', 'react-native',
  'react-native-powerauth-mobile-sdk', 'react-native-powerauth-networking'];

/** Metro loads editable SDK source from the workspace. */
const config = {
  watchFolders: [sharedSource, rootModules],
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
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
