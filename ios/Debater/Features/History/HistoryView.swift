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

    var body: some View {
        VStack(spacing: 0) {
            Picker("Filter", selection: $viewModel.filter) {
                ForEach(HistoryViewModel.Filter.allCases) { f in
                    Text(f.title).tag(f)
                }
            }
            .pickerStyle(.segmented)
            .padding(Theme.Spacing.lg)

            if viewModel.isLoading && viewModel.debates.isEmpty {
                Spacer(); ProgressView(); Spacer()
            } else if let err = viewModel.errorMessage {
                ContentUnavailableView("Couldn't load history", systemImage: "wifi.slash", description: Text(err))
            } else if viewModel.filtered.isEmpty {
                ContentUnavailableView("No debates yet", systemImage: "tray", description: Text("Start a new debate from the Home tab."))
            } else {
                List(viewModel.filtered) { debate in
                    NavigationLink(value: debate) {
                        DebateRow(debate: debate)
                    }
                }
                .listStyle(.plain)
                .refreshable { await viewModel.load() }
            }
        }
        .navigationDestination(for: Debate.self) { debate in
            DebateView(debate: debate)
        }
    }
}

private struct DebateRow: View {
    let debate: Debate

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            HStack {
                Text(debate.mode == "discussion" ? "Discussion" : "Debate")
                    .font(Theme.Font.caption)
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(Theme.Color.accent.opacity(0.15))
                    .clipShape(Capsule())
                Spacer()
                Text(debate.status.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(Theme.Font.caption)
                    .foregroundStyle(Theme.Color.textSecondary)
            }
            Text(debate.motion)
                .font(Theme.Font.heading)
                .foregroundStyle(Theme.Color.textPrimary)
                .lineLimit(2)
            Text("\(debate.personaA.name) vs \(debate.personaB.name)")
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.textSecondary)
        }
        .padding(.vertical, 4)
    }
}
