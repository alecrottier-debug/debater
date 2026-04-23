import SwiftUI

/// Visualizes JudgeDecision.momentum — trajectory is a string like
/// "steady-A", "shifting-toward-B", "swinging", "tied". We map each to a
/// position on a bipolar axis and animate a pointer between them.
struct MomentumMeter: View {
    let momentum: Momentum
    let personaA: Persona
    let personaB: Persona

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                Text("Momentum").font(Theme.Font.heading)
                Spacer()
                Text(trajectoryLabel)
                    .font(Theme.Font.caption)
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(trajectoryTint.opacity(0.15))
                    .foregroundStyle(trajectoryTint)
                    .clipShape(Capsule())
            }

            GeometryReader { geo in
                let pos = CGFloat(normalizedPosition)
                let x = geo.size.width * pos
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [Theme.Color.sideA, Theme.Color.accent.opacity(0.2), Theme.Color.sideB],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(height: 10)
                    Circle()
                        .fill(.white)
                        .overlay(Circle().stroke(Theme.Color.textPrimary.opacity(0.25), lineWidth: 1))
                        .frame(width: 18, height: 18)
                        .shadow(color: .black.opacity(0.15), radius: 3, y: 1)
                        .offset(x: x - 9)
                        .animation(.spring(response: 0.5, dampingFraction: 0.75), value: pos)
                }
            }
            .frame(height: 20)

            HStack {
                Text(personaA.name).font(Theme.Font.caption).foregroundStyle(Theme.Color.sideA)
                Spacer()
                Text(personaB.name).font(Theme.Font.caption).foregroundStyle(Theme.Color.sideB)
            }

            if !momentum.description.isEmpty {
                Text(momentum.description)
                    .font(Theme.Font.body)
                    .foregroundStyle(Theme.Color.textPrimary)
                    .padding(.top, Theme.Spacing.xs)
            }
        }
        .cardBackground()
    }

    /// 0.0 → fully A, 1.0 → fully B, 0.5 → centered.
    /// The judge's trajectory strings aren't formally enumerated in the
    /// schema, so we string-match heuristically.
    private var normalizedPosition: Double {
        let t = momentum.trajectory.lowercased()
        if t.contains("tied") || t.contains("even") { return 0.5 }
        if t.contains("swing") { return 0.5 } // oscillating — center pointer
        let leansA = t.contains("a") && (t.contains("toward-a") || t.contains("steady-a") || t.contains("-a"))
        let leansB = t.contains("b") && (t.contains("toward-b") || t.contains("steady-b") || t.contains("-b"))
        let strength: Double = t.contains("steady") ? 0.85 : t.contains("shift") ? 0.7 : 0.65
        if leansA && !leansB { return 0.5 - (strength - 0.5) }
        if leansB && !leansA { return 0.5 + (strength - 0.5) }
        return 0.5
    }

    private var trajectoryTint: Color {
        if normalizedPosition < 0.45 { return Theme.Color.sideA }
        if normalizedPosition > 0.55 { return Theme.Color.sideB }
        return Theme.Color.accent
    }

    private var trajectoryLabel: String {
        momentum.trajectory
            .replacingOccurrences(of: "-", with: " ")
            .replacingOccurrences(of: "_", with: " ")
            .capitalized
    }
}
