---
name: jh-html-to-tbtools-plugin
description: Package an HTML / static web tool as an installable TBtools plugin (.plugin) that runs as a tab in TBtools' built-in JxBrowser. Use this skill whenever the user mentions a TBtools plugin or .plugin file, installing or converting a web page / HTML / single-file tool into TBtools, or embedding a web page in TBtools — even without saying "plugin".
---

# HTML → TBtools plugin

The Java side is a thin shell: it opens the plugin folder's `index.html` via file:// using TBtools' own JxBrowser panel, and replaces three of that browser's callbacks so `<input type=file>` opens a native Open dialog, downloads open a Save dialog and `window.print()` saves a PDF. Bundled scripts:

- `scripts/PluginInject.java`: generic entry class; the plugin name is taken from the plugin folder name — no per-app modification needed. It reaches JxBrowser only by reflection (see Save dialogs and PDF below).
- `scripts/build.sh`: compiles and packages everything into a `.plugin`.
- `scripts/Verify.java`: simulates installation using TBtools' own unzip-and-load code.
- `assets/tbtools-ai.json`: the opt-in for apps that use the TBtools model (see TBtools model bridge below).
- `scripts/Siwc.java`, `assets/siwc.json`: the ChatGPT plan bridge and its opt-in (see ChatGPT plan bridge below).
- `scripts/minisvg-stage.sh`, `assets/minisvg-chatgpt.js`: minisvg only — stages its plugin copy with the ChatGPT option added.

## Environment

Requires JDK 11+ (`javac`, `jar`), `zip`, and the TBtools main jar. Compilation depends on that jar only — no JxBrowser jar needed, because PluginInject calls JxBrowser by reflection.

To tell whether a jar is the main jar: `unzip -l <jar> | grep WebGuiJPanel.class` should find `biocjava/GUIexcutors/WebGuiApp/WebGuiJPanel.class`.

Lookup order:

1. First check `TBtools_JRE1.6.jar` under the TBtools home (the directory containing `.Plugin/`) — this is the path referenced by TBtools' shortcut-generation code.
2. If absent, search the installation directory using the check above.
3. If still not found, ask the user — do not guess.

