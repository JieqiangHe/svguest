---
name: jh-svguest-release
description: Release a new svguest version (vX.Y.Z): bump the version, rebuild the TBtools plugin, tag, move the release branch that GitHub Pages and www.svguest.online deploy from, and publish the GitHub Release with svguest.plugin and app.html. Use whenever the user asks to release, publish, ship, tag or deploy a new version of svguest, update the live site, or write release notes — even without saying "release".
---

# Releasing svguest

The live sites change only on a release: GitHub Pages (`jieqianghe.github.io/svguest/`) and the EdgeOne Pages mirror (`www.svguest.online`, production environment) both deploy from the `release` branch, root folder. `main` takes every commit; `release` only moves when a version ships. EdgeOne's preview environment (all other branches) has auto-deploy off, so pushes to `main` deploy nowhere.

Order matters: tag before `gh release create` (otherwise gh makes its own tag on the default branch), and move `release` only to a commit that carries the new version.

## 1. Pick the version

Semver from the last tag (`git describe --tags --abbrev=0`): bug fixes → patch, new features → minor, breaking changes to files people saved (SVG attributes, settings) → major. Ask the user if unsure.

## 2. Bump the version (commit to `main`)

The version appears in exactly four places, all the string `vX.Y.Z`:

- `app.html` line 2 (head comment) and the `#mBrand` `title` in the top bar;
- `index.html` line 2 (head comment) and the footer (`svguest vX.Y.Z · © …`).

```bash
old=$(git describe --tags --abbrev=0); new=vX.Y.Z
grep -c "$old" app.html index.html        # expect 2 and 2
sed -i "s/$old/$new/g" app.html index.html # macOS: sed -i ''
grep -c "$new" app.html index.html        # expect 2 and 2
```

The What's new card (`WN` in `app.html` › 01a Data: the hero's chip and tiles picturing the main new feature, its one-line lead, and four more rows of icon path, title and line) shows once on the first start of each version; rewrite its rows for the new version, in user terms, every claim matching the app, and add their Chinese to `ZH` (01b) word for word, or they stay English in Chinese mode. Its version and its release-notes link come from `#mBrand`'s title, so nothing else changes.

The README carries no release steps (the user wants it short); this skill is the only place for them. The plugin has no version field of its own; it carries `app.html`, so rebuild it:

```bash
bash .claude/skills/jh-html-to-tbtools-plugin/scripts/svguest-repack.sh .
unzip -p svguest.plugin svguest/index.html | grep -c "$new"   # expect 2
```

(Java changes since the last release need the full `build.sh` instead; see that skill.) Syntax-check every inline `<script>` of both pages (see CLAUDE.md › Testing), then commit (`svguest vX.Y.Z: …`) and push `main`.

## 3. Tag and move `release`

```bash
git tag -a "$new" -m "svguest $new"
git push origin "$new"
git push origin main:release
git ls-remote origin "refs/tags/$new" refs/heads/release refs/heads/main
```

`release` and the tag's `^{}` must name the same commit. Never force-push `release` backwards without asking: that rolls the live site back.

`release` is permanent: never delete it, and never offer it when cleaning up branches (only `claude/…` and other work branches go). If it is missing, recreate it at the latest tag's commit (`git push origin <tag>^{commit}:refs/heads/release`) and tell the user; the sites keep serving their last build meanwhile, but a rebuild would fail. A GitHub ruleset on `release` with only "Restrict deletions" guards it (not "Restrict updates", which would block step 3).

## 4. Release notes (confirm with the user first)

Draft in English, short, in a file outside the repo (scratchpad), and show it to the user before publishing:

- one sentence on what svguest is (the tagline from README), then `**Live:** https://www.svguest.online`;
- what changed since the last release (`git log --oneline <old>..<new>`), grouped as a few bullets in user terms, not commit messages; the first release listed the main features instead;
- the TBtools plugin: download `svguest.plugin`, TBtools-II › Install Plugin; SVG Chat with TBtools' built-in model needs **TBtools v2.558 or later**, no API key; or the user's own paid ChatGPT plan;
- `app.html` is the whole editor, offline in any modern browser; licence GPL-3.0-or-later.

Every claim must match the app (CLAUDE.md › Cover page has the rules). The notes live on the Release page only: never commit `notes.md`.

## 5. Publish

```bash
gh release create "$new" svguest.plugin app.html --title "svguest $new" --notes-file notes.md --latest
gh release view "$new"
gh api repos/JieqiangHe/svguest/releases/latest --jq .tag_name   # expect $new
rm notes.md; git status                                           # clean
```

Edit notes later with `gh release edit "$new" --notes-file notes.md`.

## 6. Check the sites

- GitHub Pages: `gh api repos/JieqiangHe/svguest/pages` → `source` `{"branch":"release","path":"/"}`, `status` `built`; the cover's footer shows the new version.
- EdgeOne (the user checks; this sandbox can't reach it): console › svguest › 项目概览 shows a new production deployment from `release` at the tagged commit (the 代码源 line may still read `main`; the commit is what counts). If it didn't auto-deploy: 构建部署 › deploy production from `release`.

## In a cloud sandbox (claude.ai/code)

Seen 21 Oct 2026: the proxy lets `git push` of branches through, but refuses tag pushes ("remote end hung up") and the `repos/…/pages` API (403), and `gh` has no valid token. So do steps 1–3 up to `git push origin main:release`, draft the notes, and hand the user the exact commands for the tag push and step 5 to run on their Mac (`/Users/jh/a/proj/svguest`); then verify with `git ls-remote`.

## One-time setup (done for v1.0.0, for reference)

- `.gitattributes` keeps `.claude` and `CLAUDE.md` out of the Release source archives (`export-ignore`).
- Pages source: `gh api -X PUT repos/JieqiangHe/svguest/pages -f "source[branch]=release" -f "source[path]=/"`.
- EdgeOne: 项目设置 › 环境管理 › 生产 › 关联分支 `release`, 自动部署 on.
