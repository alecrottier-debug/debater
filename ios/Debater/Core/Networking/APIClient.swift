import Foundation

enum APIError: Error, LocalizedError, Sendable {
    case invalidResponse
    case http(status: Int, body: String)
    case decoding(underlying: Error)
    case transport(underlying: Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: "Unexpected response from server."
        case .http(let status, let body): "HTTP \(status): \(body)"
        case .decoding(let err): "Failed to decode: \(err.localizedDescription)"
        case .transport(let err): "Network error: \(err.localizedDescription)"
        }
    }
}

/// Async REST client. All endpoints are shared with the web app; see
/// backend/src/debates/debates.controller.ts and personas.controller.ts.
final class APIClient: @unchecked Sendable {
    let baseURL: URL
    private let deviceId: String
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(baseURL: URL, deviceId: String, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.deviceId = deviceId
        self.session = session
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    // MARK: - Personas

    func fetchPersonas() async throws -> [Persona] {
        try await get("/personas")
    }

    func fetchTemplatePersonas() async throws -> [Persona] {
        try await get("/personas?templates=true")
    }

    func createPersona(name: String, tagline: String, personaJson: JSONValue, isTemplate: Bool = false) async throws -> Persona {
        struct Body: Encodable {
            let name: String
            let tagline: String
            let personaJson: JSONValue
            let isTemplate: Bool
        }
        return try await post("/personas", body: Body(name: name, tagline: tagline, personaJson: personaJson, isTemplate: isTemplate))
    }

    func researchPersona(subject: String, context: String?) async throws -> ResearchResult {
        struct Body: Encodable { let subject: String; let context: String? }
        return try await post("/personas/research", body: Body(subject: subject, context: context))
    }

    func synthesizePersona(dossierId: String, name: String?) async throws -> Persona {
        struct Body: Encodable { let dossierId: String; let name: String? }
        return try await post("/personas/synthesize", body: Body(dossierId: dossierId, name: name))
    }

    func researchAndSynthesize(subject: String, context: String?, name: String?) async throws -> ResearchAndSynthesizeResult {
        struct Body: Encodable { let subject: String; let context: String?; let name: String? }
        return try await post("/personas/research-and-synthesize", body: Body(subject: subject, context: context, name: name))
    }

    // MARK: - Debates

    func fetchDebates() async throws -> [Debate] {
        try await get("/debates")
    }

    func fetchDebate(id: String) async throws -> Debate {
        try await get("/debates/\(id)")
    }

    func createDebate(motion: String, mode: String, personaAId: String, personaBId: String, moderatorPersonaId: String?, confrontationLevel: Int) async throws -> Debate {
        struct Body: Encodable {
            let motion: String
            let mode: String
            let personaAId: String
            let personaBId: String
            let moderatorPersonaId: String?
            let confrontationLevel: Int
        }
        return try await post("/debates", body: Body(motion: motion, mode: mode, personaAId: personaAId, personaBId: personaBId, moderatorPersonaId: moderatorPersonaId, confrontationLevel: confrontationLevel))
    }

    func advance(debateId: String) async throws -> Debate {
        try await post("/debates/\(debateId)/next", body: EmptyBody())
    }

    func rematch(debateId: String) async throws -> Debate {
        try await post("/debates/\(debateId)/rematch", body: EmptyBody())
    }

    func exportDebate(id: String) async throws -> String {
        let url = baseURL.appendingPathComponent("debates/\(id)/export")
        var req = URLRequest(url: url)
        req.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(status: http.statusCode, body: String(data: data, encoding: .utf8) ?? "")
        }
        return String(data: data, encoding: .utf8) ?? ""
    }

    // MARK: - Internal

    private struct EmptyBody: Encodable {}

    private func get<T: Decodable>(_ path: String) async throws -> T {
        try await perform(request: makeRequest(path: path, method: "GET", body: Optional<EmptyBody>.none))
    }

    private func post<Body: Encodable, T: Decodable>(_ path: String, body: Body) async throws -> T {
        try await perform(request: makeRequest(path: path, method: "POST", body: body))
    }

    private func makeRequest(path: String, method: String, body: (some Encodable)?) throws -> URLRequest {
        // Allow paths with query strings like "/personas?templates=true".
        let url: URL
        if path.contains("?") {
            guard let composed = URL(string: baseURL.absoluteString.trimmingCharacters(in: .init(charactersIn: "/")) + path) else {
                throw APIError.invalidResponse
            }
            url = composed
        } else {
            url = baseURL.appendingPathComponent(path.trimmingCharacters(in: .init(charactersIn: "/")))
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let body {
            req.httpBody = try encoder.encode(body)
        }
        return req
    }

    private func perform<T: Decodable>(request: URLRequest) async throws -> T {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.transport(underlying: error)
        }
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(status: http.statusCode, body: String(data: data, encoding: .utf8) ?? "")
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(underlying: error)
        }
    }
}
