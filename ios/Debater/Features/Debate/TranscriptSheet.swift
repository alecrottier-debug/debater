import SwiftUI

struct TranscriptSheet: View {
    let debate: Debate
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.md) {
                    ForEach(debate.turns ?? []) { turn in
                        SpeechCard(turn: turn, personaA: debate.personaA, personaB: debate.personaB)
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
