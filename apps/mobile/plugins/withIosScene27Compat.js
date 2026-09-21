const { withInfoPlist, withAppDelegate, withPodfile, IOSConfig } = require('@expo/config-plugins')
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode')

// Xcode 27's iOS SDK hard-requires UIScene lifecycle adoption. The default RN/Expo
// AppDelegate template creates its window and starts React Native directly inside
// didFinishLaunchingWithOptions, with no scene involved at all — that now crashes
// on launch with "UIScene life cycle is required for apps built with this SDK."
//
// This plugin adds a SceneDelegate that ATTACHES the window ExpoAppDelegate already
// creates to the connecting UIWindowScene, rather than creating a new one. The window
// has to stay created in didFinishLaunchingWithOptions (not moved into the scene
// delegate) because expo-dev-launcher's AppDelegateSubscriber reads
// `UIApplication.shared.delegate?.window` synchronously during that same call, before
// any scene has connected — see ExpoDevLauncherAppDelegateSubscriber.swift.

const SCENE_DELEGATE_SWIFT = `import UIKit

// Attaches the window ExpoAppDelegate already created (in didFinishLaunchingWithOptions)
// to the connecting UIWindowScene. Required by Xcode 27+ SDKs; see withIosScene27Compat.js
// for why window creation itself stays in AppDelegate rather than moving here.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    guard let window = appDelegate.window else { return }

    window.windowScene = windowScene
    self.window = window
    window.makeKeyAndVisible()
  }
}
`

const APP_DELEGATE_SCENE_CONFIG_METHOD = `
  // UIScene lifecycle is required by newer iOS SDKs (Xcode 26+); wire the scene to
  // SceneDelegate, which attaches the window created in didFinishLaunchingWithOptions
  // above to the connecting UIWindowScene.
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
`

const POD_DEPLOYMENT_TARGET_FIX = `    # Resource-bundle pod targets (e.g. Sentry-Sentry) aren't covered by
    # react_native_post_install's deployment-target bump and stay at the
    # podspec-declared minimum (often 11.0). Newer SDKs (Xcode 26+) reject
    # anything below 15.0, so force every target to the platform minimum.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        deployment_target = config.build_settings["IPHONEOS_DEPLOYMENT_TARGET"]
        if deployment_target && deployment_target.to_f < 15.0
          config.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "15.1"
        end
      end
    end`

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
    }
    return config
  })
}

function withSceneDelegateFile(config) {
  return IOSConfig.XcodeProjectFile.withBuildSourceFile(config, {
    filePath: 'SceneDelegate.swift',
    contents: SCENE_DELEGATE_SWIFT,
    overwrite: true,
  })
}

function withAppDelegateSceneConfig(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        'withIosScene27Compat expects a Swift AppDelegate (RN 0.76+ template). ' +
          `Got: ${config.modResults.language}`
      )
    }

    try {
      config.modResults.contents = mergeContents({
        src: config.modResults.contents,
        newSrc: APP_DELEGATE_SCENE_CONFIG_METHOD,
        tag: 'ios-scene-27-compat-app-delegate',
        anchor: /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
        offset: 2,
        comment: '//',
      }).contents
    } catch (error) {
      if (error.code === 'ERR_NO_MATCH') {
        throw new Error(
          'withIosScene27Compat could not find the expected didFinishLaunchingWithOptions ' +
            'return statement in the generated AppDelegate.swift. The Expo/RN AppDelegate ' +
            'template likely changed — update the anchor in withIosScene27Compat.js.'
        )
      }
      throw error
    }

    return config
  })
}

function withPodDeploymentTargetFix(config) {
  return withPodfile(config, (config) => {
    try {
      config.modResults.contents = mergeContents({
        src: config.modResults.contents,
        newSrc: POD_DEPLOYMENT_TARGET_FIX,
        tag: 'ios-scene-27-compat-podfile-deployment-target',
        anchor: /:ccache_enabled => ccache_enabled\?\(podfile_properties\),/,
        offset: 2,
        comment: '#',
      }).contents
    } catch (error) {
      if (error.code === 'ERR_NO_MATCH') {
        throw new Error(
          'withIosScene27Compat could not find the expected post_install block in the ' +
            'generated Podfile. The Expo/RN Podfile template likely changed — update the ' +
            'anchor in withIosScene27Compat.js.'
        )
      }
      throw error
    }
    return config
  })
}

// Works around Xcode 27's SDK requiring UIScene lifecycle adoption and a CocoaPods
// resource-bundle deployment-target gap, both of which otherwise crash/fail the iOS
// build on newer Xcode versions. Safe on older Xcode/SDKs too — scene lifecycle is the
// standard modern setup, and the Podfile fix only raises deployment targets already
// below the project minimum.
module.exports = function withIosScene27Compat(config) {
  config = withSceneManifest(config)
  config = withSceneDelegateFile(config)
  config = withAppDelegateSceneConfig(config)
  config = withPodDeploymentTargetFix(config)
  return config
}
