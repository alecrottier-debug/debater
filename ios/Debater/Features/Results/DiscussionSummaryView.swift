import SwiftUI

/// Shown at the end of a completed Discussion — distills the MOD_WRAP
/// turn's payload (keyTakeaways, areas of agreement/disagreement, open
/// questions) into a readable recap. Discussions have no judge/winner.
struct DiscussionSummaryView: View {
    let debate: Debate

    private var wrapTurn: Turn? {
        debate.turns?.first(where: { $0.stageId == "MOD_WRAP" })
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Spacing.xl) {
                headerCard

                if let payload = wrapTurn?.payload {
                    if let takeaways = payload.keyTakeaways, !takeaways.isEmpty {
                        summaryCard(title: "Key Takeaways", items: takeaways, icon: "sparkle", tint: Theme.Color.accent)
                    }
                    if let agreement = payload.areasOfAgreement, !agreement.isEmpty {
                        summaryCard(title: "Where They Agreed", items: agreement, icon: "checkmark.circle", tint: Theme.Color.guestA)
                    }
                    if let disagreement = payload.areasOfDisagreement, !disagreement.isEmpty {
                        summaryCard(title: "Where They Diverged", items: disagreement, icon: "arrow.triangle.branch", tint: Theme.Color.guestB)
                    }
                    if let questions = payload.openQuestions, !questions.isEmpty {
                        summaryCard(title: "Open Questions", items: questions, icon: "questionmark.circle", tint: Theme.Color.moderator)
                    }
                } else {
                    Text("Summary not available.")
                        .font(Theme.Font.body)
                        .foregroundStyle(Theme.Color.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(Theme.Spacing.lg)
                }
            }
            .padding(Theme.Spacing.lg)
        }
    }

    private var headerCard: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Text("Discussion Complete")
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.textSecondary)
                .textCase(.uppercase)
            Text(debate.motion)
                .font(Theme.Font.title)
                .foregroundStyle(Theme.Color.textPrimary)
                .multilineTextAlignment(.center)
            HStack(spacing: Theme.Spacing.md) {
                Text(debate.personaA.name).font(Theme.Font.heading).foregroundStyle(Theme.Color.guestA)
                Text("&").font(Theme.Font.caption).foregroundStyle(Theme.Color.textSecondary)
                Text(debate.personaB.name).font(Theme.Font.heading).foregroundStyle(Theme.Color.guestB)
            }
        }
        .frame(maxWidth: .infinity)
        .cardBackground()
    }

    private func summaryCard(title: String, items: [String], icon: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack(spacing: Theme.Spacing.sm) {
                Image(systemName: icon).foregroundStyle(tint)
                Text(title).font(Theme.Font.heading).foregroundStyle(Theme.Color.textPrimary)
            }
            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: Theme.Spacing.sm) {
                    Circle().fill(tint).frame(width: 6, height: 6).padding(.top, 8)
                    Text(item)
                        .font(Theme.Font.serifBody)
                        .foregroundStyle(Theme.Color.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .cardBackground()
    }
}
