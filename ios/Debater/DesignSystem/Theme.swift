import SwiftUI

/// Central design tokens. Mirrors the web app's Tailwind palette loosely —
/// parchment/ivory backgrounds, deep navy text, sparing accent.
enum Theme {
    enum Color {
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
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
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

extension View {
    func cardBackground(padding: CGFloat = Theme.Spacing.lg) -> some View {
        self
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous)
                    .fill(Theme.Color.surface)
                    .shadow(color: .black.opacity(0.04), radius: 12, x: 0, y: 4)
            )
    }
}
