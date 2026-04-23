import Foundation

// MARK: - Speaker

enum Speaker: String, Codable, Sendable, Hashable {
    case moderator = "MOD"
    case sideA = "A"
    case sideB = "B"
    case judge = "JUDGE"
}

// MARK: - DebateStatus

enum DebateStatus: String, Codable, Sendable {
    case pending
    case inProgress = "in_progress"
    case completed
    case error
}

// MARK: - Persona

/// Persona's inner JSON is v1-or-v2 and too loose to model statically.
/// We keep the raw dict and expose convenience accessors.
struct Persona: Codable, Sendable, Identifiable, Hashable {
    let id: String
    let name: String
    let tagline: String
    let personaJson: JSONValue
    let isTemplate: Bool
    let role: String
    let createdAt: String

    /// v2 has `identity.avatarUrl`; v1 has `avatarUrl` at root. Values
    /// may be absolute (http/https) or a site-relative path like
    /// `/avatars/foo.png`. Relative paths must be resolved against a base.
    var avatarPath: String? {
        if case let .object(dict) = personaJson {
            if case let .object(identity) = dict["identity"] ?? .null,
               case let .string(url) = identity["avatarUrl"] ?? .null {
                return url
            }
            if case let .string(url) = dict["avatarUrl"] ?? .null {
                return url
            }
        }
        return nil
    }

    func avatarURL(resolvingAgainst base: URL) -> URL? {
        guard let raw = avatarPath else { return nil }
        if raw.hasPrefix("http://") || raw.hasPrefix("https://") {
            return URL(string: raw)
        }
        // Strip any path component of `base` (e.g. "/api") and append the
        // persona path. The backend serves avatars from its root.
        guard var comps = URLComponents(url: base, resolvingAgainstBaseURL: false) else { return nil }
        comps.path = raw.hasPrefix("/") ? raw : "/" + raw
        comps.query = nil
        return comps.url
    }
}

// MARK: - Turn & payload

struct TurnPayload: Codable, Sendable, Hashable {
    let narrative: String?
    let lead: String?
    let bullets: [String]?
    let question: String?
    let questionAnswered: String?
}

struct Turn: Codable, Sendable, Identifiable, Hashable {
    let id: String
    let debateId: String
    let stageId: String
    let speaker: Speaker
    let payload: TurnPayload
    let renderedText: String
    let wordCount: Int
    let violations: [String]
    let createdAt: String
}

// MARK: - Judge

struct SideScores: Codable, Sendable, Hashable {
    let clarity: Double
    let strength: Double
    let responsiveness: Double
    let weighing: Double
}

struct DetailedSubScores: Codable, Sendable, Hashable {
    let logicalRigor: Double
    let evidenceQuality: Double
    let rebuttalEffectiveness: Double
    let argumentNovelty: Double
    let persuasiveness: Double
    let voiceAuthenticity: Double
    let rhetoricalSkill: Double
    let emotionalResonance: Double
    let framingControl: Double
    let adaptability: Double
}

struct SideAnalysis: Codable, Sendable, Hashable {
    let strengths: [String]
    let weaknesses: [String]
    let keyMoment: String
    let keyMomentRef: String
}

struct BallotEntry: Codable, Sendable, Hashable {
    let refs: [String]
    let reason: String
}

struct BestLines: Codable, Sendable, Hashable {
    let A: String
    let B: String
}

struct SidePair<T: Codable & Sendable & Hashable>: Codable, Sendable, Hashable {
    let A: T
    let B: T
}

struct Momentum: Codable, Sendable, Hashable {
    let trajectory: String
    let description: String
}

struct JudgeDecision: Codable, Sendable, Hashable {
    let id: String
    let debateId: String
    let winner: String
    let scores: SidePair<SideScores>
    let ballot: [BallotEntry]
    let bestLines: BestLines
    let detailedScores: SidePair<DetailedSubScores>?
    let verdict: String?
    let analysis: SidePair<SideAnalysis>?
    let momentum: Momentum?
    let closeness: String?
    let createdAt: String
}

// MARK: - Debate

struct Debate: Codable, Sendable, Identifiable, Hashable {
    let id: String
    let motion: String
    let mode: String
    let personaAId: String
    let personaBId: String
    let moderatorPersonaId: String?
    let confrontationLevel: Int
    let stageIndex: Int
    let status: DebateStatus
    let createdAt: String
    let updatedAt: String
    let personaA: Persona
    let personaB: Persona
    let moderatorPersona: Persona?
    let turns: [Turn]?
    let judgeDecision: JudgeDecision?
}

// MARK: - Stages

struct StageBullets: Codable, Sendable, Hashable {
    let min: Int
    let max: Int
}

struct StageConfig: Codable, Sendable, Hashable, Identifiable {
    let id: String
    let label: String
    let speaker: Speaker
    let maxWords: Int?
    let bullets: StageBullets?
    let questionRequired: Bool
    let questionCount: Int
}

// MARK: - Research / Synthesis

struct ResearchResult: Codable, Sendable, Hashable {
    let dossierId: String
    let subject: String
    let summary: String
    let createdAt: String
}

struct ResearchAndSynthesizeResult: Codable, Sendable, Hashable {
    let persona: Persona
    let dossierId: String
    let summary: String
}
