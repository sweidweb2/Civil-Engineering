const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { FileStore } = require('metro-cache')
const { withUniwindConfig } = require('uniwind/metro')

const config = getDefaultConfig(__dirname)

// withUniwindConfig always resets cacheStores to %TEMP%/metro-cache — that blows
// past Windows handle limits (EMFILE). Re-apply a project-local store afterward.
const withUniwind = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
  extraThemes: ['dark'],
})

withUniwind.cacheStores = [new FileStore({ root: path.join(__dirname, '.metro-cache') })]
withUniwind.maxWorkers = 2

module.exports = withUniwind