Without the jar (a cloud sandbox, for instance), compile against a stub `biocjava.GUIexcutors.WebGuiApp.WebGuiJPanel extends JPanel` with a public `(String, boolean)` constructor, and package only the `Plugin/` classes (build.sh accepts the stub's class folder as `<tbtools_jar>`). The bytecode matched a build against the real jar except for javac-version ordering (Oct 2026). `Verify.java` still needs the real jar.

## Workflow

### 1. Staging

Copy the app into a staging directory and make all modifications in the copy; never touch the user's original repo.

- The entry file must be named `index.html`.
- No other `.jar` at the top level: TBtools loads only the first jar it finds, and build.sh errors out on any extra one.
- Dot-prefixed files (`.git`, `.DS_Store`, etc.) are dropped automatically during packaging.
- Everything else in the staging directory is packaged as is. If the app uses the TBtools model (see TBtools model bridge below), copy `assets/tbtools-ai.json` next to `index.html`.
- minisvg: `bash scripts/minisvg-stage.sh <minisvg_repo> <staging_dir>` writes the whole staging directory: `index.html` with `<script src="siwc-session.js">` and `assets/minisvg-chatgpt.js` inlined before `</body>`, `tbtools-ai.json`, `siwc.json` and a placeholder `siwc-session.js`. The repo's `index.html` (GitHub Pages) stays as it is.

### 2. Localizing external dependencies

The page runs under file://, so first list all external links:

```bash
grep -noE '(src|href)="https?://[^"]+"' index.html
```

Then handle each one by type:

- **`<script src>` and stylesheets**: download into `vendor/`, rewrite the reference to a relative path, and drop `integrity` and `crossorigin` from the tag.
  - Why: a file:// page has an opaque origin, so a local load carrying `crossorigin` is blocked by Chromium's CORS, and SRI verification fails with it.
  - If the original tag carried SRI, verify the downloaded file before removing the attributes: `openssl dgst -sha384 -binary <file> | base64` must match the original SRI digest.
  - If the CDN is unreachable, fetch the same file from the npm registry with `npm pack <pkg>@<ver>`.
- **Relative `url()`s inside CDN CSS** (fonts, images): download them as well, keeping the original relative directory layout.
- **Font-service CSS** (e.g. Google Fonts): can stay as is; offline it falls back to system fonts.
- **`<a href>` and `fetch` to remote APIs**: nothing to do.
- **`<script type="module" src>`, `import` of local files, `new Worker('x.js')`**: all blocked under file://. Rewrite as inline or classic scripts; if a remote URL is kept, the plugin only works online — tell the user.

### 3. Packaging

```bash
bash scripts/build.sh <tbtools_jar> <staging_dir> <name> [menu_path]
```

Outputs `./<name>.plugin`. `<name>` determines the plugin folder name, the menu name, and the tab title; it may contain spaces.

`menu_path` is optional and nests the plugin in a submenu; levels are tab-separated, e.g. `$'Graphics\tSVG'` (call from bash).

### 4. Verification

```bash
java -Djava.awt.headless=true -cp <tbtools_jar> scripts/Verify.java <name>.plugin
```

With only the main jar on the classpath, the expected result is `OK: reached WebGuiJPanel, stopped at missing JxBrowser` — plugin structure and class loading have both worked, stopping only at browser creation.

If Playwright or another headless Chromium is available, also open the staged `index.html` via file:// and confirm the console is error-free and all depended-on globals are defined (e.g. `typeof Plotly`).

### 5. Delivery

The `.plugin` is installed through Install Plugin in the TBtools menu. On delivery, tell the user the items under Known limitations below that apply to this app, and ask them to test it themselves — in particular one download (a Save dialog must appear) and, if the app prints, one `window.print()` (a Save dialog for a `.pdf`; check the page size with `pdfinfo`). Hook failures are printed to TBtools' stderr with the prefix `PluginInject:` or as stack traces.

## TBtools plugin mechanics (from decompilation)

- A `.plugin` is just a zip; installation extracts it to `.Plugin/` under the TBtools home. Use forward-slash paths inside the zip so it installs on every platform.
- TBtools loads the first `*.jar` in the plugin folder with a URLClassLoader (parented to TBtools itself), then reflectively invokes `Plugin.PluginInject`. That class needs:
  - a no-arg constructor;
  - `JPanel generatePanel()`;
  - `String getPluginName()`.

  No interface needs implementing, and the jar needs no manifest. Compile with `--release 11`, matching TBtools' class-file version.
- After startup, the menu item shows the folder name; `getPluginName()` is used only once, right after installation.
- `MenuConfig.ini` is read without trimming, so a trailing newline would become part of the menu name — hence build.sh writes it with `printf`.
- Once the plugin panel is added, TBtools calls `pack()`. PluginInject sets a preferredSize; without one the window may shrink to something tiny.
- `biocjava.GUIexcutors.WebGuiApp.WebGuiJPanel(String url, boolean controlMenu)` uses a shared static Engine (`getEngine()`, OFF_SCREEN mode, user data under `.jxbrowser` in the TBtools home) and injects its license itself. With `controlMenu=false` the navigation bar is hidden.
- Uninstall: Ctrl-click the plugin's item in the menu.

## Save dialogs and PDF (how PluginInject hooks the browser)

- `OpenFileCallback` (a file input was clicked): an AWT `FileDialog` in LOAD mode, opened in the last folder used; Open → `tell.open(path)`, Cancel → `tell.cancel()`. Restored Oct 2026 from the bytecode of the jar shipped in minisvg.plugin, whose source had not been committed (method bodies identical to that jar; only javac's lambda numbering differs).

- TBtools' own download callback saves to the system temp directory, shows "Download Finished. Browse It?", and offers to install any `.zip`/`plugin` file as a plugin. JxBrowser 7 cancels every print request unless a `PrintCallback` is set.
- After building `WebGuiJPanel`, PluginInject looks for its `com.teamdev.jxbrowser.browser.Browser`:
  - first via `getBrowser()` on any component in the panel's tree (the Swing `BrowserView`);
  - then in a Browser-typed field of `WebGuiJPanel`;
  - if neither is there yet, again each time the panel is shown.
- It then calls `browser.set(...)` with `java.lang.reflect.Proxy` callbacks; every JxBrowser method is looked up by name at run time, so nothing is compiled against JxBrowser:
  - `StartDownloadCallback`: an AWT `FileDialog` (native on macOS and Windows, GTK on Linux) prefilled with `download().target().suggestedFileName()`, opened in the last folder used; Save → `tell.download(path)`, Cancel → `tell.cancel()`.
  - `PrintCallback`: `tell.print()` (no preview). `PrintHtmlCallback`: a `FileDialog` for a `.pdf`, then `printers().pdfPrinter()` → `printJob().settings()` → `pdfFilePath(path)`, `enablePrintingBackgrounds()`, `disablePrintingHeaderFooter()`, `apply()` → `tell.proceed(pdfPrinter)`.
  - The PDF name comes from the page title: a leading `•`/`*` is dropped, the title is cut at ` — `, ` - ` or ` | `, and a file extension is removed (`• fig.svg — minisvg` → `fig.pdf`; empty → `page.pdf`).
- Fallbacks: an API that is missing or fails leaves TBtools' default for that callback; an exception inside a callback cancels that one request rather than leaving it hanging. `PrintHtmlCallback`/`PdfPrinter` exist from JxBrowser 7.13; on older versions only downloads are hooked and printing stays as TBtools has it.
- If the Browser can't be reached at all with a future TBtools, the alternative is to build your own: set `System.setProperty("jxbrowser.license.key", toolsKit.LicenseHub.GetLicense.getJxBroswerLicense())`, then `WebGuiJPanel.getEngine().newBrowser()` plus `BrowserView.newInstance(browser)`, and close the browser when the tab closes.
- Without TBtools, the hooks can be exercised against mock `WebGuiJPanel`/JxBrowser classes (package-private implementations behind public interfaces, like the real ones) on Xvfb. Xvfb has no window manager, so drive the GTK dialog with `java.awt.Robot` mouse clicks, not keys.

## Chinese punctuation on macOS (input-method commits)

- Reported in TBtools-II on macOS (Oct 2026) with the built-in Pinyin: Chinese characters type fine, but full-width punctuation (，。？) does nothing.
- Cause, from OpenJDK's `AWTView.m` and `CInputMethod.java`: `insertText:` sends text in U+3000–303F or U+FF00–FFEF, or longer than one character, as an `InputMethodEvent` commit through the event queue, and sends no key event. Pinyin syllables come as a composition followed by a commit and work, so JxBrowser's off-screen view apparently drops a commit that no composition preceded. JxBrowser's code could not be checked.
- Fix, on macOS only: once it finds the Browser, PluginInject stores it as the panel's client property (key `PluginInject.class`) and pushes one `EventQueue`. That queue tracks whether a composition is in progress. A commit made while none is, whose source lies inside a plugin panel, is inserted with `focusedFrame()` (else `mainFrame()`) `.executeJavaScript("document.execCommand('insertText',false,'\uXXXX…')")` and is not dispatched. If the script returns anything but true (no editable element has focus) or throws, the event goes on to JxBrowser as before. Windows is left alone: its IME path differs, and the text might arrive twice.
- Tested only with mock classes on Xvfb (Oct 2026). A mock view must return non-null `getInputMethodRequests()`, or it never receives input-method events.

## TBtools model bridge (window.tbtools.ai)

- Source: minisvg PR #19 by CJ-Chen, the TBtools author (Oct 2026). TBtools' side could not be decompiled here, so this is the API as that PR uses it.
- Opt-in: `assets/tbtools-ai.json`, copied next to `index.html` in the plugin folder, declares what the page may use:
  ```json
  {"version": 1, "capabilities": ["chat", "vision"]}
  ```
  `chat` is text chat; `vision` is image understanding. A TBtools build with the bridge then exposes `window.tbtools.ai` to the page.
- Feature-detect it (`window.tbtools&&window.tbtools.ai`) and keep the page's own providers, so it still works in a normal browser. minisvg checks once at startup.
- `chat(messages,{onDelta})`: `messages` are `{role,content}` with string content (system first). `onDelta(s)` receives the whole reply so far, not a delta. Resolves to the full reply.
- `chatImage(prompt,dataUrl,mime)`: one prompt string and one image (`image/png|jpeg|gif|webp`), no streaming. Resolves to the reply. History, attached files and other images must be folded into the prompt.
- Both return a promise carrying `requestId`. `abort(requestId)` stops a request, and its promise rejects with the message `aborted`.
- Other rejections carry a code: `denied`, `busy`, `closed`, `invalid`, `too_many` or `too_large`. minisvg keeps each request within 32,000 characters and 20 messages; treat those as the PR's assumptions, not documented limits.
- No API key is involved. Confirmed working with minisvg in TBtools-II (Oct 2026).

## ChatGPT plan bridge (Sign in with ChatGPT)

- What: lets the page draw with the user's own ChatGPT plan (OpenAI's Sign in with ChatGPT, SIWC; no API key). Asked for by the user, Oct 2026, for TBtools only. SIWC plan usage is open to open-source apps that run on the user's machine and requires a loopback redirect `http://127.0.0.1:<port>/auth/callback`, which a GitHub Pages site can't receive; TBtools runs locally, so the Java side takes the callback.
- Opt-in: `siwc.json` next to `index.html`. `PluginInject.generatePanel()` then calls `Siwc.start(dir)`: one server per class loader on `127.0.0.1` (random port), and `siwc-session.js` in the plugin folder rewritten with `window.TBSIWC={url,key}`. The page loads it with a plain `<script src>`; without the file or the bridge nothing changes.
- Every page request carries `x-siwc-key` (random per server, compared in constant time) and must have `Host: 127.0.0.1:<port>`; CORS allows `*` plus `Access-Control-Allow-Private-Network`. Routes: `GET /siwc/status`, `POST /siwc/login` (returns `{url,opened}`; opens the system browser with `Desktop.browse`, else `open`/`rundll32`/`xdg-open`), `POST /siwc/logout`, `POST /siwc/proxy` (body `host:port`, `socks://host:port` or empty), `GET /siwc/models`, `POST /siwc/responses` (streamed through). `GET /auth/callback` needs no key but the pending `state`. A proxy-style request (`CONNECT`, or an absolute URL) gets `403 minisvg-bridge-not-a-proxy`, so a bridge port typed into some Proxy field names itself in the error.
- OAuth as in OpenAI's DevKit (`packages/local/src/oauth.ts` in github.com/openai/sign-in-with-chatgpt-devkit, read Oct 2026): discovery at `https://auth.openai.com/.well-known/openid-configuration` (endpoints must share the issuer), `client_id=dynamic_agent_client` plus `agent_name_hint=<folder name>` the first time, then the issued `client_id` from the callback; scopes `openid profile email offline_access resource.invoke chatgpt.tokens.use.direct`; `resource=https://api.openai.com/v1`; PKCE S256; nonce. The ID token comes straight from the token endpoint over TLS, so only its nonce and `sub` are checked (no JWKS signature check). Without the `chatgpt.tokens.use.direct` scope the account is signed in but can't draw.
- Tokens: `~/.tbtools-siwc/<folder name>.json` (owner-only where POSIX permissions exist; not encrypted — the DevKit uses the OS keychain). Access tokens last about an hour; the refresh token rotates on every refresh, so it is saved before use. Each bridge re-reads the file when its mtime changes, and before treating a failed refresh as a sign-out, so two tabs (two class loaders) don't spend the same refresh token. Refresh happens 60 s before expiry (not before `earliest_refresh_at`) and once on a 401.
- Network: Java's `HttpURLConnection` (no `java.net.http`, no `jdk.httpserver`, in case TBtools' runtime lacks them). Java doesn't follow the OS proxy by itself, so `detect()` finds the system proxy: `https.proxyHost`/`socksProxyHost` if set (then Java's own selector is used), else `HTTPS_PROXY`/`ALL_PROXY`, else `scutil --proxy` (macOS) or the `Internet Settings` registry key (Windows), re-detected every 30 s. Every call goes through `net(f)`, which tries the Proxy field first and, when that fails to connect or tunnel (`down`: refused, no route, `Unable to tunnel`, SOCKS errors — not timeouts), the system proxy, then reports the fallback in `note`; never direct when the field is set, since the user set it to avoid a direct connection. `why` turns connection failures into one sentence naming the proxy and what to do. `/siwc/proxy` rejects text that isn't `host:port` and the bridge's own port, then `probe()` fetches the discovery document through the chosen proxy alone and puts "OpenAI reached through …" or the error in `ptest`; the page shows the fallback `note`, else `ptest` once the field was changed in this page, else (with the field set) the system proxy under the field, and nothing when there is nothing to report; the placeholder names the system proxy. Layout (compacted at the user's request, Oct 2026): the ChatGPT row is one line, a status dot (green signed in, amber signing in or plan usage off) with the account or "Not signed in" and a Sign in button (`#mGptIn`); a small second line "N models · Sign out" or "Finish in your web browser · Sign in again" (link `#mGptOut`); a third line only for messages and errors. When Read images with and Draw with name the same model, the route sentence is shortened to "X reads images and draws." (a `cfgSync` wrapper; the web version keeps the long form). The Proxy row's tooltip, flagged by a small ? after the label, (asked for by the user, Oct 2026) says when to leave it empty (a proxy app that changes port at each start, TUN or enhanced mode) and where to find the port: the proxy app's Port/Mixed port with common defaults, macOS System Settings › Network › Details › Proxies, Windows Settings › Network & internet › Proxy. Like the GLM/DeepSeek key rows, the ChatGPT and Proxy rows show only while a ChatGPT model is chosen. Asked for after the user saw "Unable to tunnel through proxy. Proxy returns \"HTTP/1.1 403 Error\"" with `http://127.0.0.1:53170` in the field on a second sign-in (Oct 2026): that status line is the bridge's own refusal, so the port most likely belonged to a bridge; unconfirmed.
- Page side (`minisvg-chatgpt.js`): overrides minisvg's global `call` and `ask` and adds options to its dropdowns, so `index.html` needs no change. Requests use the Responses API: system messages become `instructions`, image parts `input_image` data URLs, `store:false`, `stream:true`, `reasoning:{effort,summary:'auto'}` (Low/High/Max → low/high/xhigh), no `max_output_tokens`, `temperature` or `previous_response_id`. A 400 that names reasoning/summary/effort is retried without the summary, then without reasoning. Events read: `response.output_text.delta`, `response.reasoning_summary_text.delta`, `response.completed`/`incomplete` (usage mapped to minisvg's Chat Completions shape), `response.failed`, `error`. Models come from `GET /v1/models` (`{models:[{slug,display_name,visibility,context_window?}]}`, only `visibility:list`), cached in `msbGptModels`; all are treated as able to see images.
- Testing without OpenAI: `-Dsiwc.issuer=http://127.0.0.1:<p>` and `-Dsiwc.api=http://127.0.0.1:<p>/v1` point the bridge at a mock. Oct 2026, cloud: a Node mock of discovery/authorize/token/revoke/models/responses, the bridge started from a test `main`, and the staged page in headless Chromium over file:// — 38 checks (sign-in through the shown link, model list, streamed SVG landing on the canvas, thinking text, usage, the 400 retry, 401 → refresh → retry, image input, xhigh, proxy errors, reload, sign-out with revocation, no option without the bridge), plus two bridges sharing one token file and the key/Host/state guards, and 16 proxy cases (a bridge port in the field over real HTTPS CONNECT, own port and junk refused, a dead field proxy with and without a system proxy — the fallback through a small Node forward proxy given as `HTTPS_PROXY` — and sign-out then sign-in). A built plugin was loaded through its own URLClassLoader like TBtools does.

