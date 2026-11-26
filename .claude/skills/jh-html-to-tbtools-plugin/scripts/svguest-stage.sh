#!/bin/bash
# usage: svguest-stage.sh <svguest_repo> <staging_dir>
set -e
src=$(cd "$1" && pwd); st=$2; a=$(cd "$(dirname "$0")/../assets" && pwd)
mkdir -p "$st"
cp "$a/tbtools-ai.json" "$a/siwc.json" "$st/"
printf '// Rewritten by the plugin each time TBtools opens it.\n' > "$st/siwc-session.js"
# plugin-only scripts, each inlined before </body>: the ChatGPT plan, then gift codes (svguest-gift.js; the public app.html has neither)
awk -v f="$a/svguest-chatgpt.js" -v g="$a/svguest-gift.js" '$0=="</head>"&&!h{print "<script src=\"siwc-session.js\"></script>";h=1}$0=="</body>"&&!d{for(i=1;i<=2;i++){x=i==1?f:g;print "<script>";while((getline l<x)>0)print l;close(x);print "</script>"}d=1}{print}END{if(!h||!d)exit 1}' "$src/app.html" > "$st/index.html"
echo "$st"
