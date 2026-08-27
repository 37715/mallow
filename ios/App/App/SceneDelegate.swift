import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    /// Re-apply the audio session every time the app comes back to the front.
    ///
    /// **This is the scene-based app's `applicationDidBecomeActive`.** Because
    /// `Info.plist` carries a `UIApplicationSceneManifest`, the equivalent
    /// method on `AppDelegate` is never called — putting it there looks right,
    /// compiles, and silently does nothing.
    ///
    /// Why re-apply at all: a phone call, Siri, or another app taking an
    /// exclusive session can leave ours deactivated, and a category set once
    /// at launch never recovers. The app comes back looking fine and silent.
    func sceneDidBecomeActive(_ scene: UIScene) {
        (UIApplication.shared.delegate as? AppDelegate)?.configureAudioSession()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
