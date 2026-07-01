import SwiftUI

struct RootView: View {
    @Environment(AppEnvironment.self) private var env
    @State private var showDisclaimer = !DisclaimerStore.hasAccepted

    var body: some View {
        TabView {
            Tab("Home", systemImage: "sparkles") { HomeView() }
            Tab("History", systemImage: "clock.arrow.circlepath") { HistoryView() }
            Tab("Personas", systemImage: "person.3") { PersonasView() }
            Tab("FAQ", systemImage: "questionmark.circle") { FAQView() }
        }
        .tint(Theme.Color.accent)
        .fullScreenCover(isPresented: $showDisclaimer) {
            DisclaimerView {
                DisclaimerStore.markAccepted()
                showDisclaimer = false
            }
        }
    }
}
