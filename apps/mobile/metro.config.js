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

module.exports = config
