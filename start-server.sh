#!/usr/bin/env bash
# Prana Calendar - local server (macOS / Linux)
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found on this computer."
  echo "Install it from https://nodejs.org/ (the LTS version) and run this script again."
  exit 1
fi

node server.js
