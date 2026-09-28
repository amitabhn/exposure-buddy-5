// Loading the real `expo/metro-config` chain here pulls in an ESM-only
// dependency (`yaml`) that Jest's transform pipeline doesn't handle, so the
// default config is mocked rather than loaded for real.
const defaultWatchFolders = ['/fake/default-watch-folder']

jest.mock('expo/metro-config', () => ({
  getDefaultConfig: () => ({
    watchFolders: [...defaultWatchFolders],
    resolver: {},
  }),
}))

describe('metro.config.js', () => {
  it('appends the workspace root to watchFolders instead of replacing them', () => {
    const path = require('path')
    const config = require('./metro.config.js')
    const workspaceRoot = path.resolve(__dirname, '../..')

    expect(config.watchFolders).toEqual([...defaultWatchFolders, workspaceRoot])
  })
})
