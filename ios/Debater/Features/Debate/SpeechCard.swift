import SwiftUI

/// Renders a completed turn. Streaming equivalent uses StreamingSpeechCard.
struct SpeechCard: View {
    let turn: Turn
    let personaA: Persona
    let personaB: Persona

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            header
            if let narrative = turn.payload.narrative, !narrative.isEmpty {
                Text(narrative)
                    .font(Theme.Font.serifBody)
                    .foregroundStyle(Theme.Color.textPrimary)
            } else {
                Text(turn.renderedText)
                    .font(Theme.Font.serifBody)
                    .foregroundStyle(Theme.Color.textPrimary)
            }
            if let question = turn.payload.question, !question.isEmpty {
                Text("Q: \(question)")
                    .font(Theme.Font.caption)
                    .italic()
                    .foregroundStyle(Theme.Color.textSecondary)
                    .padding(.top, Theme.Spacing.xs)
            }
        }
        .cardBackground()
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2)
                .fill(tint)
                .frame(width: 4)
                .padding(.vertical, Theme.Spacing.sm)
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(Theme.Font.caption)
                .foregroundStyle(tint)
                .textCase(.uppercase)
            Spacer()
            Text("\(turn.wordCount) words")
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.textSecondary)
        }
    }

    private var tint: Color {
        switch turn.speaker {
        case .sideA: Theme.Color.sideA
        case .sideB: Theme.Color.sideB
        case .moderator: Theme.Color.moderator
        case .judge: Theme.Color.judge
        }
    }

    private var label: String {
        switch turn.speaker {
        case .sideA: "\(personaA.name) · \(turn.stageId.replacingOccurrences(of: "_", with: " "))"
        case .sideB: "\(personaB.name) · \(turn.stageId.replacingOccurrences(of: "_", with: " "))"
        case .moderator: "Moderator · \(turn.stageId.replacingOccurrences(of: "_", with: " "))"
        case .judge: "Judge"
        }
    }
}

struct StreamingSpeechCard: View {
    let stageLabel: String
    let speaker: Speaker?
    let text: String
    let personaA: Persona
    let personaB: Persona

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                Text(headerLabel)
                    .font(Theme.Font.caption)
                    .foregroundStyle(tint)
                    .textCase(.uppercase)
                Spacer()
                ProgressView().controlSize(.small)
            }
            Text(text.isEmpty ? "Thinking…" : text)
                .font(Theme.Font.serifBody)
                .foregroundStyle(Theme.Color.textPrimary)
                .animation(.default, value: text)
        }
        .cardBackground()
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2)
                .fill(tint)
                .frame(width: 4)
                .padding(.vertical, Theme.Spacing.sm)
        }
    }

    private var tint: Color {
        switch speaker {
        case .sideA: Theme.Color.sideA
        case .sideB: Theme.Color.sideB
        case .moderator: Theme.Color.moderator
        case .judge: Theme.Color.judge
        case nil: Theme.Color.accent
        }
    }

    private var headerLabel: String {
        switch speaker {
        case .sideA: "\(personaA.name) · \(stageLabel)"
        case .sideB: "\(personaB.name) · \(stageLabel)"
        case .moderator: "Moderator · \(stageLabel)"
        case .judge: "Judge"
        case nil: stageLabel
        }
    }
}
