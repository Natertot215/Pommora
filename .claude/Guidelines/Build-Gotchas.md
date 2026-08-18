## Build & Run Gotchas

Hard-won environment/toolchain traps. Add entries when a mistake is worth never repeating.

### Running the GUI

- **`ELECTRON_RUN_AS_NODE` must be unset.** This environment exports `ELECTRON_RUN_AS_NODE=1`, which makes the Electron binary run as plain Node — `require('electron')` then returns a path string and the app crashes with `Cannot read properties of undefined (reading 'handle')` plus a `Node.js vX` trailer. Always launch with it stripped:
  `env -u ELECTRON_RUN_AS_NODE TEST_NEXUS_PATH="$HOME/test" ./node_modules/.bin/electron .` (after `npm run build`).
- **`electron-vite dev` mis-launches here** for the same reason (it inherits the env). Prefer building + running the binary directly for a visual check; use `env -u ELECTRON_RUN_AS_NODE … npm run dev` if HMR is needed.
- **`src/main` and `src/preload` need a full dev-process restart.** Neither HMR nor ⌘R reaches them, so a new native menu item, IPC channel, or main-side label change is simply absent until the dev process is restarted. The signature is always a change that appears to have done nothing while the code is already correct — it has cost two rounds on a single feature.
- **Killing the dev wrapper orphans the app.** `pkill -f "electron-vite dev"` takes down the Vite process and leaves its Electron child running, reparented to init. Relaunching then puts a second instance on the same Nexus; three were live at once before this was noticed. Kill the Electron process by pid as well, and confirm with `ps` rather than assuming the wrapper took it.
- **Electron binary may be missing after install** — if `node_modules/electron/path.txt` is absent (postinstall skipped), run `node node_modules/electron/install.js` to download it.
- **Don't auto-launch the GUI from an agent** — verify headlessly (`npm run typecheck && npm run build && npx vitest run`). Only launch when a human will look.
- **CDP-typing into the live editor writes to disk — only ever drive a NEW throwaway page, never an existing one.** The dev app opens `lastNexusPath` = the user's **real Nexus** (`TEST_NEXUS_PATH` only steers tests). Any CM6 change you inject/type fires the debounced autosave → `window.nexus.updatePageBody` → writes the open page's `.md`. **You cannot stub it away:** `window.nexus.*` is a frozen `contextBridge` object, so `window.nexus.updatePageBody = noop` silently no-ops (the assignment error is swallowed, giving a false "sandboxed" signal) and the real save fires. A scratch-typing run on an *existing* page once wiped its body (recovered via `git restore` since the Nexus is a git repo). Driving the editor is a fine way to test — just **create a dedicated test page first** and type into that; never mutate a page that matters. Read-only CDP screenshots of whatever's already on screen are always safe.

### Toolchain

- **CommonJS main/preload** — the package is intentionally NOT `type: module`. Electron's `require('electron')` fails on ESM named imports (`does not provide an export named 'BrowserWindow'`); CJS fixes it and lets the preload stay sandboxed. electron-vite then emits `out/preload/index.js` (referenced from `main/index.ts`).
- **Version pins: Vite 7 + `@vitejs/plugin-react` 5.** Newer plugin-react majors require Vite 8, which electron-vite 5 doesn't peer-support yet. Keep the pin until electron-vite supports Vite 8.
- **TS 6 deprecated `baseUrl`** — use `paths` with `./`-relative targets (no `baseUrl`).
- **Renderer CSS side-effect imports** need `/// <reference types="vite/client" />` (in `src/renderer/src/env.d.ts`).
- **vanilla-extract `*.css.ts` files may ONLY export serializable values** (styles, `styleVariants`, vars). It serializes every export into a virtual CSS module, so exporting a plain **function** throws `serializeVanillaModule` / `stringifyExports` and breaks `build` + `build:showcase`. **typecheck + vitest don't run that serialization**, so it passes the test gate and fails only at build. Put shared helpers (e.g. the chip `tint` recipe) in a plain `.ts` beside the `.css.ts` — the tint helper in the design-system tokens is the standing example.
- **Verify the gate with `&&`; don't `| tail` the final step.** A `;`-chained gate or `cmd | tail` masks the real exit code (tail exits 0 even when `cmd` failed). Run `typecheck && vitest run && build && build:showcase` and confirm `✓ built in` on every step — exit 0 alone is not proof.
- **`biome lint` exits 0 WITH warnings.** Its exit code only reflects errors, so a `$?` check passes a tree carrying lint warnings. Read the output's `Found N warnings` line and expect it absent — the zero-warnings gate lives in the text, not the code.
- **Zod 4's `z.number()` already rejects `Infinity`/`NaN`** where Zod 3 let them through, so a schema that leaned on a hand-rolled finite check no longer needs one.
- **A vanilla-extract THEME-CONTRACT change splits the dev server's brain.** Editing a `createGlobalTheme` contract (even just reordering keys) regenerates its hashed var names, but the dev server keeps serving OTHER modules' compiled CSS against the old hashes — e.g. `theme-vars`' stable-var bridge ends up pointing at vars no rule defines, and every `var(--label-*)` consumer silently falls back to inherited color (everything reads primary). **⌘R does NOT heal it** (the stale transform graph re-serves); only a dev-process restart does. Full builds are immune (one consistent pass). Diagnose in seconds: `getComputedStyle(document.documentElement).getPropertyValue('--label-secondary')` — EMPTY means split-brain.

