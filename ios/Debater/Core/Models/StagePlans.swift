import Foundation

/// Mirrors frontend/src/lib/api.ts QUICK_STAGES / DISCUSSION_STAGES. Used
/// client-side to render the "Stage N of M" label and infer total progress.
enum StagePlans {
    static let quick: [StageConfig] = [
        .init(id: "MOD_SETUP", label: "Moderator Setup", speaker: .moderator, maxWords: 110, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "A_OPEN", label: "For Opening", speaker: .sideA, maxWords: 130, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "B_OPEN", label: "Against Opening", speaker: .sideB, maxWords: 130, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "A_CHALLENGE", label: "For Challenge", speaker: .sideA, maxWords: 100, bullets: nil, questionRequired: true, questionCount: 1),
        .init(id: "B_COUNTER", label: "Against Counter", speaker: .sideB, maxWords: 110, bullets: nil, questionRequired: true, questionCount: 1),
        .init(id: "A_COUNTER", label: "For Counter", speaker: .sideA, maxWords: 110, bullets: nil, questionRequired: true, questionCount: 1),
        .init(id: "B_CLOSE", label: "Against Closing", speaker: .sideB, maxWords: 85, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "A_CLOSE", label: "For Closing", speaker: .sideA, maxWords: 85, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "JUDGE", label: "Judge Decision", speaker: .judge, maxWords: nil, bullets: nil, questionRequired: false, questionCount: 0),
    ]

    static let discussion: [StageConfig] = [
        .init(id: "MOD_INTRO", label: "Moderator Introduction", speaker: .moderator, maxWords: 130, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "MOD_Q1", label: "Opening Question", speaker: .moderator, maxWords: 60, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "A_RESPOND_1", label: "Guest A Response 1", speaker: .sideA, maxWords: 150, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "B_RESPOND_1", label: "Guest B Response 1", speaker: .sideB, maxWords: 150, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "MOD_Q2", label: "Follow-up Question", speaker: .moderator, maxWords: 70, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "B_RESPOND_2", label: "Guest B Response 2", speaker: .sideB, maxWords: 150, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "A_RESPOND_2", label: "Guest A Response 2", speaker: .sideA, maxWords: 150, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "MOD_SYNTHESIS", label: "Moderator Synthesis", speaker: .moderator, maxWords: 80, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "A_FINAL", label: "Guest A Final Thought", speaker: .sideA, maxWords: 100, bullets: nil, questionRequired: false, questionCount: 0),
        .init(id: "MOD_WRAP", label: "Moderator Wrap-up", speaker: .moderator, maxWords: 150, bullets: nil, questionRequired: false, questionCount: 0),
    ]

    static func stages(forMode mode: String) -> [StageConfig] {
        mode == "discussion" ? discussion : quick
    }
}

extension Speaker {
    var displayLabel: String {
        switch self {
        case .moderator: "Moderator"
        case .sideA: "For"
        case .sideB: "Against"
        case .judge: "Judge"
        }
    }
}
