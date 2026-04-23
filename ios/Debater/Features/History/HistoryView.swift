import SwiftUI

struct HistoryView: View {
    @Environment(AppEnvironment.self) private var env
    @State private var viewModel: HistoryViewModel?

    var body: some View {
        NavigationStack {
            Group {
                if let viewModel {
                    HistoryContent(viewModel: viewModel)
                } else {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .background(Theme.Color.background.ignoresSafeArea())
            .navigationTitle("History")
        }
        .task {
            if viewModel == nil {
                viewModel = HistoryViewModel(api: env.api)
                await viewModel?.load()
            }
        }
    }
}

@Observable
@MainActor
final class HistoryViewModel {
    enum Filter: String, CaseIterable, Identifiable {
        case all, debates, discussions
        var id: String { rawValue }
        var title: String {
            switch self {
            case .all: "All"
            case .debates: "Debates"
            case .discussions: "Discussions"
            }
        }
    }

    var debates: [Debate] = []
    var filter: Filter = .all
    var errorMessage: String?
    var isLoading = false
    private let api: APIClient

    init(api: APIClient) { self.api = api }

    var filtered: [Debate] {
        switch filter {
        case .all: return debates
        case .debates: return debates.filter { $0.mode == "quick" }
        case .discussions: return debates.filter { $0.mode == "discussion" }
        }
    }

    // Aggregate stats across ALL records (not filtered) so users see the
    // full picture at a glance.
    struct Stats {
        var totalDebates: Int
        var totalDiscussions: Int
        var forWins: Int       // FOR side won
        var againstWins: Int   // AGAINST side won
        var ties: Int
    }

    var stats: Stats {
        var s = Stats(totalDebates: 0, totalDiscussions: 0, forWins: 0, againstWins: 0, ties: 0)
        for d in debates {
            if d.mode == "discussion" {
                s.totalDiscussions += 1
            } else {
                s.totalDebates += 1
                if let winner = d.judgeDecision?.winner {
                    switch winner {
                    case "A": s.forWins += 1
                    case "B": s.againstWins += 1
                    default: s.ties += 1
                    }
                }
            }
        }
        return s
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            debates = try await api.fetchDebates()
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

private struct HistoryContent: View {
    @Bindable var viewModel: HistoryViewModel
    @Environment(AppEnvironment.self) private var env

    var body: some View {
        VStack(spacing: 0) {
            Picker("Filter", selection: $viewModel.filter) {
                ForEach(HistoryViewModel.Filter.allCases) { f in
                    Text(f.title).tag(f)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, Theme.Spacing.lg)
            .padding(.top, Theme.Spacing.lg)
            .padding(.bottom, Theme.Spacing.md)

            if viewModel.isLoading && viewModel.debates.isEmpty {
                Spacer(); ProgressView(); Spacer()
            } else if let err = viewModel.errorMessage {
                ContentUnavailableView("Couldn't load history", systemImage: "wifi.slash", description: Text(err))
            } else if viewModel.debates.isEmpty {
                ContentUnavailableView("No debates yet", systemImage: "tray", description: Text("Start a new debate from the Home tab."))
            } else {
                ScrollView {
                    VStack(spacing: Theme.Spacing.md) {
                        StatsCard(stats: viewModel.stats)
                            .padding(.horizontal, Theme.Spacing.lg)
                        if viewModel.filtered.isEmpty {
                            Text("No \(viewModel.filter.title.lowercased()) yet.")
                                .font(Theme.Font.caption)
                                .foregroundStyle(Theme.Color.textSecondary)
                                .padding(.top, Theme.Spacing.xl)
                        } else {
                            VStack(spacing: Theme.Spacing.sm) {
                                ForEach(viewModel.filtered) { debate in
                                    NavigationLink(value: debate) {
                                        DebateRow(debate: debate, baseURL: env.api.baseURL)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, Theme.Spacing.lg)
                        }
                    }
                    .padding(.bottom, Theme.Spacing.xl)
                }
                .refreshable { await viewModel.load() }
            }
        }
        .navigationDestination(for: Debate.self) { debate in
            DebateView(debate: debate)
        }
    }
}

private struct StatsCard: View {
    let stats: HistoryViewModel.Stats

    var body: some View {
        VStack(spacing: Theme.Spacing.md) {
            HStack(spacing: Theme.Spacing.lg) {
                stat(value: stats.totalDebates, label: "Debates", tint: Theme.Color.sideA)
                divider
                stat(value: stats.totalDiscussions, label: "Discussions", tint: Theme.Color.guestA)
            }

            if stats.totalDebates > 0 {
                Divider()
                HStack(spacing: Theme.Spacing.md) {
                    winShare(count: stats.forWins, label: "For", tint: Theme.Color.sideA, total: stats.totalDebates)
                    winShare(count: stats.againstWins, label: "Against", tint: Theme.Color.sideB, total: stats.totalDebates)
                    winShare(count: stats.ties, label: "Tie", tint: Theme.Color.textSecondary, total: stats.totalDebates)
                }
            }
        }
        .cardBackground()
    }

    private func stat(value: Int, label: String, tint: Color) -> some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.system(.largeTitle, design: .serif, weight: .bold))
                .foregroundStyle(tint)
            Text(label)
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.textSecondary)
                .textCase(.uppercase)
        }
        .frame(maxWidth: .infinity)
    }

    private var divider: some View {
        Rectangle()
            .fill(Theme.Color.divider)
            .frame(width: 1, height: 36)
    }

    private func winShare(count: Int, label: String, tint: Color, total: Int) -> some View {
        let pct = total > 0 ? Int(round(Double(count) / Double(total) * 100)) : 0
        return VStack(spacing: 2) {
            Text("\(pct)%")
                .font(.system(.title3, design: .serif, weight: .semibold))
                .foregroundStyle(tint)
            Text("\(label) \(count > 0 ? "(\(count))" : "")")
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct DebateRow: View {
    let debate: Debate
    let baseURL: URL

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                Text(debate.mode == "discussion" ? "Discussion" : "Debate")
                    .font(Theme.Font.caption)
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(badgeTint.opacity(0.15))
                    .foregroundStyle(badgeTint)
                    .clipShape(Capsule())
                Spacer()
                Text(statusLabel)
                    .font(Theme.Font.caption)
                    .foregroundStyle(Theme.Color.textSecondary)
            }

            Text(debate.motion)
                .font(Theme.Font.heading)
                .foregroundStyle(Theme.Color.textPrimary)
                .multilineTextAlignment(.leading)
                .lineLimit(2)

            HStack(spacing: Theme.Spacing.md) {
                participantPill(persona: debate.personaA, tint: sideATint, isWinner: debate.judgeDecision?.winner == "A")
                Text(debate.mode == "discussion" ? "&" : "vs")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Theme.Color.textSecondary)
                participantPill(persona: debate.personaB, tint: sideBTint, isWinner: debate.judgeDecision?.winner == "B")
            }

            if let outcome = outcomeLabel {
                HStack(spacing: 4) {
                    Image(systemName: "trophy.fill").foregroundStyle(outcomeTint)
                    Text(outcome)
                        .font(Theme.Font.caption)
                        .foregroundStyle(outcomeTint)
                }
            }
        }
        .cardBackground(padding: Theme.Spacing.md)
    }

    private var sideATint: Color { debate.mode == "discussion" ? Theme.Color.guestA : Theme.Color.sideA }
    private var sideBTint: Color { debate.mode == "discussion" ? Theme.Color.guestB : Theme.Color.sideB }
    private var badgeTint: Color { debate.mode == "discussion" ? Theme.Color.guestA : Theme.Color.accent }

    private func participantPill(persona: Persona, tint: Color, isWinner: Bool) -> some View {
        HStack(spacing: 6) {
            PersonaAvatar(persona: persona, baseURL: baseURL, size: 24, tint: tint)
            Text(persona.name)
                .font(Theme.Font.caption)
                .foregroundStyle(isWinner ? tint : Theme.Color.textPrimary)
                .fontWeight(isWinner ? .bold : .regular)
                .lineLimit(1)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(isWinner ? tint.opacity(0.12) : Color.clear)
        .clipShape(Capsule())
    }

    private var statusLabel: String {
        switch debate.status {
        case .completed: "Completed"
        case .inProgress: "In Progress"
        case .pending: "Pending"
        case .error: "Error"
        }
    }

    private var outcomeLabel: String? {
        guard debate.mode != "discussion", let decision = debate.judgeDecision else { return nil }
        switch decision.winner {
        case "A": return "\(debate.personaA.name) wins"
        case "B": return "\(debate.personaB.name) wins"
        case "TIE": return "Tie"
        default: return nil
        }
    }

    private var outcomeTint: Color {
        guard let winner = debate.judgeDecision?.winner else { return Theme.Color.textSecondary }
        switch winner {
        case "A": return Theme.Color.sideA
        case "B": return Theme.Color.sideB
        default: return Theme.Color.textSecondary
        }
    }
}