### Chip Melt — Chromium Dropped-Repaint Family

The chip ×'s label melt sits on a family of Chromium paint-invalidation drops (bisected live, Electron 42 / Chromium 148; nearest open upstream: crbug 331753416). The failure is INVISIBLE to computed-style probes — the style computes, the pixels don't change; only a screenshot catches it. Three laws, each load-bearing in `chip.css.ts` (warning comments mark them):

- **Masks must be STATIC.** Any dynamic `mask-image` change on the chip label's text (none→gradient, stop swap, via `:has()`, sibling selectors, class toggles, or inline styles) computes but never repaints unless the restyle rides an ancestor `:hover`. The melt therefore pre-applies its masks at mount and reveals by OPACITY flips only (crisp text out, pre-masked melt + blur twins in).
- **The flipped element needs its own paint layer** — `chipLabelText` carries `position: relative` or even its opacity flip doesn't repaint.
- **The label must never enter the hover chain on a removable chip** (`pointer-events: none`): if the label/text leaves `:hover` in the same frame the reveal flips, Chromium drops the reveal's repaint. This is also why removable chips have no label hover-scroll. And no opacity TRANSITIONS on the masked twins — a fade's final un-hover frame can strand, leaving a smear on the resting pill.

Re-running the reveal matrix (rest · left hover · center · right-third entered both ways · hover→leave) with screenshots is mandatory for ANY change touching these files. Also beware when CDP-verifying: synthetic hovers lose to Nathan's physical mouse if it's over the window, and the first interaction after an HMR edit can hit a stale DOM — always re-run a negative before believing it.

### Registered Properties & Derived Transitions

**Never transition a property derived from an interpolating variable.** A registered custom property that is animating already carries every value derived from it, so putting a `transition` on the derived property retargets it every frame — the element chases its target and overshoots instead of moving with the driver. Transition the *variable* and let the derived value follow.

This class bit twice in one day and a settled-state pixel diff cannot see it at all; both instances surfaced through live observation and had to be proven frame-by-frame against the driver's own value. `previewTabStrip.css` carries the warning at the site where the tab squeeze rides `--io`.

### Glass / Liquid Glass

- **`backdrop-filter` silently no-ops inside an opacity-transitioned ancestor** — the animated ancestor becomes the element's backdrop root, so the filter samples nothing: computed styles look right, nothing blurs, no error (diagnosed live on the chip ×'s rejected frost strip). Keep any backdrop-filter element OUT of faded/animated wrappers — reveal it with its OWN opacity instead.
- **Apple Liquid Glass over an opaque dark surface reads dark, edge-defined** — not a white-tinted, brightened panel. Presence comes from the two-part edge (bright top specular rim + dark containment edge), low blur (≤ ~6px), minimal saturation. A `brightness()` lift or white fill over flat dark = "too bright / too frosty". The body stays near the main tone.
- **`liquid-dom` (WebGPU) is shelved** — most authentic (real GPU refraction of live DOM) but requires Chrome's experimental `canvas-draw-element` flag (HTML-in-Canvas) and composing the app inside its `LiquidCanvas` scene graph (invasive). Revisit when the API ships unflagged. The current glass is CSS (`.surface-glass` — do not entangle it with app logic; it's the swappable `Surface` seam).
- **The liquid-glass package** is installed but reserved for floating chrome (toolbar pills/popovers) — it's content-sized/centered and can't be a full-height pane.

