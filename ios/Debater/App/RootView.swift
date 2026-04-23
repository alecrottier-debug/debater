import SwiftUI

struct RootView: View {
    @Environment(AppEnvironment.self) private var env
    @State private var showDisclaimer = !DisclaimerStore.hasAccepted

    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "sparkles") }

            HistoryView()
                .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }

            PersonasView()
                .tabItem { Label("Personas", systemImage: "person.3") }

            FAQView()
                .tabItem { Label("FAQ", systemImage: "questionmark.circle") }
        }
        .fullScreenCover(isPresented: $showDisclaimer) {
            DisclaimerView {
                DisclaimerStore.markAccepted()
                showDisclaimer = false
            }
        }
    }
}
