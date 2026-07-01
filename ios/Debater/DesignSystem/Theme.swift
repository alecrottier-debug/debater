import SwiftUI

/// Central design tokens. iOS 26 Liquid Glass aesthetic — the ambient
/// background lays down soft, saturated washes; cards and chrome ride on
/// top as `.glassEffect(...)` surfaces that refract whatever's underneath.
enum Theme {
    enum Color {
        // Parchment + ivory anchors. Kept warm so glass doesn't read sterile.
        static let background = SwiftUI.Color(red: 0.97, green: 0.95, blue: 0.92)
        static let surface = SwiftUI.Color(red: 1.00, green: 0.99, blue: 0.97)
        static let surfaceElevated = SwiftUI.Color.white
        static let textPrimary = SwiftUI.Color(red: 0.09, green: 0.12, blue: 0.18)
        static let textSecondary = SwiftUI.Color(red: 0.35, green: 0.38, blue: 0.44)
        static let accent = SwiftUI.Color(red: 0.13, green: 0.67, blue: 0.90)
        static let sideA = SwiftUI.Color(red: 0.16, green: 0.52, blue: 0.80) // For (debate)
        static let sideB = SwiftUI.Color(red: 0.82, green: 0.26, blue: 0.29) // Against (debate)
        // Discussion mode: neutral conversational tints — both guests are
        // peers, not opponents. Colors distinguish speakers without implying
        // opposition.
        static let guestA = SwiftUI.Color(red: 0.28, green: 0.40, blue: 0.60) // soft indigo
        static let guestB = SwiftUI.Color(red: 0.20, green: 0.50, blue: 0.48) // muted teal
        static let moderator = SwiftUI.Color(red: 0.55, green: 0.40, blue: 0.20)
        static let judge = SwiftUI.Color(red: 0.36, green: 0.20, blue: 0.52)
        static let divider = SwiftUI.Color.black.opacity(0.08)
        static let danger = SwiftUI.Color(red: 0.78, green: 0.22, blue: 0.22)
    }

    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
    }

    enum Radius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 20
        static let xl: CGFloat = 28
    }

    enum Font {
        static let display = SwiftUI.Font.system(.largeTitle, design: .serif, weight: .bold)
        static let title = SwiftUI.Font.system(.title2, design: .serif, weight: .semibold)
        static let heading = SwiftUI.Font.system(.headline, design: .default, weight: .semibold)
        static let body = SwiftUI.Font.system(.body, design: .default)
        static let serifBody = SwiftUI.Font.system(.body, design: .serif)
        static let caption = SwiftUI.Font.system(.caption, design: .default)
    }
}

// MARK: - Ambient background

/// Warm, painterly wash that gives Liquid Glass something to refract.
/// Multiple soft radial blobs layered over the parchment tone, mildly
/// animated so the glass surfaces feel alive without distracting.
struct AmbientBackground: View {
    @State private var drift: CGFloat = 0

    var body: some View {
        ZStack {
            Theme.Color.background
            GeometryReader { geo in
                let w = geo.size.width
                let h = geo.size.height
                blob(color: Theme.Color.accent.opacity(0.22), size: w * 0.95)
                    .position(x: w * (0.18 + 0.04 * drift), y: h * (0.12 + 0.03 * drift))
                blob(color: Theme.Color.judge.opacity(0.18), size: w * 1.05)
                    .position(x: w * (0.85 - 0.05 * drift), y: h * (0.30 - 0.02 * drift))
                blob(color: Theme.Color.sideA.opacity(0.18), size: w * 0.85)
                    .position(x: w * (0.10 - 0.03 * drift), y: h * (0.78 - 0.04 * drift))
                blob(color: Theme.Color.sideB.opacity(0.16), size: w * 0.80)
                    .position(x: w * (0.92 + 0.03 * drift), y: h * (0.88 + 0.03 * drift))
                blob(color: Theme.Color.moderator.opacity(0.14), size: w * 0.70)
                    .position(x: w * (0.55 + 0.06 * drift), y: h * (0.55 - 0.05 * drift))
            }
            .blur(radius: 60)
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 14).repeatForever(autoreverses: true)) {
                drift = 1
            }
        }
    }

    private func blob(color: Color, size: CGFloat) -> some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
    }
}

// MARK: - Glass surfaces

extension View {
    /// Liquid-glass card. Wraps content in padding, then a tinted glass
    /// material clipped to a rounded rectangle. Optional accent tint blends
    /// in subtly with the glass.
    func glassCard(
        padding: CGFloat = Theme.Spacing.lg,
        radius: CGFloat = Theme.Radius.lg,
        tint: Color? = nil
    ) -> some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        let glass: Glass = {
            if let tint { return .regular.tint(tint.opacity(0.18)) }
            return .regular
        }()
        return self
            .padding(padding)
            .background {
                shape.fill(Theme.Color.surface.opacity(0.55))
            }
            .glassEffect(glass, in: shape)
            .overlay {
                shape.stroke(.white.opacity(0.45), lineWidth: 0.5)
            }
            .shadow(color: .black.opacity(0.06), radius: 18, x: 0, y: 8)
    }

    /// Back-compat shim: legacy callers still using `cardBackground`. Routes
    /// to the new glass implementation so the old name keeps working.
    func cardBackground(padding: CGFloat = Theme.Spacing.lg) -> some View {
        glassCard(padding: padding)
    }

    /// Slim glass chip used for tags/labels (status pills, side labels).
    func glassChip(tint: Color = Theme.Color.accent) -> some View {
        self
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .glassEffect(.regular.tint(tint.opacity(0.22)), in: Capsule())
            .overlay { Capsule().stroke(.white.opacity(0.35), lineWidth: 0.5) }
    }
}
