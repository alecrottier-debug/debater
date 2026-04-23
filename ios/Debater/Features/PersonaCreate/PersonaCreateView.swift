import SwiftUI

struct PersonaCreateView: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.dismiss) private var dismiss
    @State private var subject = ""
    @State private var context = ""
    @State private var name = ""
    @State private var tagline = ""
    @State private var isWorking = false
    @State private var errorMessage: String?
    @State private var createdPersona: Persona?
    @State private var mode: Mode = .aiAssisted

    enum Mode: String, CaseIterable, Identifiable {
        case aiAssisted = "AI Assisted"
        case manual = "Manual"
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            // Form already dismisses the keyboard on scroll; the
            // .interactively variant lets users swipe it away.
            Form {
                Section {
                    Picker("Mode", selection: $mode) {
                        ForEach(Mode.allCases) { m in Text(m.rawValue).tag(m) }
                    }
                    .pickerStyle(.segmented)
                }

                switch mode {
                case .aiAssisted:
                    aiSection
                case .manual:
                    manualSection
                }

                if let error = errorMessage {
                    Section { Text(error).foregroundStyle(Theme.Color.danger) }
                }

                if let persona = createdPersona {
                    Section("Preview") {
                        Text(persona.name).font(Theme.Font.heading)
                        Text(persona.tagline).font(Theme.Font.caption).foregroundStyle(Theme.Color.textSecondary)
                    }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("New Persona")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) {
                    if isWorking {
                        ProgressView()
                    } else if createdPersona != nil {
                        Button("Done") { dismiss() }.fontWeight(.semibold)
                    } else {
                        Button(primaryLabel) { Task { await primaryAction() } }
                            .disabled(!canSubmit)
                            .fontWeight(.semibold)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var aiSection: some View {
        Section("Subject") {
            TextField("e.g. Milton Friedman", text: $subject)
            TextField("Optional context (e.g. Chicago School economist)", text: $context, axis: .vertical).lineLimit(2...4)
        }
        Section(footer: Text("We'll research the subject and synthesize a persona. This takes 20–60 seconds.")) {
            EmptyView()
        }
    }

    @ViewBuilder
    private var manualSection: some View {
        Section("Persona") {
            TextField("Name", text: $name)
            TextField("Tagline", text: $tagline, axis: .vertical).lineLimit(2...3)
        }
    }

    private var primaryLabel: String {
        switch mode {
        case .aiAssisted: "Research"
        case .manual: "Save"
        }
    }

    private var canSubmit: Bool {
        switch mode {
        case .aiAssisted: !subject.trimmingCharacters(in: .whitespaces).isEmpty
        case .manual: !name.trimmingCharacters(in: .whitespaces).isEmpty && !tagline.trimmingCharacters(in: .whitespaces).isEmpty
        }
    }

    private func primaryAction() async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }
        do {
            switch mode {
            case .aiAssisted:
                let result = try await env.api.researchAndSynthesize(
                    subject: subject,
                    context: context.isEmpty ? nil : context,
                    name: nil
                )
                createdPersona = result.persona
            case .manual:
                let persona = try await env.api.createPersona(
                    name: name,
                    tagline: tagline,
                    personaJson: .object([
                        "name": .string(name),
                        "tagline": .string(tagline),
                        "schemaVersion": .number(1)
                    ]),
                    isTemplate: false
                )
                createdPersona = persona
            }
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
