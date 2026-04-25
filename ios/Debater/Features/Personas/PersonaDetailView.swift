import SwiftUI

struct PersonaDetailView: View {
    let persona: Persona
    let baseURL: URL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                hero

                if let summary = persona.biographySummary {
                    sectionCard(
                        title: "Background",
                        icon: "book.closed",
                        tint: Theme.Color.textPrimary
                    ) {
                        paragraph(summary)
                        if let formative = persona.formativeEnvironments {
                            subsection("Formative environments", text: formative)
                        }
                        if let incentives = persona.incentiveStructures {
                            subsection("Incentive structures", text: incentives)
                        }
                    }
                }

                if !persona.priorities.isEmpty || !persona.principles.isEmpty || !persona.knownStances.isEmpty {
                    sectionCard(title: "Positions", icon: "scope", tint: Theme.Color.sideA) {
                        if !persona.priorities.isEmpty {
                            bulletList(title: "Priorities", items: persona.priorities)
                        }
                        if !persona.principles.isEmpty {
                            bulletList(title: "Principles", items: persona.principles)
                        }
                        if !persona.knownStances.isEmpty {
                            Text("Known stances")
                                .font(Theme.Font.caption)
                                .foregroundStyle(Theme.Color.textSecondary)
                                .textCase(.uppercase)
                                .padding(.top, Theme.Spacing.xs)
                            ForEach(persona.knownStances, id: \.topic) { pair in
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(pair.topic)
                                        .font(Theme.Font.caption)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(Theme.Color.sideA)
                                    Text(pair.stance)
                                        .font(Theme.Font.body)
                                        .foregroundStyle(Theme.Color.textPrimary)
                                }
                                .padding(.vertical, 2)
                            }
                        }
                    }
                }

                if persona.rhetoricStyle != nil || !persona.signaturePhrases.isEmpty || !persona.rhetoricalMoves.isEmpty {
                    sectionCard(title: "Rhetorical style", icon: "waveform", tint: Theme.Color.moderator) {
                        if let style = persona.rhetoricStyle {
                            subsection("Style", text: style)
                        }
                        if let tone = persona.rhetoricTone {
                            subsection("Tone", text: tone)
                        }
                        if !persona.signaturePhrases.isEmpty {
                            bulletList(title: "Signature phrases", items: persona.signaturePhrases, italic: true)
                        }
                        if !persona.rhetoricalMoves.isEmpty {
                            bulletList(title: "Rhetorical moves", items: persona.rhetoricalMoves)
                        }
                    }
                }

                if !persona.realQuotes.isEmpty {
                    sectionCard(title: "Documented quotes", icon: "quote.bubble", tint: Theme.Color.guestA) {
                        ForEach(persona.realQuotes, id: \.self) { quote in
                            HStack(alignment: .top, spacing: Theme.Spacing.sm) {
                                Text("\u{201C}")
                                    .font(.system(size: 32, design: .serif))
                                    .foregroundStyle(Theme.Color.guestA.opacity(0.4))
                                    .padding(.top, -8)
                                Text(quote)
                                    .font(Theme.Font.serifBody)
                                    .italic()
                                    .foregroundStyle(Theme.Color.textPrimary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .padding(.vertical, 2)
                        }
                    }
                }

                if !persona.trackRecord.isEmpty || !persona.mindChanges.isEmpty {
                    sectionCard(title: "Epistemology", icon: "brain", tint: Theme.Color.judge) {
                        if !persona.trackRecord.isEmpty {
                            bulletList(title: "Track record", items: persona.trackRecord)
                        }
                        if !persona.mindChanges.isEmpty {
                            bulletList(title: "Where they've changed their mind", items: persona.mindChanges)
                        }
                    }
                }

                if !persona.blindSpots.isEmpty || !persona.hedgingTopics.isEmpty {
                    sectionCard(title: "Weaknesses", icon: "exclamationmark.triangle", tint: Theme.Color.danger) {
                        if !persona.blindSpots.isEmpty {
                            bulletList(title: "Blind spots", items: persona.blindSpots)
                        }
                        if !persona.hedgingTopics.isEmpty {
                            bulletList(title: "Hedging topics", items: persona.hedgingTopics)
                        }
                    }
                }
            }
            .padding(Theme.Spacing.lg)
        }
        .background(Theme.Color.background.ignoresSafeArea())
        .navigationTitle(persona.name)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Hero

    private var hero: some View {
        VStack(spacing: Theme.Spacing.md) {
            PersonaAvatar(persona: persona, baseURL: baseURL, size: 140, tint: Theme.Color.accent)
                .overlay(alignment: .bottomTrailing) {
                    AIBadge()
                        .offset(x: 6, y: 6)
                }
            Text(persona.name)
                .font(.system(.largeTitle, design: .serif, weight: .bold))
                .foregroundStyle(Theme.Color.textPrimary)
                .multilineTextAlignment(.center)
            Text(persona.tagline)
                .font(Theme.Font.serifBody)
                .italic()
                .foregroundStyle(Theme.Color.textSecondary)
                .multilineTextAlignment(.center)
            Text("AI portrayal of \(persona.isRealPerson ? "a real public figure" : "a fictional persona"). Not real statements. Not endorsed by or affiliated with any person depicted.")
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Theme.Spacing.md)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Building blocks

    private func sectionCard<Content: View>(
        title: String,
        icon: String,
        tint: Color,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack(spacing: 6) {
                Image(systemName: icon).foregroundStyle(tint).font(.callout)
                Text(title)
                    .font(Theme.Font.heading)
                    .foregroundStyle(Theme.Color.textPrimary)
            }
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardBackground()
    }

    private func paragraph(_ text: String) -> some View {
        Text(text)
            .font(Theme.Font.serifBody)
            .foregroundStyle(Theme.Color.textPrimary)
            .fixedSize(horizontal: false, vertical: true)
    }

    private func subsection(_ title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.textSecondary)
                .textCase(.uppercase)
            Text(text)
                .font(Theme.Font.body)
                .foregroundStyle(Theme.Color.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.top, Theme.Spacing.xs)
    }

    private func bulletList(title: String, items: [String], italic: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.textSecondary)
                .textCase(.uppercase)
            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: Theme.Spacing.sm) {
                    Circle().fill(Theme.Color.textSecondary.opacity(0.4))
                        .frame(width: 4, height: 4)
                        .padding(.top, 8)
                    Group {
                        if italic {
                            Text("\u{201C}\(item)\u{201D}").italic()
                        } else {
                            Text(item)
                        }
                    }
                    .font(Theme.Font.body)
                    .foregroundStyle(Theme.Color.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .padding(.top, Theme.Spacing.xs)
    }
}

/// Badge shown on the persona detail hero (and reusable elsewhere). Signals
/// AI-generated portrayal without mangling the name.
struct AIBadge: View {
    var body: some View {
        Text("AI")
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule().fill(LinearGradient(
                    colors: [Theme.Color.accent, Theme.Color.judge],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
            )
            .overlay(
                Capsule().stroke(.white, lineWidth: 1.5)
            )
    }
}
