#!/bin/sh
set -e

brew install xcodegen

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
xcodegen generate
