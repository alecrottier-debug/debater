import Foundation
import Observation

@Observable
@MainActor
final class DebateViewModel {
    var debate: Debate
    var isStreaming = false
    var streamingStageLabel: String?
    var streamingSpeaker: Speaker?
    var streamingText: String = ""
    var errorMessage: String?
    var showTranscript = false
    var exportedMarkdown: String?
    var rematchDebate: Debate?
    var isRematching = false

    private let api: APIClient
    private let sse: SSEClient
    private var streamTask: Task<Void, Never>?

    init(debate: Debate, api: APIClient, sse: SSEClient) {
        self.debate = debate
        self.api = api
        self.sse = sse
    }

    // Note: explicit cancel via cancel() — Task is lightweight and will be
    // cleaned up when this instance deallocs. Avoid touching @MainActor state
    // from a nonisolated deinit.

    var stages: [StageConfig] { StagePlans.stages(forMode: debate.mode) }

    var currentStageIndex: Int { debate.stageIndex }

    var isComplete: Bool { debate.status == .completed }

    var canAdvance: Bool {
        debate.status != .completed && debate.status != .error && !isStreaming
    }

    func advance() {
        guard canAdvance else { return }
        streamTask?.cancel()
        isStreaming = true
        streamingText = ""
        streamingSpeaker = nil
        streamingStageLabel = nil
        errorMessage = nil

        streamTask = Task { [weak self, debateId = debate.id] in
            guard let self else { return }
            let stream = self.sse.streamNextTurn(debateId: debateId)
            do {
                for try await event in stream {
                    if Task.isCancelled { break }
                    switch event {
                    case let .stage(_, speaker, label):
                        self.streamingSpeaker = Speaker(rawValue: speaker)
                        self.streamingStageLabel = label
                    case let .narrative(text):
                        self.streamingText = text
                    case let .done(debate):
                        self.debate = debate
                        self.isStreaming = false
                        self.streamingText = ""
                        self.streamingSpeaker = nil
                        self.streamingStageLabel = nil
                    case let .error(message):
                        self.errorMessage = message
                        self.isStreaming = false
                    }
                }
            } catch {
                self.errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                self.isStreaming = false
            }
        }
    }

    func cancel() {
        streamTask?.cancel()
        isStreaming = false
    }

    func refresh() async {
        do {
            debate = try await api.fetchDebate(id: debate.id)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func rematch() async {
        isRematching = true
        defer { isRematching = false }
        do {
            rematchDebate = try await api.rematch(debateId: debate.id)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func exportMarkdown() async {
        do {
            exportedMarkdown = try await api.exportDebate(id: debate.id)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
