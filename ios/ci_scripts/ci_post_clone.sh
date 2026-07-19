#!/bin/sh
set -e

# Xcode Cloud runs non-interactively: no dialog to trust SPM build-tool plugins.
# Skip plugin fingerprint validation so SwiftLintBuildToolPlugin can run.
# (Apple's key name has the double-typo; both are needed on current Xcode.)
defaults write com.apple.dt.Xcode IDESkipPackagePluginFingerprintValidatation -bool YES
defaults write com.apple.dt.Xcode IDESkipMacroFingerprintValidation -bool YES

brew install xcodegen

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
xcodegen generate
