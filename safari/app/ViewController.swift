import UIKit
import WebKit

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
        guard let body = message.body as? String, body == "open-settings",
              let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}
