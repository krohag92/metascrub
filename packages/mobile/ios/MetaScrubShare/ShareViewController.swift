// MetaScrub iOS Share Extension
// Add this target to the Xcode project AFTER running `npx cap add ios`.
// See ios/SETUP.md for step-by-step instructions.
//
// Bundle ID:       com.metadatafinder.metascrub.ShareExtension
// App Group:       group.com.metadatafinder.metascrub
// URL Scheme:      metascrub://share?path=<encoded-path>

import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        handleSharedItems()
    }

    private func handleSharedItems() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            completeRequest()
            return
        }

        // Collect all attachments from all extension items
        var providers: [NSItemProvider] = []
        for item in extensionItems {
            if let attachments = item.attachments {
                providers.append(contentsOf: attachments)
            }
        }

        guard let provider = providers.first else {
            completeRequest()
            return
        }

        // Determine the best type to load
        let typeIdentifiers: [String] = [
            UTType.fileURL.identifier,
            UTType.url.identifier,
            "public.file-url",
            "public.data",
        ]

        var loaded = false
        for typeId in typeIdentifiers {
            if provider.hasItemConformingToTypeIdentifier(typeId) {
                loaded = true
                provider.loadItem(forTypeIdentifier: typeId, options: nil) { [weak self] item, error in
                    guard let self = self else { return }
                    if let url = item as? URL {
                        self.processSharedFile(url: url)
                    } else if let data = item as? Data,
                              let url = URL(dataRepresentation: data, relativeTo: nil) {
                        self.processSharedFile(url: url)
                    } else {
                        self.completeRequest()
                    }
                }
                break
            }
        }

        if !loaded {
            completeRequest()
        }
    }

    private func processSharedFile(url: URL) {
        // Copy the file into the shared App Group container so the main app can read it
        let appGroupId = "group.com.metadatafinder.metascrub"
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else {
            completeRequest()
            return
        }

        let sharedDir = containerURL.appendingPathComponent("SharedFiles", isDirectory: true)
        try? FileManager.default.createDirectory(at: sharedDir, withIntermediateDirectories: true)

        let destURL = sharedDir.appendingPathComponent(url.lastPathComponent)

        // Remove stale copy if it exists
        try? FileManager.default.removeItem(at: destURL)

        do {
            try FileManager.default.copyItem(at: url, to: destURL)
        } catch {
            // If copy fails, pass the original URL path directly
            openMainApp(filePath: url.path)
            return
        }

        openMainApp(filePath: destURL.path)
    }

    private func openMainApp(filePath: String) {
        // Encode the path and open the main app via custom URL scheme
        guard let encoded = filePath.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let deepLinkURL = URL(string: "metascrub://share?path=\(encoded)") else {
            completeRequest()
            return
        }

        // Save last shared path to UserDefaults in the app group container
        let defaults = UserDefaults(suiteName: "group.com.metadatafinder.metascrub")
        defaults?.set(filePath, forKey: "lastSharedFilePath")
        defaults?.synchronize()

        // Open the main app
        var responder: UIResponder? = self
        while let next = responder?.next {
            responder = next
            if let application = responder as? UIApplication {
                application.open(deepLinkURL, options: [:]) { _ in }
                break
            }
        }

        completeRequest()
    }

    private func completeRequest() {
        DispatchQueue.main.async {
            self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }
}
