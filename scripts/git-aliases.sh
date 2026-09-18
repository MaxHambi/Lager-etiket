#!/bin/sh
# Nützliche Git-Aliase für den Arbeitsalltag (siehe Wiki/CONTRIBUTING).
# Ausführen: sh scripts/git-aliases.sh
git config --global alias.lg "log --oneline --graph --decorate --all"
git config --global alias.st "status -sb"
git config --global alias.co checkout
git config --global alias.last "log -1 --stat"
git config --global alias.unstage "restore --staged"
git config --global alias.amend "commit --amend --no-edit"
git config --global alias.wip "!git add -A && git commit -m 'wip: zwischenstand'"
echo "✓ Git-Aliase gesetzt (global): lg, st, co, last, unstage, amend, wip"