## Known limitations

- **Downloads**: `<a download>`, Blob and `Plotly.downloadImage` downloads open a Save dialog (see above). Confirmed in TBtools-II on macOS (Oct 2026).
- **Printing**: `window.print()` saves a PDF through JxBrowser's PDF printer; it never reaches a paper printer and shows no preview. Requires JxBrowser 7.13+. Confirmed in TBtools-II on macOS (Oct 2026); still check each app's page size and margins with `pdfinfo`.
- **Chinese punctuation (macOS)**: fixed as described above, not yet confirmed in TBtools. Pinyin's “ ” ‘ ’ and · lie outside those blocks, so Java sends them as ordinary key events; what JxBrowser makes of them is untested.
- **Drag-and-drop**: dragging files in from a file manager is unverified in OFF_SCREEN mode.
- **Ctrl/Cmd+A selects the whole page**: reported in TBtools-II on macOS (Oct 2026). JxBrowser runs the browser's own Select All even when the page's `keydown` handler takes Ctrl/Cmd+A and calls `preventDefault()`, so every label and button in the app's interface gets highlighted. Fix it in the page, not in Java. The Select All command fires a cancelable `selectstart` first, so cancel it when it starts outside editable elements, and if no pointer is down it was a select-all command, so run the app's own select-all there:
  ```js
  let down=0;addEventListener('pointerdown',()=>down=1,true);addEventListener('pointerup',()=>down=0,true);
  document.addEventListener('selectstart',e=>{const t=e.target.nodeType===1?e.target:e.target.parentElement;
    if(!t||t.closest('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]'))return;
    e.preventDefault();down||appSelectAll()});
  ```
  `document.execCommand('selectAll')` reproduces the problem in any Chromium for testing. Applied in minisvg; not yet confirmed inside TBtools.
