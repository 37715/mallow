import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAudioSession()
        return true
    }

    /// **Without this the game is silent whenever the ringer switch is off.**
    ///
    /// WebAudio inside a WKWebView runs on the app's audio session, and the
    /// default one obeys the hardware silent switch. Every purr, coin and room
    /// tone is synthesised in `audio/audio.ts` and works perfectly — and none
    /// of it reaches the speaker on a phone that is on silent, which is most
    /// phones. Nothing errors, so it reads as "the audio is broken" rather
    /// than "the audio is muted", and **no browser build can ever show it**.
    ///
    /// Two things about the way this is written matter:
    ///
    /// - **`.playback` with no `.mixWithOthers`.** The mixing option was there
    ///   to be polite — the ambient bed is quiet enough to sit under a podcast
    ///   (§10) — but Ellis asked for sound that always plays, and a session
    ///   that declares itself mixable is asking to be treated as secondary
    ///   audio. Audible always beats polite here. Putting the option back is a
    ///   one-word change, and the cost of *not* having it is that starting the
    ///   game pauses whatever the player was listening to.
    /// - **It is re-applied every time the app becomes active**, not only at
    ///   launch. A phone call, Siri, or another app taking an exclusive
    ///   session can leave ours deactivated, and a category set once at launch
    ///   does not recover from that — the app comes back looking fine and
    ///   silent. That call lives in `SceneDelegate.sceneDidBecomeActive`, and
    ///   **not** in `applicationDidBecomeActive` here: this app has a
    ///   `UIApplicationSceneManifest`, and in a scene-based app the
    ///   application-level activation callbacks are never invoked at all.
    ///   `didFinishLaunchingWithOptions` still is, which is why the launch
    ///   call below has always run.
    ///
    /// **On its own this is not enough, and that is the whole history of this
    /// bug.** `.playback` has been set here since 2026-08-25 and the game was
    /// still silent on a phone with the ringer off. WKWebView renders in its
    /// own process and WebKit picks an audio session category to suit what the
    /// page is doing — and a page that only ever uses WebAudio, with no media
    /// element anywhere, does not read as media playback. See
    /// `keepMediaSessionAwake` in `src/audio/audio.ts` for the other half.
    func configureAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
        } catch {
            // A café that is silent is still a café. Never fail to launch over this.
            print("[mallow] could not configure the audio session: \(error)")
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        //
        // **Nothing audio-related goes here.** This app is scene-based, so this
        // method is never called — see `configureAudioSession`. The re-assert
        // lives in `SceneDelegate.sceneDidBecomeActive`.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
