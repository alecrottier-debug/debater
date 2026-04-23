import SwiftUI

/// Circular persona avatar with initials fallback.
struct PersonaAvatar: View {
    let persona: Persona
    let baseURL: URL
    var size: CGFloat = 48
    var tint: Color = Theme.Color.accent

    var body: some View {
        Group {
            if let url = persona.avatarURL(resolvingAgainst: baseURL) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure:
                        initials
                    case .empty:
                        Color.clear.overlay(ProgressView().controlSize(.small))
                    @unknown default:
                        initials
                    }
                }
            } else {
                initials
            }
        }
        .frame(width: size, height: size)
        .background(tint.opacity(0.1))
        .clipShape(Circle())
        .overlay(Circle().stroke(tint.opacity(0.25), lineWidth: 1))
    }

    private var initials: some View {
        Text(String(persona.name.prefix(1)))
            .font(.system(size: size * 0.45, weight: .semibold, design: .serif))
            .foregroundStyle(tint)
    }
}
