import SwiftUI

struct DebateView: View {
    let debate: Debate
    @Environment(AppEnvironment.self) private var env
    @State private var viewModel: DebateViewModel?

    var body: some View {
        Group {
            if let viewModel {
                DebateContent(viewModel: viewModel)
            } else {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Theme.Color.background.ignoresSafeArea())
        .navigationTitle(debate.mode == "discussion" ? "Discussion" : "Debate")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if viewModel == nil {
                viewModel = DebateViewModel(debate: debate, api: env.api, sse: env.sse)
            }
        }
    }
}

private struct DebateContent: View {
    @Bindable var viewModel: DebateViewModel
    @Environment(AppEnvironment.self) private var env

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            if viewModel.isComplete, let decision = viewModel.debate.judgeDecision {
                ResultsView(debate: viewModel.debate, decision: decision)
            } else {
                liveArea
            }
        }
        .sheet(isPresented: $viewModel.showTranscript) {
            TranscriptSheet(debate: viewModel.debate)
                .presentationDetents([.medium, .large])
        }
        .sheet(item: Binding(
            get: { viewModel.exportedMarkdown.map { ExportPayload(markdown: $0) } },
            set: { if $0 == nil { viewModel.exportedMarkdown = nil } }
        )) { payload in
            ShareSheet(items: [payload.markdown])
        }
        .navigationDestination(item: $viewModel.rematchDebate) { rematch in
            DebateView(debate: rematch)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { viewModel.showTranscript = true } label: {
                        Label("Transcript", systemImage: "text.alignleft")
                    }
                    Button { Task { await viewModel.exportMarkdown() } } label: {
                        Label("Export markdown", systemImage: "square.and.arrow.up")
                    }
                    if viewModel.isComplete {
                        Button { Task { await viewModel.rematch() } } label: {
                            Label("Rematch", systemImage: "arrow.triangle.2.circlepath")
                        }
                    }
                } label: {
                    if viewModel.isRematching {
                        ProgressView()
                    } else {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
    }

    private var header: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Text(viewModel.debate.motion)
                .font(Theme.Font.title)
                .foregroundStyle(Theme.Color.textPrimary)
                .multilineTextAlignment(.center)
            HStack(spacing: Theme.Spacing.md) {
                SideChip(persona: viewModel.debate.personaA, tint: Theme.Color.sideA, label: "For")
                Text("vs").font(Theme.Font.caption).foregroundStyle(Theme.Color.textSecondary)
                SideChip(persona: viewModel.debate.personaB, tint: Theme.Color.sideB, label: "Against")
            }
        }
        .padding(Theme.Spacing.lg)
        .frame(maxWidth: .infinity)
        .background(Theme.Color.surface)
    }

    private var liveArea: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                    ForEach(viewModel.debate.turns ?? []) { turn in
                        SpeechCard(turn: turn, personaA: viewModel.debate.personaA, personaB: viewModel.debate.personaB, baseURL: env.api.baseURL)
                            .id(turn.id)
                    }

                    if viewModel.isStreaming {
                        StreamingSpeechCard(
                            stageId: viewModel.streamingStageId ?? "",
                            speaker: viewModel.streamingSpeaker,
                            text: viewModel.streamingText,
                            personaA: viewModel.debate.personaA,
                            personaB: viewModel.debate.personaB,
                            baseURL: env.api.baseURL
                        )
                        .id("streaming")
                    }

                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(Theme.Font.caption)
                            .foregroundStyle(Theme.Color.danger)
                            .padding(Theme.Spacing.md)
                    }

                    advanceButton
                        .padding(.top, Theme.Spacing.md)
                }
                .padding(Theme.Spacing.lg)
            }
            .onChange(of: viewModel.streamingText) { _, _ in
                if viewModel.isStreaming {
                    withAnimation(.easeOut(duration: 0.15)) {
                        proxy.scrollTo("streaming", anchor: .bottom)
                    }
                }
            }
            .onChange(of: viewModel.debate.turns?.count ?? 0) { _, _ in
                if let last = viewModel.debate.turns?.last {
                    withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }
        }
    }

    @ViewBuilder
    private var advanceButton: some View {
        let stages = viewModel.stages
        let nextLabel: String = {
            let idx = viewModel.currentStageIndex
            if idx >= stages.count { return "Complete" }
            return "Play: \(stages[idx].label)"
        }()

        Button {
            viewModel.advance()
        } label: {
            HStack {
                if viewModel.isStreaming {
                    ProgressView().tint(.white)
                    Text("Streaming…")
                } else {
                    Image(systemName: "play.fill")
                    Text(nextLabel)
                }
            }
            .fontWeight(.semibold)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(!viewModel.canAdvance)
    }
}

private struct SideChip: View {
    let persona: Persona
    let tint: Color
    let label: String
    @Environment(AppEnvironment.self) private var env

    var body: some View {
        VStack(spacing: 4) {
            PersonaAvatar(persona: persona, baseURL: env.api.baseURL, size: 48, tint: tint)
            Text(label).font(Theme.Font.caption).foregroundStyle(tint)
            Text(persona.name).font(Theme.Font.heading).foregroundStyle(Theme.Color.textPrimary).lineLimit(1)
        }
    }
}

private struct ExportPayload: Identifiable {
    let id = UUID()
    let markdown: String
}
