import Foundation

/// Structured accessors into `Persona.personaJson` — works for v2 debater
/// personas, v1 flat personas, and moderator_v1 personas. Fields missing
/// from a schema return nil; the detail view skips empty sections.
extension Persona {
    // MARK: - Identity

    var biographySummary: String? {
        personaJson["identity"]["biography"]["summary"].stringValue
            ?? personaJson["identity"]["summary"].stringValue
            ?? personaJson["background"].stringValue
    }

    var formativeEnvironments: String? {
        personaJson["identity"]["biography"]["formativeEnvironments"].stringValue
    }

    var incentiveStructures: String? {
        personaJson["identity"]["biography"]["incentiveStructures"].stringValue
    }

    var isRealPerson: Bool {
        if case .bool(let b) = personaJson["identity"]["isRealPerson"] { return b }
        return true
    }

    // MARK: - Positions

    var priorities: [String] {
        personaJson["positions"]["priorities"].stringArray
            ?? personaJson["priorities"].stringArray
            ?? []
    }

    var principles: [String] {
        personaJson["positions"]["principles"].stringArray ?? []
    }

    /// knownStances is an object (topic → stance) — emit as ordered pairs.
    var knownStances: [(topic: String, stance: String)] {
        guard case let .object(dict) = personaJson["positions"]["knownStances"] else { return [] }
        return dict
            .compactMap { key, value -> (String, String)? in
                guard let s = value.stringValue else { return nil }
                return (key.replacingOccurrences(of: "-", with: " ").capitalized, s)
            }
            .sorted { $0.0 < $1.0 }
    }

    // MARK: - Rhetoric / voice

    var rhetoricStyle: String? {
        personaJson["rhetoric"]["style"].stringValue ?? personaJson["style"].stringValue
    }

    var rhetoricTone: String? {
        personaJson["rhetoric"]["tone"].stringValue ?? personaJson["tone"].stringValue
    }

    var signaturePhrases: [String] {
        personaJson["rhetoric"]["signaturePhrases"].stringArray ?? []
    }

    var rhetoricalMoves: [String] {
        personaJson["rhetoric"]["rhetoricalMoves"].stringArray ?? []
    }

    var realQuotes: [String] {
        personaJson["voiceCalibration"]["realQuotes"].stringArray ?? []
    }

    var responseOpeners: [String] {
        personaJson["voiceCalibration"]["responseOpeners"].stringArray ?? []
    }

    // MARK: - Epistemology

    var trackRecord: [String] {
        personaJson["epistemology"]["trackRecord"].stringArray ?? []
    }

    var mindChanges: [String] {
        personaJson["epistemology"]["mindChanges"].stringArray ?? []
    }

    // MARK: - Vulnerabilities

    var blindSpots: [String] {
        personaJson["vulnerabilities"]["blindSpots"].stringArray ?? []
    }

    var hedgingTopics: [String] {
        personaJson["vulnerabilities"]["hedgingTopics"].stringArray ?? []
    }
}

private extension JSONValue {
    var stringArray: [String]? {
        guard case .array(let arr) = self else { return nil }
        let strings = arr.compactMap { $0.stringValue }
        return strings.isEmpty ? nil : strings
    }
}
