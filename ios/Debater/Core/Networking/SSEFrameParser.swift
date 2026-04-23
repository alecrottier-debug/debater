import Foundation

/// Pure, line-by-line SSE frame parser. Feed it `feed(line:)` for each
/// raw line from the transport; when a blank line arrives (frame boundary)
/// it returns the completed event, if any.
///
/// Spec recap (relevant bits): lines starting with ":" are comments,
/// "event:" sets the dispatch name (default "message"), "data:" appends
/// a data line, and a blank line dispatches.
struct SSEFrameParser {
    private var currentEvent: String?
    private var dataLines: [String] = []
    private let decoder: JSONDecoder

    init(decoder: JSONDecoder = JSONDecoder()) {
        self.decoder = decoder
    }

    /// Feed a single line. Returns the dispatched event if the line
    /// completes a frame (blank line). Otherwise nil.
    mutating func feed(line: String) -> SSEEvent? {
        if line.isEmpty {
            return flush()
        }
        if line.hasPrefix(":") {
            return nil // comment / keep-alive
        }
        guard let colon = line.firstIndex(of: ":") else {
            // Whole line is a field name with no value — ignore.
            return nil
        }
        let field = String(line[..<colon])
        var value = String(line[line.index(after: colon)...])
        if value.hasPrefix(" ") { value.removeFirst() }
        switch field {
        case "event": currentEvent = value
        case "data": dataLines.append(value)
        case "id", "retry": break
        default: break
        }
        return nil
    }

    /// Explicitly flush (used at stream end). Normally `feed(line: "")`
    /// is the natural dispatch path.
    mutating func flush() -> SSEEvent? {
        defer {
            currentEvent = nil
            dataLines.removeAll(keepingCapacity: true)
        }
        guard !dataLines.isEmpty else { return nil }
        let name = currentEvent ?? "message"
        let dataString = dataLines.joined(separator: "\n")
        guard let data = dataString.data(using: .utf8) else { return nil }
        return Self.decodeEvent(name: name, data: data, decoder: decoder)
    }

    static func decodeEvent(name: String, data: Data, decoder: JSONDecoder) -> SSEEvent? {
        switch name {
        case "stage":
            struct P: Decodable { let stageId: String; let speaker: String; let label: String }
            if let p = try? decoder.decode(P.self, from: data) {
                return .stage(stageId: p.stageId, speaker: p.speaker, label: p.label)
            }
        case "narrative":
            struct P: Decodable { let text: String }
            if let p = try? decoder.decode(P.self, from: data) {
                return .narrative(text: p.text)
            }
        case "done":
            struct P: Decodable { let debate: Debate }
            if let p = try? decoder.decode(P.self, from: data) {
                return .done(debate: p.debate)
            }
        case "error":
            struct P: Decodable { let message: String }
            if let p = try? decoder.decode(P.self, from: data) {
                return .error(message: p.message)
            }
        default:
            return nil
        }
        return nil
    }
}
