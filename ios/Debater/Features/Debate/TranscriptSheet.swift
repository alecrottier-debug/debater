import SwiftUI

struct TranscriptSheet: View {
    let debate: Debate
    @Environment(\.dismiss) private var dismiss
    @Environment(AppEnvironment.self) private var env

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.md) {
                    ForEach(debate.turns ?? []) { turn in
                        SpeechCard(turn: turn, personaA: debate.personaA, personaB: debate.personaB, baseURL: env.api.baseURL)
                    }
                }
                .padding(Theme.Spacing.lg)
            }
            .background(Theme.Color.background.ignoresSafeArea())
            .navigationTitle("Transcript")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Close") { dismiss() } }
            }
        }
    }
}
