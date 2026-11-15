#!/usr/bin/env python3
"""Build the interface's embedded fonts for svguest (app.html).

Two open-licensed Regular fonts (SIL OFL 1.1), subset to what the interface
needs and inlined as base64 woff2 between the /* fonts:start */ … /* fonts:end */
markers in ../app.html, so the single-file app (and the TBtools plugin staged
from it) renders the same UI on every platform. Canvas text, drawings and
exports are never affected (#mStage resets the font).

  English  JetBrains Mono 2.304  → family "UI Mono": ASCII, Latin-1, dashes/quotes,
                                  arrows, ×, plus every other symbol in app.html the
                                  font has (▾ › ✓ ⌘ …), found by the scan below.
  Chinese  Noto Sans SC 2.004    → family "UI SC": every CJK ideograph found in
                                  app.html (the ZH map) + CJK punctuation ranges
                                  U+3000-303F and U+FF00-FFEF + symbols only it has
                                  (⇄). What neither source has (↻, ✎) stays system.

Run after changing interface copy:  python3 fonts/build-fonts.py
Sources are downloaded once into fonts/src/ (gitignored); reruns are offline.
"""
import base64, io, os, re, subprocess, sys, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
APP = os.path.join(ROOT, "app.html")
SRC = os.path.join(HERE, "src")

JB_URL = "https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip"
JB_TTF = "fonts/ttf/JetBrainsMono-Regular.ttf"  # inside the zip
NO_URL = "https://github.com/notofonts/noto-cjk/raw/Sans2.004/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf"
OFL = [
    ("OFL-JetBrainsMono.txt", "https://raw.githubusercontent.com/JetBrains/JetBrainsMono/v2.304/OFL.txt"),
    ("OFL-NotoSansSC.txt", "https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/LICENSE"),
]

EN_UNI = "U+0020-007E,U+00A0-00FF,U+2013-2026,U+2190-2193,U+00D7"
PUNCT = "U+3000-303F,U+FF00-FFEF"
START, END = "/* fonts:start */", "/* fonts:end */"

# Extra symbols the interface actually shows (▾ › ⇧ ↻ ✎ …) or may show in messages
# (Greek letters, math). The scan below collects every non-CJK character in app.html outside
# comments and the font block; JetBrains Mono takes all it has, Noto Sans SC the rest it has.
# What neither font has (↻, ✎, ↵ in 2026-11) falls to the system font — reported below.

# Shared subset flags: drop hinting, glyph names, OpenType features (no ligatures
# — the CSS also sets font-variant-ligatures:none) and spare name records; woff2.
FLAGS = ["--layout-features=", "--no-hinting", "--no-glyph-names", "--desubroutinize",
         "--no-notdef-outline", "--name-IDs=1,2,4,6", "--flavor=woff2"]


def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    print(f"downloading {url}")
    with urllib.request.urlopen(url) as r, open(path + ".part", "wb") as f:
        f.write(r.read())
    os.replace(path + ".part", path)
    return path


def subset(ttf, unicodes, out):
    cmd = [sys.executable, "-m", "fontTools.subset", ttf, f"--unicodes={unicodes}",
           f"--output-file={out}"] + FLAGS
    subprocess.run(cmd, check=True)
    from fontTools.ttLib import TTFont
    n = len(TTFont(out).getGlyphOrder()) - 1  # minus .notdef
    kb = os.path.getsize(out) / 1024
    print(f"{os.path.basename(out):34s} {n:4d} glyphs  {kb:6.1f} KB")
    return out


def unicode_set(chars):
    return ",".join(f"U+{ord(c):04X}" for c in sorted(set(chars)))


def main():
    os.makedirs(SRC, exist_ok=True)
    zip_path = os.path.join(SRC, "JetBrainsMono-2.304.zip")
    fetch(JB_URL, zip_path)
    with zipfile.ZipFile(zip_path) as z:
        data = z.read(JB_TTF)
    jb = os.path.join(SRC, "JetBrainsMono-Regular.ttf")
    open(jb, "wb").write(data)
    no = fetch(NO_URL, os.path.join(SRC, "NotoSansSC-Regular.otf"))
    for name, url in OFL:  # licence texts, committed; download only if missing
        fetch(url, os.path.join(HERE, name))

    html = open(APP, encoding="utf-8").read()
    body = re.sub(re.escape(START) + r".*?" + re.escape(END), "", html, flags=re.S)
    body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
    body = re.sub(r"//[^\n]*", "", body)
    cjk = sorted({c for c in body if 0x3400 <= ord(c) <= 0x9FFF})
    if not cjk:
        sys.exit("no CJK characters found in app.html?")
    from fontTools.ttLib import TTFont
    jbmap, nomap = TTFont(jb).getBestCmap(), TTFont(no).getBestCmap()
    base = set(chr(c) for r in EN_UNI.split(",") for c in range(int(r[2:6], 16), int(r[7:13] or r[2:6], 16) + 1))
    sym = {c for c in body if ord(c) > 127 and c not in base and not (0x3400 <= ord(c) <= 0x9FFF)
           and not (0x3000 <= ord(c) <= 0x303F) and not (0xFF00 <= ord(c) <= 0xFFEF)}
    en_syms = sorted(c for c in sym if ord(c) in jbmap)
    zh_syms = sorted(c for c in sym if ord(c) not in jbmap and ord(c) in nomap)
    neither = "".join(c for c in sorted(sym) if c not in en_syms and c not in zh_syms)
    print(f"app.html: {len(cjk)} CJK ideographs + {PUNCT} + {len(en_syms)}/{len(zh_syms)} symbols (Mono/Noto)")
    if neither:
        print(f"falls to the system font (in neither source): {' '.join(f'{c} U+{ord(c):04X}' for c in neither)}")

    en = subset(jb, EN_UNI + "," + unicode_set(en_syms), os.path.join(HERE, "ui-mono.woff2"))
    zh = subset(no, unicode_set(cjk) + "," + PUNCT + "," + unicode_set(zh_syms), os.path.join(HERE, "ui-sc.woff2"))

    b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
    block = (
        f'{START}\n'
        f'@font-face{{font-family:"UI Mono";src:url(data:font/woff2;base64,{b64(en)}) format("woff2");font-display:swap}}\n'
        f'@font-face{{font-family:"UI SC";src:url(data:font/woff2;base64,{b64(zh)}) format("woff2");font-display:swap}}\n'
        f'{END}')
    if START not in html or END not in html:
        sys.exit(f"markers {START} … {END} not found in app.html")
    new = re.sub(re.escape(START) + r".*?" + re.escape(END),
                 lambda m: block, html, count=1, flags=re.S)
    open(APP, "w", encoding="utf-8").write(new)
    grew = (len(new) - len(html)) / 1024
    print(f"app.html: {len(html)/1024:.0f} KB → {len(new)/1024:.0f} KB  ({grew:+.0f} KB)")


if __name__ == "__main__":
    main()
