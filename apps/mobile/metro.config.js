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

// @supabase/supabase-js@2.106.1 dist/index.mjs uses dynamic `import(OTEL_PKG)` for
// optional OpenTelemetry. Hermes rejects dynamic ESM imports at compile time
// (hermesc exit 2). Redirect bare imports of the package to its CJS bundle, which
// uses a Hermes-safe Promise.resolve+require pattern. Metro itself resolves the
// subpath via the package's `./dist/*` exports entry.
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@supabase/supabase-js') {
    return context.resolveRequest(context, '@supabase/supabase-js/dist/index.cjs', platform)
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform)
}

module.exports = config
