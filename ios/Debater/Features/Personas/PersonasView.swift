import SwiftUI

struct PersonasView: View {
    @Environment(AppEnvironment.self) private var env
    @State private var personas: [Persona] = []
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showCreate = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && personas.isEmpty {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let errorMessage {
                    ContentUnavailableView("Couldn't load personas", systemImage: "wifi.slash", description: Text(errorMessage))
                } else {
                    grid
                }
            }
            .background(Theme.Color.background.ignoresSafeArea())
            .navigationTitle("Personas")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showCreate = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showCreate, onDismiss: { Task { await load() } }) {
                PersonaCreateView()
            }
        }
        .task { await load() }
    }

    private var grid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Theme.Spacing.md) {
                ForEach(personas) { persona in
                    NavigationLink(value: persona) {
                        PersonaCard(persona: persona, baseURL: env.api.baseURL)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(Theme.Spacing.lg)
        }
        .refreshable { await load() }
        .navigationDestination(for: Persona.self) { persona in
            PersonaDetailView(persona: persona, baseURL: env.api.baseURL)
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            personas = try await env.api.fetchPersonas()
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

private struct PersonaCard: View {
    let persona: Persona
    let baseURL: URL

    var body: some View {
        VStack(alignment: .center, spacing: Theme.Spacing.sm) {
            PersonaAvatar(persona: persona, baseURL: baseURL, size: 110, tint: Theme.Color.accent)
                .padding(.top, Theme.Spacing.xs)
            Text(persona.name).font(Theme.Font.heading).foregroundStyle(Theme.Color.textPrimary).lineLimit(1)
            Text(persona.tagline)
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.textSecondary)
                .multilineTextAlignment(.center)
                .lineLimit(3)
        }
        .frame(maxWidth: .infinity)
        .cardBackground(padding: Theme.Spacing.md)
    }
}
