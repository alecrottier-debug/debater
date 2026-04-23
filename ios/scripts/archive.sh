#!/usr/bin/env bash
# Archive + export an App Store-ready .ipa for the Debater iOS app.
#
# Prereqs:
#   * Xcode + Apple Developer account logged in (`xcrun altool` or Xcode prefs)
#   * DEVELOPMENT_TEAM env var set to your 10-char team ID
#   * Config/Release.xcconfig's DEBATER_API_URL points at your deployed backend
#
# Usage:
#   DEVELOPMENT_TEAM=ABC1234XYZ ./scripts/archive.sh
#
# Output:
#   build/Debater.ipa      — ready to upload via Transporter.app
#   build/Debater.xcarchive — the archive itself (open with Xcode Organizer)

set -euo pipefail

if [[ -z "${DEVELOPMENT_TEAM:-}" ]]; then
  echo "error: set DEVELOPMENT_TEAM to your 10-char Apple team ID" >&2
  echo "       find it at https://developer.apple.com/account → Membership" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

SCHEME="Debater"
ARCHIVE_PATH="build/Debater.xcarchive"
EXPORT_DIR="build"
EXPORT_OPTS="build/ExportOptions.resolved.plist"

mkdir -p build

# Regenerate project from yml to pick up any config changes
if command -v xcodegen >/dev/null 2>&1; then
  xcodegen generate
fi

# Inject DEVELOPMENT_TEAM into a temp ExportOptions plist
cp ExportOptions.plist "$EXPORT_OPTS"
/usr/libexec/PlistBuddy -c "Add :teamID string $DEVELOPMENT_TEAM" "$EXPORT_OPTS" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :teamID $DEVELOPMENT_TEAM" "$EXPORT_OPTS"

echo "==> Archiving (Release)"
xcodebuild \
  -project Debater.xcodeproj \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates \
  archive \
  | xcbeautify 2>/dev/null || xcodebuild \
  -project Debater.xcodeproj \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates \
  archive

echo "==> Exporting .ipa"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTS" \
  -allowProvisioningUpdates

echo
echo "✅ Archive:  $ARCHIVE_PATH"
echo "✅ IPA:     $EXPORT_DIR/Debater.ipa"
echo
echo "Next: drag the .ipa into Transporter.app to upload, or run:"
echo "  xcrun altool --upload-app -f $EXPORT_DIR/Debater.ipa -t ios \\"
echo "    --apiKey YOUR_KEY_ID --apiIssuer YOUR_ISSUER_ID"
