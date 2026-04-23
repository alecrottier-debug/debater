import SwiftUI
import UIKit

/// `.dismissKeyboardOnTap()` — attach to any container view and the keyboard
/// resigns first responder when the user taps outside a text input.
/// Implemented via a non-blocking background tap gesture so it doesn't
/// interfere with buttons, toggles, or scroll gestures.
extension View {
    func dismissKeyboardOnTap() -> some View {
        self.background(
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture {
                    UIApplication.shared.sendAction(
                        #selector(UIResponder.resignFirstResponder),
                        to: nil, from: nil, for: nil
                    )
                }
        )
    }
}
