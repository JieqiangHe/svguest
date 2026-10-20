#!/bin/bash
# usage: svguest-repack.sh <svguest_repo> [plugin]
# Restages the app into an existing svguest.plugin, keeping its compiled svguest.jar: for changes to app.html
# (or the staged assets) only, so neither a JDK nor the TBtools jar is needed. Java changes still need build.sh.
set -e
src=$(cd "$1" && pwd); pl=$(cd "$(dirname "${2:-$src/svguest.plugin}")" && pwd)/$(basename "${2:-$src/svguest.plugin}")
here=$(cd "$(dirname "$0")" && pwd); w=$(mktemp -d)
(cd "$w" && unzip -q "$pl")
[ -f "$w/svguest/svguest.jar" ] || { echo "no svguest/svguest.jar in $pl" >&2; rm -rf "$w"; exit 1; }
bash "$here/svguest-stage.sh" "$src" "$w/stage" >/dev/null
cp "$w/stage/index.html" "$w/stage/tbtools-ai.json" "$w/stage/siwc.json" "$w/svguest/"
[ -f "$w/svguest/siwc-session.js" ] || cp "$w/stage/siwc-session.js" "$w/svguest/"
rm -f "$pl"; (cd "$w" && zip -qrX "$pl" svguest)
rm -rf "$w"; echo "$pl"
