import SwiftUI

struct HomeView: View {
    @Environment(AppEnvironment.self) private var env
    @State private var viewModel: HomeViewModel?

    var body: some View {
        NavigationStack {
            Group {
                if let viewModel {
                    HomeContent(viewModel: viewModel)
                } else {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .background(Theme.Color.background.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
        .task {
            if viewModel == nil {
                viewModel = HomeViewModel(api: env.api)
                await viewModel?.load()
            }
        }
    }
}

@Observable
@MainActor
final class HomeViewModel {
    enum State {
        case loading
        case ready(personas: [Persona])
        case error(String)
    }

    var state: State = .loading
    var motion: String = ""
    var mode: String = "quick"
    var personaAId: String?
    var personaBId: String?
    var confrontation: Double = 3
    var isStarting = false
    var startedDebate: Debate?

    private let api: APIClient

    init(api: APIClient) { self.api = api }

    func load() async {
        state = .loading
        do {
            let all = try await api.fetchPersonas()
            state = .ready(personas: all)
        } catch {
            state = .error((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)
        }
    }

    func startDebate() async {
        guard let a = personaAId, let b = personaBId,
              !motion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else { return }
        isStarting = true
        defer { isStarting = false }
        do {
            let debate = try await api.createDebate(
                motion: motion,
                mode: mode,
                personaAId: a,
                personaBId: b,
                moderatorPersonaId: nil,
                confrontationLevel: Int(confrontation)
            )
            startedDebate = debate
        } catch {
            state = .error((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)
        }
    }
}

private struct HomeContent: View {
    @Bindable var viewModel: HomeViewModel

    var body: some View {
        switch viewModel.state {
        case .loading:
            ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
        case .error(let message):
            ContentUnavailableView("Couldn't load", systemImage: "exclamationmark.triangle", description: Text(message))
        case .ready(let personas):
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.xl) {
                    heroSection
                    motionSection
                    modeSection
                    personaSection(personas: personas)
                    confrontationSection
                    startButton
                }
                .padding(Theme.Spacing.lg)
                .dismissKeyboardOnTap()
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationDestination(item: $viewModel.startedDebate) { debate in
                DebateView(debate: debate)
            }
        }
    }

    private var heroSection: some View {
        Image("DebatersHero")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(maxWidth: .infinity)
            .overlay(alignment: .top) {
                Text("AI Debate Simulator")
                    .font(.system(size: 20, weight: .bold, design: .serif))
                    .foregroundStyle(Theme.Color.textPrimary)
                    .padding(.horizontal, Theme.Spacing.lg)
                    .padding(.vertical, Theme.Spacing.sm)
                    .background(
                        Capsule()
                            .fill(.white)
                            .shadow(color: .black.opacity(0.12), radius: 8, y: 2)
                    )
                    .padding(.top, Theme.Spacing.md)
            }
            .overlay(alignment: .bottom) {
                Text("Pick a motion, choose two voices, and watch the arguments unfold.")
                    .font(Theme.Font.serifBody)
                    .italic()
                    .foregroundStyle(Theme.Color.textPrimary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.vertical, Theme.Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                            .fill(.white.opacity(0.92))
                            .shadow(color: .black.opacity(0.1), radius: 6, y: 2)
                    )
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.bottom, Theme.Spacing.md)
            }
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
    }

    private var motionSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Motion").font(Theme.Font.heading)
            TextField("e.g. Universal basic income is necessary", text: $viewModel.motion, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(2...4)
        }
    }

    private var modeSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Format").font(Theme.Font.heading)
            Picker("Format", selection: $viewModel.mode) {
                Text("Debate").tag("quick")
                Text("Discussion").tag("discussion")
            }
            .pickerStyle(.segmented)
        }
    }

    private func personaSection(personas: [Persona]) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Participants").font(Theme.Font.heading)
            HStack(spacing: Theme.Spacing.md) {
                PersonaSlot(title: "For", selectedId: $viewModel.personaAId, personas: personas, tint: Theme.Color.sideA)
                PersonaSlot(title: "Against", selectedId: $viewModel.personaBId, personas: personas, tint: Theme.Color.sideB)
            }
        }
    }

    private var confrontationSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                Text("Confrontation").font(Theme.Font.heading)
                Spacer()
                Text("\(Int(viewModel.confrontation))")
                    .foregroundStyle(Theme.Color.textSecondary)
            }
            Slider(value: $viewModel.confrontation, in: 1...5, step: 1)
        }
    }

    private var startButton: some View {
        Button {
            Task { await viewModel.startDebate() }
        } label: {
            if viewModel.isStarting {
                ProgressView().frame(maxWidth: .infinity).padding(.vertical, 4)
            } else {
                Text("Start debate").fontWeight(.semibold).frame(maxWidth: .infinity)
            }
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(viewModel.personaAId == nil || viewModel.personaBId == nil || viewModel.motion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isStarting)
    }
}

private struct PersonaSlot: View {
    let title: String
    @Binding var selectedId: String?
    let personas: [Persona]
    let tint: Color
    @State private var isPickerPresented = false

    var body: some View {
        let selected = personas.first(where: { $0.id == selectedId })
        Button {
            isPickerPresented = true
        } label: {
            VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                Text(title).font(Theme.Font.caption).foregroundStyle(tint)
                Text(selected?.name ?? "Choose persona")
                    .font(Theme.Font.heading)
                    .foregroundStyle(Theme.Color.textPrimary)
                    .lineLimit(1)
                if let tagline = selected?.tagline {
                    Text(tagline)
                        .font(Theme.Font.caption)
                        .foregroundStyle(Theme.Color.textSecondary)
                        .lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .cardBackground(padding: Theme.Spacing.md)
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $isPickerPresented) {
            PersonaPickerSheet(personas: personas, selectedId: $selectedId)
        }
    }
}

private struct PersonaPickerSheet: View {
    let personas: [Persona]
    @Binding var selectedId: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(personas) { persona in
                Button {
                    selectedId = persona.id
                    dismiss()
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(persona.name).font(Theme.Font.heading).foregroundStyle(Theme.Color.textPrimary)
                        Text(persona.tagline).font(Theme.Font.caption).foregroundStyle(Theme.Color.textSecondary)
                    }
                }
            }
            .navigationTitle("Pick persona")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close") { dismiss() } } }
        }
    }
}
