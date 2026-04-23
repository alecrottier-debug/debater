# TestFlight checklist

Everything in the repo is ready. Seven things need your hands.

## Before anything else

1. **Apple Developer account active** — confirm at https://developer.apple.com/account. $99/yr membership must be paid.
2. **Know your Team ID** — same page → Membership. It's a 10-char string like `ABC1234XYZ`. Save it somewhere; you'll paste it in a few places.
3. **Public backend URL ready** — whatever your Azure Container Apps URL is, it has to:
   - Respond to `GET /api/personas` over `https://` (TestFlight won't accept plain http unless you whitelist it in Info.plist — don't go down that road).
   - Serve `/avatars/*` (already wired in `backend/src/main.ts`).
   - Allow CORS from any origin (already on, `app.enableCors()`).

## Step 1 — Claim the bundle ID in App Store Connect

The project ships with `com.debater.app`. If that's taken, pick another and update it in three places:

- `ios/project.yml` → `PRODUCT_BUNDLE_IDENTIFIER`
- `ios/project.yml` → `PRODUCT_BUNDLE_IDENTIFIER` for `DebaterTests`
- Any existing App Store Connect app record

Then:

1. Go to https://appstoreconnect.apple.com → Apps → `+` → New App.
2. Platform: **iOS**. Name: **AI Debate Simulator**. Primary language: English.
3. Bundle ID: pick yours (you may need to register it first at developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → `+`).
4. SKU: anything unique to you (e.g. `debater-001`).
5. Leave the rest blank — you only need the record to exist for TestFlight upload.

## Step 2 — Set your production API URL

Edit `ios/Config/Release.xcconfig`:

```
DEBATER_API_URL = https:/$()/your-real-deployed-api.com/api
```

The `$()` in the middle is **not a typo** — xcconfig treats `//` as a comment, so the colon-slash-slash in a URL needs to be escaped via an empty variable reference. Ugly, but it works.

Do not commit the real URL if it's sensitive. If you prefer, set it via a GitHub Actions secret (see Step 6) and leave the xcconfig pointing at a placeholder.

## Step 3 — First local archive to verify signing works

Run this with your Team ID:

```bash
cd ios
DEVELOPMENT_TEAM=ABC1234XYZ ./scripts/archive.sh
```

What can go wrong:

- **"No signing certificate found"** — open Xcode → Settings → Accounts → sign in with your Apple ID → your team should appear. If not, membership isn't active.
- **"Provisioning profile doesn't match"** — open the project in Xcode (`open Debater.xcodeproj`), select the Debater target → Signing & Capabilities → check "Automatically manage signing", pick your team. Close Xcode, re-run the script.
- **"unknown build setting 'DEVELOPMENT_TEAM'"** — you didn't export the env var. Run `export DEVELOPMENT_TEAM=ABC1234XYZ` first.

If the script succeeds you'll have `ios/build/Debater.ipa`. Drag it into **Transporter.app** (free on the Mac App Store — search "Transporter"). Click Deliver. Wait ~5 minutes.

## Step 4 — Wait for processing

The uploaded build shows up in App Store Connect → your app → TestFlight → iOS Builds with a "Processing" spinner. This usually takes 10–30 minutes. You'll get an email when it's done (or when it fails — common reasons: missing export compliance answer, using private APIs, or bundle-ID mismatches).

## Step 5 — Answer export compliance

First time only. Tap the "Missing Compliance" banner → answer "does your app use encryption?" → you said `ITSAppUsesNonExemptEncryption: false` in Info.plist so the answer is **No**. This means you skip the extended questionnaire.

## Step 6 — Add testers

**Internal testing** (fastest, no Apple review):
1. TestFlight tab → Internal Testing → `+` → Create Group.
2. Add your Apple ID as a tester (must be on your team in App Store Connect → Users and Access).
3. Select the build. Internal testers get an email immediately.
4. Install TestFlight on your iPhone, open the invite → install → launch.