- **ChatGPT plan**: confirmed working in TBtools-II by the user (Oct 2026), so JxBrowser lets the file:// page reach the bridge and the loopback callback works. Which parts were exercised wasn't said: whether the plan route accepts images, `reasoning.summary` and `xhigh`, and the proxy fallback are confirmed only against a mock. Needs an eligible ChatGPT account (Plus or Pro, per OpenAI) and a network that reaches OpenAI. Tokens sit unencrypted in the user's home folder.
- **TBtools model**: works only in TBtools builds that provide `window.tbtools.ai`, and only with `tbtools-ai.json` in the plugin. Confirmed with minisvg in TBtools-II (Oct 2026).
- **localStorage**: data lives in TBtools' shared `.jxbrowser` directory. All file:// pages share one origin and can read each other's data — if the app stores an API key there, tell the user.
- **Do not load the page from a data: URL**: its origin is opaque and localStorage access throws SecurityError.
- **Updates**: if only `index.html` changed and dependencies need no re-localization, replace `.Plugin/<name>/index.html` in place; otherwise rebuild.
- **Version compatibility**: the plugin depends on the single constructor `WebGuiJPanel(String, boolean)`. If loading breaks after a TBtools upgrade, first check that this class still exists. If downloads fall back to the temp directory, check stderr for `PluginInject:` lines and the JxBrowser jar version in the TBtools installation directory.