### Verification & Measurement

- **CDP drives most surfaces but not all of them.** Synthetic clicks work on tabs, rows, and buttons yet never fire `PickerMenu` items — drive those through `el.click()` inside `Runtime.evaluate`. Native Electron menus are OS-level, so CDP can neither screenshot nor operate them: unit-test their pure models and leave the popup itself to a human pass.
- **A CDP-driven drag must pass `buttons: 1` on its move events.** `Input.dispatchMouseEvent` defaults `buttons` to 0, and the gesture skeleton treats a zero-buttons move as a lost release and aborts — a scripted drag then dies on its first move and reads as "drag doesn't work."
- **A non-integer device pixel ratio throws off screenshot clip math.** Capture the full frame and crop it with PIL rather than trusting a clip rectangle.
- **One failed static derivation is the limit for cross-zoom alignment — then measure.** Load the built CSS into headless Chrome over a minimal DOM harness and read `getBoundingClientRect` across a block-zoom sweep, comparing the glyphs users actually see rather than container edges; a drift that *tracks* zoom fingerprints a zoomed-space offset. A live-session screenshot is not evidence while `*.css.ts` changes are in flight, since the stale serve stacks old rules under new.
- **A `$`-leading token inside shell double quotes is an end-of-line anchor.** Sanity-check any grep gate against a token you know is present before trusting a clean exit — and `\'` doesn't escape inside single quotes either.
- **A mechanical sweep across test files needs its own verification pass.** Dry-run the pattern and read what it would touch before letting it write: one regex nearly rewrote `[[Beta]]` wikilinks, and another under-matched a multi-line fixture and failed three steps away from its cause.

### Parallel Write Agents

- **Whole-tree git operations are forbidden in an agent's brief.** `git stash`, `git checkout .`, `git clean`, and `git reset` act on everything, including work the agent cannot see — one `stash --include-untracked` swept three other agents' in-flight files mid-write. An agent needing a clean baseline uses a worktree.
- **Tell each agent the tree is shared and not clean**, or it reports a failing gate as its own problem — or "fixes" a file it doesn't own.

- **A sweep over call sites needs a multiline pattern.** A fixed-string search for a call and its first argument (`entityIcon('space'`) cannot see a call the formatter wrapped, and under-reports by exactly the sites that were long enough to wrap. Use `rg -U --multiline-dotall -o "fn\(\s*'[a-z]+'"` and cross-check against a control count of the bare call.
- **`rg -r` is `--replace`, not recursive.** `rg -rn "pattern" src` silently replaces every match with the literal `n` and drops line numbers, so the output looks like a real result and isn't. ripgrep recurses by default; there is no `-r` to add.
- **A borrowed table heading needs its token scope joined, not its values copied.** `table-tokens.css` scopes every `--heading-*` and `--cell-*` var to the table's own surface. A surface that wears `.table-head` or `.col-header` from elsewhere adds its own class to that selector list; restating the values is the second definition the house rules forbid, and inheriting nothing is silent — an unset custom property with no fallback resolves to its initial value with no error and no lint.

### Running A Second Instance Beside Nathan's Live Session

- **The single-instance lock lives in userData**, so a plain second launch exits immediately against the live dev session — never kill that session. The sandbox recipe: add a temporary `if (process.env.POMMORA_USERDATA) app.setPath('userData', process.env.POMMORA_USERDATA)` line at the very top of `src/main/index.ts` (before the lock is requested), point `POMMORA_USERDATA` at a scratch dir holding its own `pommora.json` (`{"lastNexusPath": "<scratch nexus>"}`), and launch with `env -u ELECTRON_RUN_AS_NODE POMMORA_USERDATA=… npx electron-vite dev -- --remote-debugging-port=9333`. The two instances then coexist with separate configs, locks, and databases. The line is instrumentation: it is added per pass, removed before committing, and grep-verified gone.
- **Drive the sandbox over CDP with `Runtime.evaluate` against `window.nexus.*`** (`awaitPromise` + `returnByValue`); a small Node script over the DevTools websocket is all it takes. Arm counters in-page (e.g. subscribe `onNexusChanged` to count pushes) before the scenario, and read instrumentation logs from the launch's redirected stdout.
