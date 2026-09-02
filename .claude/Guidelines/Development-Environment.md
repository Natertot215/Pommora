## Development Environment

How to run, test, and not break the app while working on it. For how the app itself works, the Feature docs (`.claude/Features/`) are the reference; this is the operational layer. Sibling guidelines: [[Editor-Internals]] (MarkdownPM internals), [[Web-Guests]] (the webview guest), [[Dependencies]] (the library catalog + distribution).

### Running the GUI

- **`ELECTRON_RUN_AS_NODE` must be unset.** This env exports it as `1`, which makes Electron run as plain Node — `require('electron')` returns a path string and the app crashes. Launch with `env -u ELECTRON_RUN_AS_NODE npm run dev` (HMR) or `… ./node_modules/.bin/electron .` after `npm run build`. `TEST_NEXUS_PATH` only steers tests, never the running app.
- **`src/main` and `src/preload` don't hot-reload.** Neither HMR nor ⌘R reaches them, so a new native menu, IPC channel, or main-side change is absent until the dev process restarts — and a stale main answering the renderer's new request reads as a fresh regression.
- **Killing the dev wrapper orphans the app.** `pkill -f "electron-vite dev"` leaves the Electron child running, reparented to init; kill it by pid and confirm with `ps`, or a relaunch stacks a second instance on the same Nexus.
- **Worktree Electron binary:** a worktree's `node_modules` is often installed for the Vitest gate only and omits the Electron binary, so the first launch dies with `Error: Electron uninstall` — run `./node_modules/.bin/electron --version` once to download it. Kill test instances when done.
- **Don't auto-launch the GUI** — verify headlessly (`npm run typecheck && npm run build && npx vitest run`); launch only when a human will look.
- **CDP-typing into the live editor writes to disk.** The dev app opens the user's real Nexus, and any CM6 change you inject fires the debounced autosave → writes the page's `.md`; `window.nexus.*` is a frozen contextBridge object you cannot stub. Drive a NEW throwaway page, never an existing one. Read-only CDP screenshots are always safe.

### Toolchain

- **CommonJS main/preload** — the package is intentionally not `type: module`; Electron's `require('electron')` fails on ESM named imports, and CJS keeps the preload sandboxed.
- **Version pins: Vite 7 + `@vitejs/plugin-react` 5** — newer plugin-react needs Vite 8, which electron-vite 5 doesn't support yet.
- **vanilla-extract `*.css.ts` may only export serializable values** (styles, variants, vars). A plain-function export throws at `build`/`build:showcase` but passes typecheck + vitest, so it fails only at build — put shared helpers in a plain `.ts` beside the `.css.ts`.
- **A theme-contract change splits the dev server's brain.** Editing a `createGlobalTheme` contract regenerates its hashed var names while the dev server keeps serving other modules' CSS against the old hashes, so `var(--label-*)` consumers silently fall back to inherited color. ⌘R doesn't heal it — restart the dev process. Diagnose: `getComputedStyle(document.documentElement).getPropertyValue('--label-secondary')` empty = split-brain. (Deleting a token from `color.css.ts` shifts every later var hash the same way.)
- **Never transition a property derived from an interpolating variable** — the derived value retargets every frame and overshoots; transition the *variable* and let the derived value follow.

### Gates & Verification

- **The gates:** `npm run typecheck` (the only type gate — the build strips types unchecked — covering both tsconfig projects), `npm run test` (Vitest), `npm run lint` (`biome check`), `npm run build` / `build:showcase`. Formatting is Biome's — a PostToolUse hook formats every TS/CSS/JSON write (single-quote, no semicolons), so never hand-align; a shell-driven edit bypasses the hook (which is why the gate checks it), and `npm run format` repairs one.
- **Verify with `&&`, don't `| tail` the final step** — a pipe or `;`-chain masks the real exit code (tail exits 0 even on failure); confirm `✓ built in` on every build step.
- **Biome's `noDuplicateTestHooks` flags any test-file local named `before` or `after`** — a helper named that way reads as a hook to the linter; name it for what it does.
- **`biome lint` exits 0 WITH warnings** — read the `Found N warnings` line; the zero-warnings gate lives in the text, not the exit code.
- **CDP drives most surfaces but not all** — synthetic clicks work on tabs/rows/buttons but never fire `PickerMenu` items (drive those with `el.click()` inside `Runtime.evaluate`); native Electron menus are OS-level, so unit-test their models and leave the popup to a human. A CDP drag must pass `buttons: 1` on its move events or it aborts on the first move.
- **Measure the built CSS in headless Chrome** after one failed static derivation for cross-zoom alignment: read `getBoundingClientRect` across a zoom sweep, comparing the glyphs users see rather than container edges. A live screenshot isn't evidence while `*.css.ts` changes are in flight (the stale serve stacks old rules under new).
- **A Features doc's on-disk examples are claims, not evidence** — a format line in a doc was written against a belief about the writer; verify a serialized shape against a real file in the vault or against the serializer itself before designing around it, and audit value shapes type by type rather than key names alone.
- **A mechanical sweep verifies before it writes** — dry-run the pattern and read what it would touch. A token sweep must match Biome's wrapped form (`rg -U "var\(\s*--name"`), and one undefined var in a comma list (box-shadow, transition) silently voids the whole declaration. `rg -r` is `--replace`, not recursive.

