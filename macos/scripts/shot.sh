#!/bin/sh
# Mac App Store screenshot: launch the app on mock data at 1280x800, capture
# its window by id. Works even when the terminal sits in a full-screen Space,
# where the XCUITest route never finds the window. If the shot comes out with
# grey traffic lights the window was not frontmost: rerun with the app focused.
set -e
cd "$(dirname "$0")/.."
DD="${TMPDIR:-/tmp}"; DD="${DD%/}/talli-mac-dd"   # outside ~/Documents: iCloud xattrs break codesign
xcodebuild build -project TalliMac.xcodeproj -scheme TalliMac -destination 'platform=macOS' \
  -derivedDataPath "$DD" -skipPackagePluginValidation -skipMacroValidation -quiet
KEY='NSWindow Frame SwiftUI.WindowGroup<SwiftUI.ModifiedContent<SwiftUI.ModifiedContent<SwiftUI.ModifiedContent<Talli.MacContentView, SwiftUI._EnvironmentKeyWritingModifier<Swift.Optional<Talli.MacAppState>>>, SwiftUI._PreferenceWritingModifier<SwiftUI.PreferredColorSchemeKey>>, SwiftUI._TaskModifier2>>-1-AppWindow-1'
open -n -F --env UITEST_SNAPSHOT=1 "$DD/Build/Products/Debug/Talli.app" --args "-$KEY" "320 140 1280 800 0 0 1920 1080 "
sleep 6
PID=$(pgrep -f "$DD/Build/Products/Debug/Talli.app/Contents/MacOS/Talli" | head -1)
WID=$(swift scripts/window-id.swift "$PID" | head -1)
screencapture -o -x -l"$WID" fastlane/screenshots/mac/1-main.png
kill "$PID"
sips -g pixelWidth -g pixelHeight fastlane/screenshots/mac/1-main.png | tail -2
