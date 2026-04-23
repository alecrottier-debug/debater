import SwiftUI

@main
struct DebaterApp: App {
    @State private var environment = AppEnvironment.live

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(environment)
                .tint(Theme.Color.accent)
                // The design is a tuned parchment/serif light palette; forcing
                // light mode keeps system-surface elements (TextField, Form
                // backgrounds, sheets) consistent with our hand-picked colors.
                // Add a proper dark-mode pass later if wanted.
                .preferredColorScheme(.light)
        }
    }
}
