import SwiftUI

/// Renders a completed turn. Streaming equivalent uses StreamingSpeechCard.
struct SpeechCard: View {
    let turn: Turn
    let personaA: Persona
    let personaB: Persona
    let baseURL: URL

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            header
            if let narrative = turn.payload.narrative, !narrative.isEmpty {
                Text(StageReferenceHumanizer.humanize(narrative, personaA: personaA, personaB: personaB))
                    .font(Theme.Font.serifBody)
                    .foregroundStyle(Theme.Color.textPrimary)
            } else {
                Text(StageReferenceHumanizer.humanize(turn.renderedText, personaA: personaA, personaB: personaB))
                    .font(Theme.Font.serifBody)
                    .foregroundStyle(Theme.Color.textPrimary)
            }
            if let question = turn.payload.question, !question.isEmpty {
                Text("Q: \(StageReferenceHumanizer.humanize(question, personaA: personaA, personaB: personaB))")
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
        HStack(alignment: .center, spacing: Theme.Spacing.sm) {
            speakerAvatar
            VStack(alignment: .leading, spacing: 0) {
                Text(speakerName)
                    .font(.system(.subheadline, design: .default, weight: .semibold))
                    .foregroundStyle(tint)
                Text(StageDisplay.shortLabel(for: turn.stageId))
                    .font(Theme.Font.caption)
                    .foregroundStyle(Theme.Color.textSecondary)
            }
            Spacer()
            Text("\(turn.wordCount)w")
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.textSecondary.opacity(0.7))
        }
    }

    @ViewBuilder
    private var speakerAvatar: some View {
        switch turn.speaker {
        case .sideA:
            PersonaAvatar(persona: personaA, baseURL: baseURL, size: 28, tint: Theme.Color.sideA)
        case .sideB:
            PersonaAvatar(persona: personaB, baseURL: baseURL, size: 28, tint: Theme.Color.sideB)
        case .moderator:
            systemIconAvatar(systemName: "person.fill.checkmark")
        case .judge:
            systemIconAvatar(systemName: "scalemass.fill")
        }
    }

    private func systemIconAvatar(systemName: String) -> some View {
        Circle()
            .fill(tint.opacity(0.15))
            .frame(width: 28, height: 28)
            .overlay(Image(systemName: systemName).font(.system(size: 13)).foregroundStyle(tint))
    }

    private var tint: Color {
        switch turn.speaker {
        case .sideA: Theme.Color.sideA
        case .sideB: Theme.Color.sideB
        case .moderator: Theme.Color.moderator
        case .judge: Theme.Color.judge
        }
    }

    private var speakerName: String {
        switch turn.speaker {
        case .sideA: personaA.name
        case .sideB: personaB.name
        case .moderator: "Moderator"
        case .judge: "Judge"
        }
    }
}

struct StreamingSpeechCard: View {
    let stageId: String
    let speaker: Speaker?
    let text: String
    let personaA: Persona
    let personaB: Persona
    let baseURL: URL

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack(alignment: .center, spacing: Theme.Spacing.sm) {
                speakerAvatar
                VStack(alignment: .leading, spacing: 0) {
                    Text(speakerName)
                        .font(.system(.subheadline, design: .default, weight: .semibold))
                        .foregroundStyle(tint)
                    if !stageId.isEmpty {
                        Text(StageDisplay.shortLabel(for: stageId))
                            .font(Theme.Font.caption)
                            .foregroundStyle(Theme.Color.textSecondary)
                    }
                }
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

    private var speakerName: String {
        switch speaker {
        case .sideA: personaA.name
        case .sideB: personaB.name
        case .moderator: "Moderator"
        case .judge: "Judge"
        case nil: "Generating…"
        }
    }

    @ViewBuilder
    private var speakerAvatar: some View {
        switch speaker {
        case .sideA:
            PersonaAvatar(persona: personaA, baseURL: baseURL, size: 28, tint: Theme.Color.sideA)
        case .sideB:
            PersonaAvatar(persona: personaB, baseURL: baseURL, size: 28, tint: Theme.Color.sideB)
        case .moderator:
            Circle().fill(tint.opacity(0.15)).frame(width: 28, height: 28)
                .overlay(Image(systemName: "person.fill.checkmark").font(.system(size: 13)).foregroundStyle(tint))
        case .judge:
            Circle().fill(tint.opacity(0.15)).frame(width: 28, height: 28)
                .overlay(Image(systemName: "scalemass.fill").font(.system(size: 13)).foregroundStyle(tint))
        case nil:
            Circle().fill(Theme.Color.accent.opacity(0.15)).frame(width: 28, height: 28)
                .overlay(ProgressView().controlSize(.mini))
        }
    }
}
