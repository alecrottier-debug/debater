import XCTest
@testable import Debater

final class JSONValueTests: XCTestCase {
    func testDecodesNestedPersonaJSON() throws {
        let data = """
        {
          "schemaVersion": 2,
          "identity": { "name": "Test", "avatarUrl": "https://example.com/x.png" },
          "positions": { "priorities": ["one", "two"] }
        }
        """.data(using: .utf8)!

        let value = try JSONDecoder().decode(JSONValue.self, from: data)
        XCTAssertEqual(value["identity"]["name"].stringValue, "Test")
        XCTAssertEqual(value["identity"]["avatarUrl"].stringValue, "https://example.com/x.png")
        XCTAssertEqual(value["positions"]["priorities"].arrayValue?.count, 2)
    }

    func testPersonaAvatarURLReadsV2Then_V1() throws {
        let v2 = """
        {
          "id": "p1",
          "name": "X",
          "tagline": "y",
          "personaJson": { "identity": { "avatarUrl": "https://example.com/a.png" } },
          "isTemplate": true,
          "role": "debater",
          "createdAt": "2026-04-22T00:00:00Z"
        }
        """.data(using: .utf8)!
        let p = try JSONDecoder().decode(Persona.self, from: v2)
        XCTAssertEqual(p.avatarPath, "https://example.com/a.png")
        let resolved = p.avatarURL(resolvingAgainst: URL(string: "http://api.example.com/api")!)
        XCTAssertEqual(resolved?.absoluteString, "https://example.com/a.png")
    }

    func testPersonaAvatarRelativePathResolvesAgainstBase() throws {
        let json = """
        {
          "id": "p1", "name": "X", "tagline": "y",
          "personaJson": { "identity": { "avatarUrl": "/avatars/foo.png" } },
          "isTemplate": true, "role": "debater", "createdAt": "2026-04-22T00:00:00Z"
        }
        """.data(using: .utf8)!
        let p = try JSONDecoder().decode(Persona.self, from: json)
        let resolved = p.avatarURL(resolvingAgainst: URL(string: "http://localhost:3001/api")!)
        XCTAssertEqual(resolved?.absoluteString, "http://localhost:3001/avatars/foo.png")
    }
}
