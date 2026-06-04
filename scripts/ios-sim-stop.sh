#!/usr/bin/env bash
# Stops Metro bundler and shuts down all booted iOS simulators.
set -euo pipefail

if lsof -ti :8081 2>/dev/null | grep -q .; then
  echo "Stopping Metro on port 8081..."
  lsof -ti :8081 2>/dev/null | xargs kill 2>/dev/null || true
fi

echo "Shutting down iOS simulators..."
xcrun simctl shutdown all

echo "Done."
