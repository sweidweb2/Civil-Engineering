const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { FileStore } = require('metro-cache')
const { withUniwindConfig } = require('uniwind/metro')

const config = getDefaultConfig(__dirname)

// Windows ends up with "EMFILE: too many open files" when Metro fans out reads
// across the shared %TEMP%/metro-cache. Keep the cache inside the project and
// cap parallel workers so open handles stay bounded.
config.cacheStores = [new FileStore({ root: path.join(__dirname, '.metro-cache') })]
config.maxWorkers = 2

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
  extraThemes: ['dark'],
})
