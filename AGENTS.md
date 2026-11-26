# AGENTS.md

This file provides guidance to coding agents working in this repository.

`CLAUDE.md` in the same directory is the same guidance in long form: every rule below, with its date, the measurements behind it and the history of what was tried and dropped. Read the matching section there before a non-trivial change — it is 226 KB, so grep it rather than reading it whole.

## What this repository is

svguest, a one-file SVG editor for touching up ggplot2/svglite/Inkscape figures.

- `app.html` — the whole editor (1.28 MB: CSS, JS and two base64 fonts inline). This is the product.
- `index.html` — the cover page (static, English only, not shipped in the plugin).
- `svguest.plugin` — TBtools plugin; it carries its own copy of `app.html` as `svguest/index.html`.
- `fonts/` — `build-fonts.py`, the two subset woff2 files and their SIL OFL texts. `fonts/src/` holds the downloaded originals and is gitignored.
- `logo.svg` / `logo-dark.svg`, `tbtools.svg`, `bioanno.svg`, `story.mp4`, `README.md`, `LICENSE`, `CLAUDE.md`.
- Live at https://www.svguest.online and https://jieqianghe.github.io/svguest/, both deployed from the `release` branch, which moves only when a version ships.

There is no build step, no package manager, no bundler and no test suite in the repo. Do not add one.

## Commands

Syntax-check every inline `<script>` of both pages (the only check that must pass before any commit):

```bash
~/.local/share/mamba/envs/nodejs_26.13.0/bin/node -e '
const fs=require("fs");
for(const f of ["app.html","index.html"]){
 const b=[...fs.readFileSync(f,"utf8").matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(t=>t.trim());
 b.forEach((x,i)=>{try{new Function(x)}catch(e){console.log("FAIL",f,i,e.message);process.exit(1)}});
 console.log(f, b.length, "blocks OK");
}'
```

Rebuild the plugin after **every** `app.html` change (keeps `svguest.jar`, needs no JDK):

```bash
bash .claude/skills/jh-html-to-tbtools-plugin/scripts/svguest-repack.sh .
unzip -p svguest.plugin svguest/index.html | grep -c "vX.Y.Z"   # expect 2
```

Java-side changes instead need `build.sh` from that skill (JDK from micromamba `openjdk_25.0.2` plus the TBtools main jar; if the jar is absent, use the skill's stub path).

Rebuild the embedded interface fonts after changing any interface copy:

```bash
~/.local/share/mamba/envs/python_3.14.7/bin/python fonts/build-fonts.py
```

(That interpreter has `fonttools` and `brotli`; the system `python3` does not.)

Release: follow `.claude/skills/jh-svguest-release/SKILL.md` step by step. `gh` is at `~/.local/share/mamba/envs/gh_2.102.0/bin/gh` and already logged in.

Push with SSH; HTTPS auth fails here: `git push git@github.com:JieqiangHe/svguest.git HEAD`.

## Verification in practice

There is no test command. Verification means headless Chromium scripts kept **outside** the repo (a scratchpad under `/tmp`), and they are thrown away afterwards.

Playwright is already installed in micromamba, with its Chromium downloaded — do not `npm i` anything and do not run `playwright install`:

```bash
PW=~/.local/share/mamba/envs/playwright_1.65.1
NODE=~/.local/share/mamba/envs/nodejs_26.13.0/bin/node
$NODE -e "const {chromium}=require('$PW/lib/node_modules/playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2,colorScheme:'dark'});await p.goto('file://$PWD/app.html');await p.screenshot({path:'/tmp/shot.png'});await b.close()})()"
```

`$PW/bin/playwright --version` says 1.65.1; the browser lives in `~/Library/Caches/ms-playwright/chromium_headless_shell-1255`. On the app's `file://` origin `localStorage` works, which is how the release images are set up: write `sgTheme`, `sgLang`, `sgSeen` (and omit `sgSeen` to make the What's new card open) with `page.evaluate`, then `page.reload()`; `colorScheme:'dark'` is followed when no `sgTheme` is saved. Element screenshots (`locator('#mWn').screenshot({omitBackground:true})`) give the card alone.

What every change should be checked against (all established practice, see CLAUDE.md › Testing):

- Untouched elements must serialise **byte-identically**; run the same scripted edit sequence on the old and new `app.html` and `cmp` the exported SVG.
- Every `data-a` action, with several kinds of selection, undone back to the original.
- Seeded fuzz runs (random clicks, drags, menus) with undo-all = original and redo-all = final.
- Pages must load offline with zero network requests (`page.route` aborting everything but `file:`).
- Only headless Chromium is available here. Safari, Firefox and real TBtools are explicitly untested in most notes — say so rather than implying coverage.

## Code conventions in app.html

