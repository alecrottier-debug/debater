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
            .background(AmbientBackground())
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
    }

    struct DebaterStanding: Identifiable, Hashable {
        let persona: Persona
        let wins: Int
        let losses: Int
        var id: String { persona.id }
        var totalMatches: Int { wins + losses }
    }

    var stats: Stats {
        var s = Stats(totalDebates: 0, totalDiscussions: 0)
        for d in debates {
            if d.mode == "discussion" { s.totalDiscussions += 1 }
            else { s.totalDebates += 1 }
        }
        return s
    }

    /// Top 3 debaters by wins across all completed debates. Ties broken by
    /// win rate, then by total matches.
    var topDebaters: [DebaterStanding] {
        struct Record { var persona: Persona; var wins: Int; var losses: Int }
        var byId: [String: Record] = [:]

        for d in debates where d.mode != "discussion" {
            guard let winner = d.judgeDecision?.winner else { continue }
            let aWon = winner == "A"
            let bWon = winner == "B"
            if byId[d.personaAId] == nil { byId[d.personaAId] = Record(persona: d.personaA, wins: 0, losses: 0) }
            if byId[d.personaBId] == nil { byId[d.personaBId] = Record(persona: d.personaB, wins: 0, losses: 0) }
            if aWon {
                byId[d.personaAId]?.wins += 1
                byId[d.personaBId]?.losses += 1
            } else if bWon {
                byId[d.personaBId]?.wins += 1
                byId[d.personaAId]?.losses += 1
            }
            // Ties count as neither; intentional.
        }

        return byId.values
            .filter { $0.wins > 0 }
            .sorted {
                if $0.wins != $1.wins { return $0.wins > $1.wins }
                let lhsRate = Double($0.wins) / Double(max($0.wins + $0.losses, 1))
                let rhsRate = Double($1.wins) / Double(max($1.wins + $1.losses, 1))
                if lhsRate != rhsRate { return lhsRate > rhsRate }
                return ($0.wins + $0.losses) > ($1.wins + $1.losses)
            }
            .prefix(3)
            .map { DebaterStanding(persona: $0.persona, wins: $0.wins, losses: $0.losses) }
    }

    func debatesInvolving(personaId: String) -> [Debate] {
        debates.filter { $0.personaAId == personaId || $0.personaBId == personaId }
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
                        StatsCard(
                            stats: viewModel.stats,
                            topDebaters: viewModel.topDebaters,
                            baseURL: env.api.baseURL
                        )
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
        .navigationDestination(for: HistoryViewModel.DebaterStanding.self) { standing in
            PersonaDebatesView(
                persona: standing.persona,
                debates: viewModel.debatesInvolving(personaId: standing.persona.id),
                baseURL: env.api.baseURL
            )
        }
    }
}

private struct StatsCard: View {
    let stats: HistoryViewModel.Stats
    let topDebaters: [HistoryViewModel.DebaterStanding]
    let baseURL: URL

    var body: some View {
        VStack(spacing: Theme.Spacing.md) {
            HStack(spacing: Theme.Spacing.lg) {
                stat(value: stats.totalDebates, label: "Debates", tint: Theme.Color.sideA)
                divider
                stat(value: stats.totalDiscussions, label: "Discussions", tint: Theme.Color.guestA)
            }

            if !topDebaters.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                    HStack(spacing: 6) {
                        Image(systemName: "trophy.fill").foregroundStyle(Theme.Color.sideA).font(.caption)
                        Text("Top debaters")
                            .font(Theme.Font.caption)
                            .foregroundStyle(Theme.Color.textSecondary)
                            .textCase(.uppercase)
                    }
                    VStack(spacing: Theme.Spacing.sm) {
                        ForEach(Array(topDebaters.enumerated()), id: \.element.id) { index, standing in
                            NavigationLink(value: standing) {
                                TopDebaterRow(rank: index + 1, standing: standing, baseURL: baseURL)
                            }
                            .buttonStyle(.plain)
                        }
                    }
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
}

private struct TopDebaterRow: View {
    let rank: Int
    let standing: HistoryViewModel.DebaterStanding
    let baseURL: URL

    var body: some View {
        HStack(spacing: Theme.Spacing.md) {
            Text("\(rank)")
                .font(.system(.subheadline, design: .serif, weight: .bold))
                .foregroundStyle(rankColor)
                .frame(width: 20)
            PersonaAvatar(persona: standing.persona, baseURL: baseURL, size: 32, tint: rankColor)
            VStack(alignment: .leading, spacing: 0) {
                Text(standing.persona.name)
                    .font(Theme.Font.heading)
                    .foregroundStyle(Theme.Color.textPrimary)
                    .lineLimit(1)
                Text(recordText)
                    .font(Theme.Font.caption)
                    .foregroundStyle(Theme.Color.textSecondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(Theme.Color.textSecondary.opacity(0.6))
        }
        .contentShape(Rectangle())
    }

    private var recordText: String {
        let total = standing.totalMatches
        let pct = total > 0 ? Int(round(Double(standing.wins) / Double(total) * 100)) : 0
        return "\(standing.wins)–\(standing.losses) · \(pct)% win rate"
    }

    private var rankColor: Color {
        switch rank {
        case 1: Color(red: 0.85, green: 0.65, blue: 0.13) // gold
        case 2: Color(red: 0.60, green: 0.60, blue: 0.62) // silver
        case 3: Color(red: 0.72, green: 0.45, blue: 0.20) // bronze
        default: Theme.Color.textSecondary
        }
    }
}

/// Filtered history view for a single persona — tapped from TopDebaterRow.
private struct PersonaDebatesView: View {
    let persona: Persona
    let debates: [Debate]
    let baseURL: URL

    private var wins: Int {
        debates.filter { d in
            guard let w = d.judgeDecision?.winner else { return false }
            return (w == "A" && d.personaAId == persona.id) || (w == "B" && d.personaBId == persona.id)
        }.count
    }
    private var losses: Int {
        debates.filter { d in
            guard let w = d.judgeDecision?.winner else { return false }
            return (w == "A" && d.personaBId == persona.id) || (w == "B" && d.personaAId == persona.id)
        }.count
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.Spacing.md) {
                header
                    .padding(.horizontal, Theme.Spacing.lg)
                VStack(spacing: Theme.Spacing.sm) {
                    ForEach(debates) { debate in
                        NavigationLink(value: debate) {
                            DebateRow(debate: debate, baseURL: baseURL)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, Theme.Spacing.lg)
            }
            .padding(.vertical, Theme.Spacing.lg)
        }
        .background(AmbientBackground())
        .navigationTitle(persona.name)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var header: some View {
        HStack(spacing: Theme.Spacing.md) {
            PersonaAvatar(persona: persona, baseURL: baseURL, size: 72, tint: Theme.Color.accent)
            VStack(alignment: .leading, spacing: 2) {
                Text(persona.name).font(Theme.Font.title).foregroundStyle(Theme.Color.textPrimary)
                Text(persona.tagline).font(Theme.Font.caption).foregroundStyle(Theme.Color.textSecondary).lineLimit(2)
                Text("\(wins)–\(losses) across \(debates.count) \(debates.count == 1 ? "match" : "matches")")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Theme.Color.textSecondary)
                    .padding(.top, 2)
            }
            Spacer()
        }
        .cardBackground()
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
