import Foundation

/// Typed SSE event emitted by the backend's @Sse() debate-advance endpoint.
/// Mirrors backend/src/debates/debates.controller.ts streamNext().
enum SSEEvent: Sendable {
    case stage(stageId: String, speaker: String, label: String)
    case narrative(text: String)
    case done(debate: Debate)
    case error(message: String)
}

/// SSE client using URLSessionDataDelegate rather than `URLSession.bytes`.
///
/// Why: `URLSession.bytes(for:).lines` buffers internally and doesn't yield
/// small chunks immediately (~seconds of latency). For SSE where each event
/// is under 100 bytes and must appear live, the delegate-based approach
/// gives us `urlSession(_:dataTask:didReceive:)` callbacks as packets
/// arrive off the wire.
final class SSEClient: @unchecked Sendable {
    private let baseURL: URL
    private let deviceId: String

    init(baseURL: URL, deviceId: String, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.deviceId = deviceId
        // `session` arg kept for API stability; we use a per-stream session
        // internally to bind the delegate lifecycle to the request.
        _ = session
    }

    func streamNextTurn(debateId: String) -> AsyncThrowingStream<SSEEvent, Error> {
        let url = baseURL.appendingPathComponent("debates/\(debateId)/next/stream")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        request.timeoutInterval = 300

        return AsyncThrowingStream { continuation in
            let delegate = SSEDelegate(continuation: continuation)
            let config = URLSessionConfiguration.ephemeral
            config.timeoutIntervalForRequest = 300
            config.waitsForConnectivity = false
            let session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
            let task = session.dataTask(with: request)
            delegate.task = task
            delegate.session = session
            continuation.onTermination = { _ in
                task.cancel()
                session.invalidateAndCancel()
            }
            task.resume()
        }
    }
}

/// Buffers incoming bytes, splits on line boundaries, feeds SSEFrameParser,
/// and forwards typed events to an AsyncThrowingStream continuation.
private final class SSEDelegate: NSObject, URLSessionDataDelegate, @unchecked Sendable {
    private let continuation: AsyncThrowingStream<SSEEvent, Error>.Continuation
    private var buffer = Data()
    private var parser = SSEFrameParser()
    private var finished = false
    var task: URLSessionDataTask?
    var session: URLSession?

    init(continuation: AsyncThrowingStream<SSEEvent, Error>.Continuation) {
        self.continuation = continuation
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard let http = response as? HTTPURLResponse else {
            fail(APIError.invalidResponse)
            completionHandler(.cancel)
            return
        }
        guard (200..<300).contains(http.statusCode) else {
            fail(APIError.http(status: http.statusCode, body: ""))
            completionHandler(.cancel)
            return
        }
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        buffer.append(data)
        // Split on "\n" (covers both LF and CRLF — trailing \r is stripped).
        while let nlIndex = buffer.firstIndex(of: 0x0A) {
            let lineData = buffer.subdata(in: buffer.startIndex..<nlIndex)
            buffer.removeSubrange(buffer.startIndex...nlIndex)
            var line = String(data: lineData, encoding: .utf8) ?? ""
            if line.hasSuffix("\r") { line.removeLast() }
            if let event = parser.feed(line: line) {
                continuation.yield(event)
                if case .done = event { finished = true; task?.cancel(); break }
                if case .error = event { finished = true; task?.cancel(); break }
            }
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        defer {
            session.invalidateAndCancel()
        }
        if finished {
            continuation.finish()
            return
        }
        if let error, (error as NSError).code != NSURLErrorCancelled {
            continuation.finish(throwing: APIError.transport(underlying: error))
        } else {
            continuation.finish()
        }
    }

    private func fail(_ error: Error) {
        if !finished {
            finished = true
            continuation.finish(throwing: error)
        }
    }
}