### Parallel Write Agents

- **Commit as soon as a gate is green.** A parallel session's commit-and-revert on the same tree rolls back every uncommitted edit inside its scope; stage explicit paths, never a directory, and attribute a surprise failure to the other session's dirty set before your own.
- **The commit hook's ledger amend swallows whatever the index holds** — a peer session's staged files ride your commit. Check `git status` for foreign staged paths before every commit, and stage only your own.
- **Whole-tree git operations are forbidden** — `git stash` / `checkout .` / `clean` / `reset` act on everything, including other agents' in-flight files; an agent needing a clean baseline uses a worktree. Tell each agent the tree is shared and not clean.
- **A store slice imports nothing that imports `store.ts`** — the composition root calls each `create*Slice` at module scope, so a cycle (reachable through a stylesheet's imports) throws `create…Slice is not a function` at boot while the suite still passes (tests enter at `store.ts`). What a slice needs of a hook module moves to a store-free module beside it.
- **Running a second instance beside the live session:** the single-instance lock lives in userData, so set `app.setPath('userData', …)` from a `POMMORA_USERDATA` env at the top of `src/main/index.ts` (instrumentation — removed before committing, grep-verified gone), point it at a scratch dir with its own `pommora.json`, and launch with `--remote-debugging-port=9333`; drive it over CDP with `Runtime.evaluate` against `window.nexus.*`.

### Data-Layer Traps

- **A test nexus without `.nexus/nexus.json` is raw mode** — the walk ignores every sidecar, so a Collection's assignments and views read as absent; a fixture that exercises schema writes seeds an identity first. And `refreshTree` joins an in-flight walk, so a test that writes then walks reads a pre-write tree — use `refreshAfterWrite`, which bumps the epoch and re-walks.
- **SQLite `length` counts code points; JS `.length` counts UTF-16 units** — they diverge on astral characters, so offset math must agree on which it means.
- **"No result" (`null`) and "no index" (empty array) are distinct types** — collapsing them loses the distinction the caller needs.
- **Containment is not reachability** — an entity inside a folder chain isn't necessarily reachable through it; check the actual path, not the prefix.
- **A path normalizer that drops empty segments still must drop `..`** — otherwise a normalized path can escape its root.
- **Only an `envelope`-kind IPC handler catches a throw into `{ok:false}`** — a `window`-kind handler is `return entry.fn(...)` with no net (`ipc.ts`), so any throw inside it (an `fs` call, a live-leaf read, a re-seed) rejects across the boundary and breaks "IPC never throws." A `window` handler doing real work self-wraps in try/catch → `fail(errText(e))`, the way the sibling picker channels do; and a destructive `rm` loop is best-effort (`.then(ok, fail)` per file) so one unremovable file doesn't abort the pass.

### Lint & Accessibility

`npm run lint` runs clean — zero errors, warnings, infos, and no unformatted file; a change that adds a diagnostic isn't done.

- **Three rules are off in `biome.json`, each for a stated reason:** `useExhaustiveDependencies` (this codebase deliberately omits deps where the omission *is* the behavior — mount-once editors, refs carrying live values, stable identity; each site comments why), `noNonNullAssertion` (`!` where the surrounding logic already proves the value), `noDescendingSpecificity` (sheets are grouped by concern and specificity governs regardless of source order). `graphify-out/` is excluded from the linter's scope.
- **Suppressions carry a real reason, never bare silence** — never suppress a genuinely-firing rule (fix the code); suppress only when the rule's own fix is wrong (e.g. `noConfusingVoidType` rewriting `() => void` to `undefined` breaks assignability). A `biome-ignore` is ONE line and attaches to the next line — in JSX, `//` in an expression slot, `{/* … */}` in a children slot; a whole-file reason uses `biome-ignore-all`.
- **A control is a control** — anything that behaves like one carries a role, takes focus, and activates from the keyboard through the single `DesignSystem/Interactions/activate.ts` primitive (Enter/Space re-dispatch a real click). Tab strips are tablists with roving tabindex. Don't claim what the code can't honor — a pointer-only resize strip takes no `role="separator"`; pointer-only affordances take no interactive role and say why. Decorative graphics are hidden with a literal attribute (a props spread is invisible to static analysis).
- **The drag handle already owns its keyboard** — `SortableZone`'s `handle` ships `onKeyDown`, a role, a tab stop, and aria; a surface that spreads `{...handle}` then declares its own `role`/`tabIndex`/`onKeyDown` silently replaces that contract (JSX takes the last), and keyboard reordering dies with no error. Pass `itemRole` to `SortableZone` instead of overriding after the spread.
- **Known gap:** grids (table cells, card values, inspector rows) have no keyboard navigation — per-cell tab stops would flood the tab order; the right answer is roving tabindex with arrow keys, a feature to design. Those sites are suppressed and say exactly this.
