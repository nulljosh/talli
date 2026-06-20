#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Regenerating Xcode project"
xcodegen generate

echo "==> Running fastlane snapshot (mock auth, no real credentials)"
fastlane snapshot

DEVICE="iPhone 17 Pro"
SHOTS=("01-Home" "02-Reports" "03-Benefits" "04-Messages" "05-Settings")

echo "==> Staging screenshots + README"
cd ..
for shot in "${SHOTS[@]}"; do
  git add -f "ios/fastlane/screenshots/en-US/${DEVICE}-${shot}.png"
done
git add ios/README.md

if git diff --cached --quiet; then
  echo "==> No changes to commit"
  exit 0
fi

echo "==> Committing"
git commit -m "$(cat <<'EOF'
Update Tally iOS App Store screenshots

Regenerated via fastlane snapshot.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"

echo "==> Pushing"
git push

echo "==> Done"
