const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Let Metro resolve packages from the monorepo root (pnpm workspace)
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Exclude test files so @testing-library/react-native is never bundled at runtime
config.resolver.blockList = [/.*\.(test|spec)\.[jt]sx?$/, /.*__tests__.*/]

// @supabase/supabase-js@2.106.1 index.mjs has dynamic import(OTEL_PKG) which Hermes
// rejects at compile time. Prepending 'require' makes Metro pick index.cjs instead,
// which uses Promise.resolve+require — safe for Hermes.
config.resolver.unstable_conditionsByPlatform = {
  ...config.resolver.unstable_conditionsByPlatform,
  android: ['require', 'react-native', 'default'],
}

module.exports = config
