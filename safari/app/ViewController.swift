import UIKit
import WebKit
import SafariServices

/// EMPsize container app: one setup screen (safari/app/Main.html).
class ViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0x0b / 255, green: 0x0a / 255, blue: 0x09 / 255, alpha: 1)
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.backgroundColor = view.backgroundColor
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.navigationDelegate = self
        webView.configuration.userContentController.add(self, name: "controller")
        webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!,
                            allowingReadAccessTo: Bundle.main.resourceURL!)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript("show('ios')")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? String, body == "open-settings" else { return }
        openExtensionSettings()
    }

    private var extensionID: String { (Bundle.main.bundleIdentifier ?? "com.gmunoz.focusreader") + ".Extension" }

    /// iOS 26.2+: public API straight to empsize's page in safari > extensions.
    /// older: private prefs url (fine for testflight), then the app's own settings page.
    private func openExtensionSettings() {
        if #available(iOS 26.2, *) {
            SFSafariSettings.openExtensionsSettings(forIdentifiers: [extensionID]) { [weak self] error in
                if error != nil { self?.openFallback() }
            }
        } else {
            openFallback()
        }
    }

    private func openFallback() {
        let app = UIApplication.shared
        if let url = URL(string: "App-prefs:SAFARI&path=WEB_EXTENSIONS") {
            app.open(url, options: [:]) { ok in
                if !ok, let s = URL(string: UIApplication.openSettingsURLString) { app.open(s) }
            }
        } else if let s = URL(string: UIApplication.openSettingsURLString) {
            app.open(s)
        }
    }
}
