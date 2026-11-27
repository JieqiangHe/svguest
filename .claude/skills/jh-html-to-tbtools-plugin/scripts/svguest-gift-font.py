#!/usr/bin/env python3
"""Embed the Chinese glyphs that svguest-gift.js needs but app.html's "UI SC" subset lacks.

usage: python svguest-gift-font.py <svguest_repo>
Needs fontTools and brotli (the micromamba python of fonts/build-fonts.py) and fonts/src/NotoSansSC-Regular.otf,
which build-fonts.py downloads. Rewrites the text between /* giftfont:start */ and /* giftfont:end */ in
assets/svguest-gift.js with an extra @font-face for "UI SC" limited (unicode-range) to those characters, so the
gift text uses the interface font, not a system fallback. Rerun after changing the gift module's Chinese text.
"""
import base64, os, re, subprocess, sys, tempfile
from fontTools.ttLib import TTFont

repo = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
js = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'svguest-gift.js')
src = os.path.join(repo, 'fonts', 'src', 'NotoSansSC-Regular.otf')
have = set(TTFont(os.path.join(repo, 'fonts', 'ui-sc.woff2')).getBestCmap())
text = open(js, encoding='utf8').read()
body = re.sub(r'/\* giftfont:start \*/.*?/\* giftfont:end \*/', '', text, flags=re.S)
need = sorted({ord(c) for c in body if 0x2E80 <= ord(c) <= 0x9FFF or 0xFF00 <= ord(c) <= 0xFFEF} - have)
css = ''
if need:
    with tempfile.TemporaryDirectory() as d:
        out = os.path.join(d, 'g.woff2')
        subprocess.run([sys.executable, '-m', 'fontTools.subset', src, '--unicodes=' + ','.join('U+%04X' % u for u in need),
                        '--layout-features=', '--no-hinting', '--no-glyph-names', '--desubroutinize', '--no-notdef-outline',
                        '--name-IDs=1,2,4,6', '--flavor=woff2', '--output-file=' + out], check=True)
        b64 = base64.b64encode(open(out, 'rb').read()).decode()
    css = ('@font-face{font-family:"UI SC";src:url(data:font/woff2;base64,%s) format("woff2");font-display:swap;unicode-range:%s}'
           % (b64, ','.join('U+%04X' % u for u in need)))
new, n = re.subn(r'/\* giftfont:start \*/.*?/\* giftfont:end \*/', lambda m: '/* giftfont:start */' + css + '/* giftfont:end */', text, flags=re.S)
if n != 1:
    sys.exit('markers /* giftfont:start */ … /* giftfont:end */ not found once in ' + js)
open(js, 'w', encoding='utf8').write(new)
print(f'{len(need)} characters added: {"".join(map(chr, need))} ({len(css)} bytes of CSS)')
