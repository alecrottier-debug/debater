import SwiftUI

struct ResultsView: View {
    let debate: Debate
    let decision: JudgeDecision

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Spacing.xl) {
                winnerCard
                if let momentum = decision.momentum {
                    MomentumMeter(momentum: momentum, personaA: debate.personaA, personaB: debate.personaB)
                }
                scoresCard
                if let analysis = decision.analysis {
                    analysisCard(analysis: analysis)
                }
                ballotCard
                bestLinesCard
            }
            .padding(Theme.Spacing.lg)
        }
    }

    private var winnerCard: some View {
        let winnerName: String = {
            switch decision.winner {
            case "A": debate.personaA.name
            case "B": debate.personaB.name
            default: "Tie"
            }
        }()
        let tint: Color = {
            switch decision.winner {
            case "A": Theme.Color.sideA
            case "B": Theme.Color.sideB
            default: Theme.Color.accent
            }
        }()
        return VStack(spacing: Theme.Spacing.sm) {
            Text("Winner").font(Theme.Font.caption).foregroundStyle(Theme.Color.textSecondary)
            Text(winnerName).font(Theme.Font.display).foregroundStyle(tint)
            if let closeness = decision.closeness {
                Text(closeness.capitalized)
                    .font(Theme.Font.caption)
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(tint.opacity(0.15))
                    .clipShape(Capsule())
            }
            if let verdict = decision.verdict {
                Text(humanize(verdict))
                    .font(Theme.Font.serifBody)
                    .foregroundStyle(Theme.Color.textPrimary)
                    .multilineTextAlignment(.center)
                    .padding(.top, Theme.Spacing.sm)
            }
        }
        .frame(maxWidth: .infinity)
        .cardBackground()
    }

    private var scoresCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            Text("Scores").font(Theme.Font.heading)
            scoreRow(label: "Clarity", a: decision.scores.A.clarity, b: decision.scores.B.clarity)
            scoreRow(label: "Strength", a: decision.scores.A.strength, b: decision.scores.B.strength)
            scoreRow(label: "Responsiveness", a: decision.scores.A.responsiveness, b: decision.scores.B.responsiveness)
            scoreRow(label: "Weighing", a: decision.scores.A.weighing, b: decision.scores.B.weighing)
        }
        .cardBackground()
    }

    private func scoreRow(label: String, a: Double, b: Double) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label).font(Theme.Font.caption).foregroundStyle(Theme.Color.textSecondary)
                Spacer()
                Text("\(Self.fmt(a)) – \(Self.fmt(b))").font(Theme.Font.caption).foregroundStyle(Theme.Color.textSecondary)
            }
            GeometryReader { geo in
                let total = max(a + b, 0.0001)
                let leftW = geo.size.width * (a / total)
                HStack(spacing: 0) {
                    Rectangle().fill(Theme.Color.sideA).frame(width: leftW)
                    Rectangle().fill(Theme.Color.sideB)
                }
                .clipShape(Capsule())
            }
            .frame(height: 8)
        }
    }

    private func analysisCard(analysis: SidePair<SideAnalysis>) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            Text("Analysis").font(Theme.Font.heading)
            sideAnalysis(title: debate.personaA.name, tint: Theme.Color.sideA, analysis: analysis.A)
            Divider()
            sideAnalysis(title: debate.personaB.name, tint: Theme.Color.sideB, analysis: analysis.B)
        }
        .cardBackground()
    }

    private func sideAnalysis(title: String, tint: Color, analysis: SideAnalysis) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text(title).font(Theme.Font.heading).foregroundStyle(tint)
            if !analysis.strengths.isEmpty {
                bullet(section: "Strengths", items: analysis.strengths)
            }
            if !analysis.weaknesses.isEmpty {
                bullet(section: "Weaknesses", items: analysis.weaknesses)
            }
            if !analysis.keyMoment.isEmpty {
                Text("Key moment").font(Theme.Font.caption).foregroundStyle(Theme.Color.textSecondary)
                Text(humanize(analysis.keyMoment)).font(Theme.Font.body).foregroundStyle(Theme.Color.textPrimary)
            }
        }
    }

    private func bullet(section: String, items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(section).font(Theme.Font.caption).foregroundStyle(Theme.Color.textSecondary)
            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: 6) {
                    Text("•").foregroundStyle(Theme.Color.textSecondary)
                    Text(humanize(item)).font(Theme.Font.body).foregroundStyle(Theme.Color.textPrimary)
                }
            }
        }
    }

    private var ballotCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            Text("Ballot").font(Theme.Font.heading)
            ForEach(Array(decision.ballot.enumerated()), id: \.offset) { _, entry in
                VStack(alignment: .leading, spacing: 2) {
                    if !entry.refs.isEmpty {
                        Text(entry.refs.map { humanizedRef($0) }.joined(separator: " · "))
                            .font(Theme.Font.caption)
                            .foregroundStyle(Theme.Color.textSecondary)
                    }
                    Text(humanize(entry.reason))
                        .font(Theme.Font.body)
                        .foregroundStyle(Theme.Color.textPrimary)
                }
                .padding(.vertical, 2)
            }
        }
        .cardBackground()
    }

    private var bestLinesCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            Text("Best lines").font(Theme.Font.heading)
            VStack(alignment: .leading, spacing: 4) {
                Text(debate.personaA.name).font(Theme.Font.caption).foregroundStyle(Theme.Color.sideA)
                Text("\u{201C}\(decision.bestLines.A)\u{201D}")
                    .font(Theme.Font.serifBody).italic()
                    .foregroundStyle(Theme.Color.textPrimary)
            }
            Divider()
            VStack(alignment: .leading, spacing: 4) {
                Text(debate.personaB.name).font(Theme.Font.caption).foregroundStyle(Theme.Color.sideB)
                Text("\u{201C}\(decision.bestLines.B)\u{201D}")
                    .font(Theme.Font.serifBody).italic()
                    .foregroundStyle(Theme.Color.textPrimary)
            }
        }
        .cardBackground()
    }

    private static func fmt(_ d: Double) -> String {
        String(format: "%.1f", d)
    }

    /// Scrub any raw stage codes the LLM may have leaked into prose.
    /// New debates don't have this problem (prompt updated); old ones do.
    private func humanize(_ text: String) -> String {
        StageReferenceHumanizer.humanize(text, personaA: debate.personaA, personaB: debate.personaB)
    }

    /// Turns a ballot ref like "A_OPEN" or "B_COUNTER" into a human string
    /// using the side's persona name: "Sam Altman's Opening", "Elon Musk's Counter".
    private func humanizedRef(_ ref: String) -> String {
        let label = StageDisplay.shortLabel(for: ref)
        if ref.hasPrefix("A_") { return "\(debate.personaA.name)'s \(label.lowercased())" }
        if ref.hasPrefix("B_") { return "\(debate.personaB.name)'s \(label.lowercased())" }
        return label
    }
}