**External testing** (needs Apple review — 24-72 hours first time):
1. TestFlight tab → External Testing → New Group.
2. Add email invites or a public link.
3. Submit the build for external testing review.
4. Apple looks at: content appropriateness, crash-free launch, whether it does what you claim.

## Step 7 — Automate uploads (optional but recommended)

Once the first manual upload succeeds, wire up CI:

1. Generate an App Store Connect API key: App Store Connect → Users and Access → Keys tab → `+`. Give it **App Manager** access. Download the `.p8` (one chance to grab it).
2. Note the **Key ID** (shown on the keys page) and **Issuer ID** (top of the keys page).
3. In your GitHub repo → Settings → Secrets and variables → Actions → New secret. Add:

   | Secret | Value |
   |---|---|
   | `APPLE_DEVELOPMENT_TEAM` | your 10-char team ID |
   | `APP_STORE_CONNECT_API_KEY_ID` | 10-char key ID |
   | `APP_STORE_CONNECT_API_ISSUER_ID` | UUID issuer ID |
   | `APP_STORE_CONNECT_API_KEY_P8` | full contents of the `.p8` file (paste, including BEGIN/END lines) |
   | `IOS_RELEASE_API_URL` | `https://your-api.example.com/api` |

4. Push a tag to trigger the workflow:

   ```bash
   git tag ios-v0.1.0
   git push origin ios-v0.1.0
   ```

   Or trigger manually: GitHub → Actions → iOS TestFlight → Run workflow.

5. The `ios-testflight.yml` workflow archives and uploads. Check the Actions tab for progress; if it fails, the `debater-ipa` artifact is still produced so you can download and upload manually.

## Things to expect getting flagged on first review

(External review only — internal testing skips this.)

1. **Real public figures** — Apple may ask what you're doing about impersonation. Reply: "Every screen shows an AI-generated-content disclaimer; content is clearly rhetorical/educational; we do not claim any statement is a real quote." The first-launch disclaimer in this app was added exactly for this.

2. **AI content moderation** — 1.2 says apps generating content from AI must be safe and have reporting. Personas are curated by you, not user-generated at scale, which helps. If asked, say user-created personas go through synthesis prompts that steer away from slurs/harassment and there's a delete action.

3. **Web-view equivalent** — they may ask if this is just a wrapper around your website. It isn't: native UI, native SSE, native navigation — point to the Swift code if pressed.

## Things I couldn't automate and why

| Thing | Why not |
|---|---|
| Creating the app record in App Store Connect | Requires your Apple ID + 2FA |
| Registering the bundle ID | Same |
| Generating the distribution certificate | Same |
| Adding GitHub Actions secrets | Same |
| Clicking "Submit for Review" | Same |
| Choosing a better app icon | You have better taste than I do. The current 1024×1024 is the hero image cropped to square — fine for TestFlight, swap in something punchier before public launch. Generate at 1024×1024, no alpha channel, save as PNG over `ios/Debater/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png` |

## Verifying things are hooked up correctly

Before you run the archive, sanity-check:

```bash
cd ios

# xcconfig parses and URL resolves
xcodebuild -project Debater.xcodeproj -scheme Debater -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  CODE_SIGNING_ALLOWED=NO build 2>&1 | tail -2
# → "** BUILD SUCCEEDED **"

# URL baked correctly
find /Users/*/Library/Developer/Xcode/DerivedData/Debater-*/Build/Products/Release-iphonesimulator \
  -name "Info.plist" -path "*Debater.app*" 2>/dev/null | head -1 | \
  xargs -I {} /usr/libexec/PlistBuddy -c "Print :DEBATER_API_URL" {}
# → your real https:// URL, not "CHANGEME-..."

# Tests pass
xcodebuild -project Debater.xcodeproj -scheme Debater \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test 2>&1 | \
  grep -E "Executed|TEST SUCCEEDED"
# → 14 tests, TEST SUCCEEDED
```

If all three pass, archive and ship.
