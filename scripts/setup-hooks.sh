#!/bin/sh
# Aktiviert die projektspezifischen Git-Hooks (pre-commit, commit-msg).
# Ausführen nach dem Klonen: sh scripts/setup-hooks.sh
git config core.hooksPath .githooks
echo "✓ Git-Hooks aktiviert (.githooks): pre-commit, commit-msg"
