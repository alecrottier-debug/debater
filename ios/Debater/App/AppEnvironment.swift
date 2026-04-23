import Foundation
import Observation

/// Root dependency container. Injected into the SwiftUI environment so screens
/// and view models share a single `APIClient`/`SSEClient`/`DeviceIdentity`.
@Observable
@MainActor
final class AppEnvironment {
    let api: APIClient
    let sse: SSEClient
    let deviceId: String

    init(api: APIClient, sse: SSEClient, deviceId: String) {
        self.api = api
        self.sse = sse
        self.deviceId = deviceId
    }

    static var live: AppEnvironment {
        let deviceId = DeviceIdentity.current
        let baseURL = Self.resolveBaseURL()
        let api = APIClient(baseURL: baseURL, deviceId: deviceId)
        let sse = SSEClient(baseURL: baseURL, deviceId: deviceId)
        return AppEnvironment(api: api, sse: sse, deviceId: deviceId)
    }

    private static func resolveBaseURL() -> URL {
        if let override = Bundle.main.object(forInfoDictionaryKey: "DEBATER_API_URL") as? String,
           let url = URL(string: override) {
            return url
        }
        // Default: local NestJS backend reachable from Simulator via localhost.
        // On a physical device you'll want to override via Info.plist or scheme.
        return URL(string: "http://localhost:3001/api")!
    }
}

enum DeviceIdentity {
    private static let key = "com.debater.deviceId"

    static var current: String {
        let defaults = UserDefaults.standard
        if let existing = defaults.string(forKey: key) {
            return existing
        }
        let id = UUID().uuidString
        defaults.set(id, forKey: key)
        return id
    }
}
