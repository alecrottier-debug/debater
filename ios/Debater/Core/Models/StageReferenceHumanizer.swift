import Foundation

/// Replaces any raw stage codes (A_OPEN, B_CHALLENGE, MOD_SETUP, etc.) that
/// leaked into prose — judge verdicts, ballot reasons, analysis strings —
/// with human-readable references. Used on debates that were generated
/// before the backend prompt fix.
enum StageReferenceHumanizer {
    /// Matches full-word stage codes like A_OPEN, A_CHALLENGE, B_RESPOND_1,
    /// MOD_SETUP, JUDGE. Uses word boundaries so it doesn't touch prose.
    private static let pattern: NSRegularExpression = {
        let raw = "\\b([AB]_(?:OPEN|CHALLENGE|COUNTER|CLOSE|RESPOND_[12]|FINAL)|MOD_(?:SETUP|INTRO|Q[12]|SYNTHESIS|WRAP)|JUDGE)\\b"
        return try! NSRegularExpression(pattern: raw, options: [])
    }()

    static func humanize(_ text: String, personaA: Persona, personaB: Persona) -> String {
        let ns = text as NSString
        let range = NSRange(location: 0, length: ns.length)
        let matches = pattern.matches(in: text, options: [], range: range)
        guard !matches.isEmpty else { return text }

        var result = text
        // Replace from last match to first so ranges stay valid.
        for match in matches.reversed() {
            guard let swiftRange = Range(match.range, in: result) else { continue }
            let stageId = String(result[swiftRange])
            result.replaceSubrange(swiftRange, with: replacement(for: stageId, personaA: personaA, personaB: personaB))
        }
        return result
    }

    private static func replacement(for stageId: String, personaA: Persona, personaB: Persona) -> String {
        let action = StageDisplay.shortLabel(for: stageId).lowercased()
        if stageId.hasPrefix("A_") { return "\(personaA.name)'s \(action)" }
        if stageId.hasPrefix("B_") { return "\(personaB.name)'s \(action)" }
        if stageId.hasPrefix("MOD_") { return "the moderator's \(action)" }
        if stageId == "JUDGE" { return "the verdict" }
        return stageId
    }
}
