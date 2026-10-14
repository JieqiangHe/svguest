#!/bin/bash
# usage: svguest-stage.sh <svguest_repo> <staging_dir>
set -e
src=$(cd "$1" && pwd); st=$2; a=$(cd "$(dirname "$0")/../assets" && pwd)
mkdir -p "$st"
cp "$a/tbtools-ai.json" "$a/siwc.json" "$st/"
printf '// Rewritten by the plugin each time TBtools opens it.\n' > "$st/siwc-session.js"
awk -v f="$a/svguest-chatgpt.js" '$0=="</body>"&&!d{print "<script src=\"siwc-session.js\"></script>\n<script>";while((getline l<f)>0)print l;print "</script>";d=1}{print}END{if(!d)exit 1}' "$src/app.html" > "$st/index.html"
echo "$st"