- One statement per line. A function body of more than three statements is spread over several lines. No `&&`, `||` or comma chains for side effects — use `if`.
- Numbered sections: JS uses `// ══ NN Name ════`, CSS `/* ══ NN Name ══ */`, HTML `<!-- ══ NN Name ══ -->` (HTML only between `<body>`'s children, since the code reads `firstChild`/`lastChild`). A new feature gets its own section plus a line in the contents list after `'use strict'`; inserting between two takes a letter (`12a`).
- New globals are declared at the head of their section with a short comment, never after load-time code that reaches them (TDZ).
- Plain constant data (prompts, icons, labels, font names) goes in `01a Data`; static markup the code fills in goes in a `<template>`.
- Dense one-liner style, but a subsystem carries a short `// ──` comment explaining why it is designed that way, not a line-by-line narration.
- Do not refactor or rewrite old code unasked; bring it in line only where you are already changing it.
- Check for global name collisions before adding a helper (a helper named `pick` once broke selection's `pick()`).

## Performance and rendering traps (all measured, see CLAUDE.md › Speed)

- Never spread or `for…of` a big `children` collection inside a loop that also mutates the DOM: its length is recounted every time (this made Ungroup all quadratic). Walk siblings with `fk(f,p)`.
- Never put an inherited custom property on `#mStage` or above the drawing; changing one restyles every element.
- Never put `will-change` or another compositing trigger permanently inside `#mStage` (Safari blurs the drawing when zoomed).
- `:where(...)` has zero specificity and loses to the app's own `input,select{font:inherit}`; write the plain selector when the rule must win.
- Hot paths must not `querySelector` document-wide (the drawing precedes the panels in the DOM); use `qa()`, `MENUS`, `#mTools`, `#mFS`.

## Interface text, Chinese, fonts

- English is the source language. Chinese comes only through the `ZH` map in `01b Language`, keyed by the exact trimmed English string; changing an English UI string without updating its `ZH` key leaves it English in Chinese mode.
- `lgDom()` swaps text and `title`/`placeholder`/`aria-label` once and keeps originals, so switching back is exact. `LGX` lists what is skipped (drawings, chats, Layers rows, tabs, user text).
- Keep ASCII shortcut forms like `(Ctrl+X)` in Chinese titles; the command palette parses shortcuts from them.
- The README and the cover page stay English only.
- The interface fonts are embedded: `UI Sans` (Inter) for Latin, `UI SC` (Noto Sans SC) for Chinese, inlined as base64 between `/* fonts:start */` and `/* fonts:end */` in `app.html`, written by `fonts/build-fonts.py`, which scans `app.html` for the characters to keep (701 CJK ideographs plus CJK punctuation ranges, and every symbol the two source fonts have). Add new interface copy, then rerun the script.
- `#mStage` resets the font, so canvas text, SVG files and exports are never affected by interface fonts. Never rely on the interface stack for anything that is exported.
- View › Language › English font / Chinese font still override the embedded font per language; `ufApply` writes the stack into `#mUF`.
- **To fix in a later PATCH (agreed 17 Nov 2026; remove this note once fixed)**: undo/redo menu titles that `bar()` rewrites (`qa('undo').firstChild.data='Undo'+step name`, Edit › Undo/Redo) stay English in Chinese mode — `lgDom()` translates once and these nodes are rewritten afterwards. Every step name is affected (Background colour, Move, Nudge…). The mechanism is already there: `lgTx`'s guard (`n._o!==undefined&&n.data!==n._z` → reset) exists precisely for externally rewritten nodes, so the fix is to run `lgTx` on those two text nodes after `bar()` writes them (switching back to English must keep working), add `ZH` entries for the step names themselves, and check `hiL()`'s Edit › History rows for the same gap. Status messages (`#mMsg`, in `LGX`) are untranslated on purpose — leave them.

## Versioning and release

- MAJOR.MINOR.PATCH: PATCH for fixes, wording and styling that leave how people work unchanged; MINOR for new features or a changed way of working (a What's new card means MINOR); MAJOR only when files, settings or the plugin saved before stop working. A release takes the highest level among its changes.
- The version string appears in exactly four places: `app.html` head comment and the `#mBrand` `title`; `index.html` head comment and the footer.
- The What's new card (`WN` in `01a Data`) is shown once per minor version; rewrite its chip, lead and four rows for each release, and add their Chinese to `ZH` word for word.
- The card belongs to its minor version: **never edit `WN` or its hero for a PATCH**. If the card must change soon after its minor release (v1.9.0's did on 17 Nov 2026), ask the user first — the clean fix is to fold it into that same version (delete the release and tag, re-tag the corrected commit, move `release` forward, re-publish), not to ship a patch carrying a new card.
- When you redraw the What's new hero (`#mWnG`), check that the chip (`#mWnC`, top left) still clears the picture: the hero's height must leave a visible gap under the chip, as v1.7's 104 px grid does. v1.8.0 first shipped a 118 px layout picture whose frame ran 8.8 px up under "NEW · YOUR OWN LAYOUT" (the user caught it, 16 Nov 2026); it was cut back to 104 px. Before release, screenshot `#mWn` in EN and ZH, dark and light, and measure the chip's bottom against the hero's top (≥ 4 px), at 1100 px and at the small-screen width.
- The hero must be an animation, not a static picture (the user's standing preference, 17 Nov 2026: "卡片能不能和以前有个版本一个动态的"). It should show the feature working in a small loop: v1.3's number fields blinked a caret and slid a drag handle, v1.10's paper card walks the selection ring through the swatches while the page beside takes each colour (`wnPs`/`wnPp`, 6.5 s cycle, per-element `animation-delay` phases — beware: keyframe percentages are of the whole cycle, not of a phase). CSS keyframes only, add every moving part to the `prefers-reduced-motion:reduce` block with a sensible static fallback, and verify the loop against the DOM timeline (ring and effect in step) plus pixel checks per phase. Screenshots of an animated card must be synced to a chosen phase via the animation's `currentTime`, never taken at a random moment.
- Release order: bump, rebuild the plugin, syntax-check, commit to `main`, `git tag -a vX.Y.Z`, push the tag, `git push origin main:release`, then `gh release create vX.Y.Z app_vX.Y.Z.html svguest_vX.Y.Z.plugin`. Tag before `gh release create`, or gh makes its own tag.
- Release assets carry the version, the repo files don't: in the repo keep `app.html` and `svguest.plugin` as they are; for `gh release create` copy them to `app_vX.Y.Z.html` and `svguest_vX.Y.Z.plugin` (e.g. `app_v1.8.0.html`, `svguest_v1.8.0.plugin`; the user's rule, 16 Nov 2026) and name those in the release notes.
- **Never delete the `release` branch** — it is the source of both sites. Work branches (`claude/…`, `codex/…`) may be deleted.
- After a MINOR release the user wants two images, both dark: the What's new card alone in English (`whatsnew-en-dark.png`, 1100×820 at DPR 2, `omitBackground`), and a Chinese long-form page rendered as JPEG (820 CSS px at DPR 2, `svguest-X.Y-<feature>-dark.jpg`). Details in CLAUDE.md › Release images.
- `.gitattributes` marks `.claude` and `CLAUDE.md` as `export-ignore`; add `AGENTS.md` there too.

## Plugin-only gift codes

- The TBtools plugin build adds gift codes to SVG Chat (`.claude/skills/jh-html-to-tbtools-plugin/assets/svguest-gift.js`, inlined by `svguest-stage.sh`). `app.html` must never contain gift code; the public site has none. Details in that skill's SKILL.md › Gift codes; the Worker it calls lives outside this repo.
- Never put the AI service's address or any key in the repo: the module knows only the Worker's URL (`GIFT_API`).

## Rules that are easy to break

- No dependencies, no CDN, no frameworks, no build files and no extra folders. The app must work offline as a static file.
- Nothing is uploaded; only what the user sends to SVG Chat leaves the computer. Do not add analytics.
- Commit and push straight to `main`; do not create branches or PRs unless asked.
- `app.html` is the product and `svguest.plugin` carries a copy of it — a change to one without the other is a bug.
- Every claim on the cover page and in the README must match what the app actually does.
- Keep the README short: title image, quote, description ending "Nothing is uploaded.", the Live line, the TBtools note, The name, Using others' graphics.
- Do not bring back features that were removed at the user's request (Watermark check, edit record, Modern look, celebration animation); their reasons are in CLAUDE.md. Do not add migration code for the old minisvg `msb` prefix either.

## Preferences in localStorage (name → meaning)

`sgTheme`, `sgRulers`, `sgGrid`, `sgTouch`, `sgRecent`, `sgLayout` and `sgFloat` (v1.8; they replaced `sgShut`, `sgProps` and `sgChat`, migrated once), `sgChatList`, `sgAuto`, `sgDocs`, `sgDocCrash`, `sgFkTpl`, `sgFkPal`, `sgFkSeen`, `sgFkMore`, `sgSeen`, `sgCpRec`, `sgCpPal`, `sgCpMd`, `sgUiEn`, `sgUiZh`, `sgLangNote`, `sgLang`, `sgLib*`, `sgDraw`, `sgVis`, `sgThink`, `sgThinkR`, `sg<Glm|Ds>{Key,Ep}`, `sgGlmRelay`. IndexedDB: `sgDocs`, `sgChats`, `sgLib`, `sgDir`. Full meanings in CLAUDE.md › Preferences.
