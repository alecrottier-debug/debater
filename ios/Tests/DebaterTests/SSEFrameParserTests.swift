import XCTest
@testable import Debater

final class SSEFrameParserTests: XCTestCase {
    func testParsesStageEvent() {
        var parser = SSEFrameParser()
        XCTAssertNil(parser.feed(line: "event: stage"))
        XCTAssertNil(parser.feed(line: "data: {\"stageId\":\"A_OPEN\",\"speaker\":\"A\",\"label\":\"For Opening\"}"))
        let event = parser.feed(line: "")
        guard case let .stage(stageId, speaker, label) = event else {
            return XCTFail("expected stage, got \(String(describing: event))")
        }
        XCTAssertEqual(stageId, "A_OPEN")
        XCTAssertEqual(speaker, "A")
        XCTAssertEqual(label, "For Opening")
    }

    func testParsesNarrativeEvent() {
        var parser = SSEFrameParser()
        _ = parser.feed(line: "event: narrative")
        _ = parser.feed(line: "data: {\"text\":\"Hello, world.\"}")
        let event = parser.feed(line: "")
        guard case let .narrative(text) = event else {
            return XCTFail("expected narrative, got \(String(describing: event))")
        }
        XCTAssertEqual(text, "Hello, world.")
    }

    func testParsesMultiLineData() {
        // Per spec, multiple data: lines join with "\n".
        var parser = SSEFrameParser()
        _ = parser.feed(line: "event: narrative")
        _ = parser.feed(line: "data: {\"text\":")
        _ = parser.feed(line: "data: \"line1\\nline2\"}")
        let event = parser.feed(line: "")
        guard case let .narrative(text) = event else {
            return XCTFail("expected narrative, got \(String(describing: event))")
        }
        XCTAssertEqual(text, "line1\nline2")
    }

    func testIgnoresCommentAndKeepAlive() {
        var parser = SSEFrameParser()
        XCTAssertNil(parser.feed(line: ": keep-alive"))
        XCTAssertNil(parser.feed(line: ""))
        _ = parser.feed(line: "event: narrative")
        _ = parser.feed(line: "data: {\"text\":\"ok\"}")
        let e = parser.feed(line: "")
        guard case .narrative(let text) = e else {
            return XCTFail("expected narrative after keep-alive, got \(String(describing: e))")
        }
        XCTAssertEqual(text, "ok")
    }

    func testIgnoresUnknownEventNames() {
        var parser = SSEFrameParser()
        _ = parser.feed(line: "event: ping")
        _ = parser.feed(line: "data: {}")
        XCTAssertNil(parser.feed(line: ""))
    }

    func testIgnoresIdAndRetryFields() {
        var parser = SSEFrameParser()
        _ = parser.feed(line: "id: 42")
        _ = parser.feed(line: "retry: 3000")
        _ = parser.feed(line: "event: narrative")
        _ = parser.feed(line: "data: {\"text\":\"x\"}")
        let e = parser.feed(line: "")
        guard case .narrative = e else { return XCTFail() }
    }

    func testParsesErrorEvent() {
        var parser = SSEFrameParser()
        _ = parser.feed(line: "event: error")
        _ = parser.feed(line: "data: {\"message\":\"boom\"}")
        let e = parser.feed(line: "")
        guard case .error(let message) = e else { return XCTFail() }
        XCTAssertEqual(message, "boom")
    }

    func testStripsOptionalLeadingSpaceInValue() {
        // Per spec: "data: foo" and "data:foo" are equivalent (one leading space stripped).
        var parser = SSEFrameParser()
        _ = parser.feed(line: "event: narrative")
        _ = parser.feed(line: "data:{\"text\":\"no-space\"}")
        let e = parser.feed(line: "")
        guard case .narrative(let text) = e else { return XCTFail() }
        XCTAssertEqual(text, "no-space")
    }
}

final class StagePlansTests: XCTestCase {
    func testQuickPlanStartsWithModeratorAndEndsWithJudge() {
        let stages = StagePlans.quick
        XCTAssertEqual(stages.first?.speaker, .moderator)
        XCTAssertEqual(stages.last?.speaker, .judge)
        XCTAssertEqual(stages.count, 9)
    }

    func testDiscussionPlanUsesNoJudge() {
        let stages = StagePlans.discussion
        XCTAssertFalse(stages.contains(where: { $0.speaker == .judge }))
        XCTAssertEqual(stages.count, 10)
    }

    func testStagesForModeDispatch() {
        XCTAssertEqual(StagePlans.stages(forMode: "quick").count, 9)
        XCTAssertEqual(StagePlans.stages(forMode: "discussion").count, 10)
        XCTAssertEqual(StagePlans.stages(forMode: "unknown").count, 9) // falls back to quick
    }
}
