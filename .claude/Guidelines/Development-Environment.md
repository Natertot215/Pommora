## Development Environment

The operational layer for running, driving, and committing to the app; the Feature docs (`.claude/Features/`) describe how the app itself works. Sibling guidelines: [[Editor-Internals]], [[Interface-Styling]], and [[Web-Guests]].

### Running the App

- **Unset `ELECTRON_RUN_AS_NODE`:** The shell exports it as `1`, which runs Electron as plain Node and crashes the app. Launch from the repo root:
  - **Dev (HMR):** `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`
  - **Built:** `npm run build`, then `cd Desktop && env -u ELECTRON_RUN_AS_NODE ../node_modules/.bin/electron .` — the Content-Security-Policy applies only here, so a renderer dependency that evaluates code or fetches is checked against the built app.
  - **PowerShell:** `Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction Ignore; $env:POMMORA_DEBUG_PORT=9333; npm run dev`
- **Headless First:** Verify with the gates and launch the window only when a human will look at it.
- **Main Doesn't Hot-Reload:** `Desktop/main.ts` and `Desktop/Bridge` pick up changes only on a dev-process restart; a stale main answering a new renderer request looks like a regression.
- **Stop by Exact PID:** `pkill -f` can match the session's own shell, and killing the launch PID orphans the real Electron child. Walk the tree with `ps -o pid,ppid,command -A`, kill the Electron PID first, then its wrappers.
- **Worktree Electron:** A worktree's `node_modules` often lacks the Electron binary (`Error: Electron uninstall`); `./node_modules/.bin/electron --version` downloads it.

### Driving Over CDP

- **Live Edits Write to Disk:** The dev app opens the real Nexus, and any injected editor change autosaves to the page's `.md`. Drive a new throwaway page; screenshots are always safe. `window.nexus.*` is frozen and can't be stubbed.
- **Clicks and Drags:** Synthetic clicks work on tabs, rows, and buttons; `PickerMenu` items need `el.click()` inside `Runtime.evaluate`. A drag passes `buttons: 1` on every move event.
- **Occluded Windows Stall:** A window behind another reports `hidden`, and rAF, `ResizeObserver`, transitions, and scroll timelines pause. Bring it forward (`osascript -e 'tell application "System Events" to set frontmost of (first process whose unix id is <pid>) to true'`, then `Page.bringToFront`) before measuring layout.

### Second Instances & Sync

- **Scratch Instance:** The single-instance lock lives in userData, so a second instance takes its own `POMMORA_USERDATA` (use `$HOME`, not `~`) and its own `POMMORA_DEBUG_PORT`.
  - **Borrowing the dev renderer:** `cd Desktop && POMMORA_USERDATA=… POMMORA_DEBUG_PORT=9334 ELECTRON_RENDERER_URL=http://localhost:5173 env -u ELECTRON_RUN_AS_NODE ../node_modules/.bin/electron .` opens `~/Test` with HMR and `window.__pommora`, without a build.
  - **Two devices on one Mac:** Build once and launch each instance from the built output; two `npm run dev` processes collide on the renderer port. Built output exposes only `window.nexus.ask`, and a copied Nexus folder is a replica with the same Nexus ID.
- **Sync Hub:** `npm run sync` starts `Sync/hub.ts` on `http://127.0.0.1:7473` with its data in `~/.pommora-sync/` (`POMMORA_SYNC_DATA`, `POMMORA_SYNC_HOST`, `POMMORA_SYNC_PORT` override). `npm run sync:cert` writes a certificate that switches it to TLS and prints the pin. The app never starts the hub.
  - **Container:** `npm run sync:image` builds it from `Sync/Dockerfile`. Mint the certificate into the bound directory (`POMMORA_SYNC_DATA=~/hub-data npm run sync:cert`), then `docker run --user "$(id -u):$(id -g)" -v ~/hub-data:/data -p 7473:7473 pommora-hub`. `POMMORA_SYNC_INSECURE=1` serves plain HTTP for a loopback-only port.
- **Pairing Two Devices:** Start the hub on a scratch data directory. On the first device, Settings → Nexus takes the address, password, and pin, then Connect. The second device enters the address alone, reads `Pending` until the first approves it, and both then report `syncing`.

### Toolchain

- **Version Pins:** Vite 7 + `@vitejs/plugin-react` 5, since electron-vite 5 doesn't support Vite 8.
- **CommonJS Preload:** Electron requires it of a sandboxed preload, so `Desktop` isn't `type: module`; `Core/package.json` also omits it, which keeps value imports from `Sync/` a compile error.
- **Dependency Patches:** `patch-package` applies the liquid-glass patch from `UIX/Glass/`. After editing it, run `npx patch-package --patch-dir UIX/Glass`, delete `Desktop/node_modules/.vite`, and restart the dev process.
- **`*.css.ts` Exports:** vanilla-extract files export only serializable values; a function export passes typecheck and tests but fails the build, so helpers go in a plain `.ts` beside it.
- **Theme-Contract Edits:** Changing a `createGlobalTheme` contract, or deleting a token from `color.css.ts`, rehashes its var names while the dev server serves other modules against the old ones. Restart the dev process; an empty `getComputedStyle(document.documentElement).getPropertyValue('--label-secondary')` confirms the split.

### Gates & Commits

- **Gates:** `npm run typecheck` covers all seven tsconfig projects, alongside `npm run test`, `npm run lint`, and `npm run build` / `build:dashboard`. Chain them with `&&` and confirm `✓ built in` on every build; a pipe to `tail` masks the exit code.
- **Formatting:** A PostToolUse hook formats every TS/CSS/JSON write with Biome; a shell-driven edit bypasses it, and `npm run format` repairs one.
- **Relative Core Imports:** `Core/manifest.test.ts` fails on any `@pommora/core/…` import inside `Core`; the package name is for other packages.
- **Store Slices:** A slice imports nothing that imports `store.ts`, or boot throws `create…Slice is not a function`; `Core/Session/sliceGraph.test.ts` catches the cycle.
- **Commit With `--only`:** The index is shared across sessions, so commit with `git commit --only -m "…" -- <paths>`. `--only` skips untracked files silently, so `git add` a new file first.
- **Shared Tree:** Commit as soon as the gates pass, stage explicit paths, and avoid whole-tree commands (`git stash`, `checkout .`, `clean`, `reset`); an agent needing a clean baseline uses a worktree. A surprise failure is likely another session's dirty files.
- **Hooks and Branches:** The pre-commit hook folds the line ledger and codebase audit into the Dashboard; the post-commit hook pushes `active`. `git push -f origin active:main` regenerates `main` through `.github/workflows/clean-main.yml`. Push tags by name, since `pre-rebase-contexts-spaces` sits on pre-rewrite history.

### Data-Layer Traps

- **Watcher Settle:** The watcher holds a path until it's quiet for 200 ms; an external editor's slower write-then-rename surfaces a `Name.md.<digits>` temp name, which `manifestAdmits` drops while the final name sits beside it.
- **Stale Trees in Tests:** `refreshTree` joins an in-flight walk, so call `diskMoved` first. Chained mutations go through `Core/Testing/settledMutate.ts`, and a raw disk edit needs a re-walk.
- **Fake Timers Over I/O:** Fake only `setTimeout`, `clearTimeout`, and `Date`; faking microtasks strands awaited writes. Advance the clock between writes, and wait on row counts rather than fixed delays.
- **One IPC Catch:** `serveIpc` turns any handler throw into `{ok:false}`, so handlers let errors throw rather than catching them into bare values.

### Lint & Accessibility

`npm run lint` runs clean — zero errors, warnings, infos, and unformatted files. `biome lint` exits 0 with warnings, so read its `Found N warnings` line.

- **Disabled Rules:** `useExhaustiveDependencies` (omitted deps are deliberate, with a comment at each site), `noNonNullAssertion`, and `noDescendingSpecificity`.
- **Suppressions:** A `biome-ignore` carries a real reason and applies only where the rule's own fix is wrong. It covers the next line; `biome-ignore-all` covers a file.
- **Test Helper Names:** A test-file local named `before` or `after` trips `noDuplicateTestHooks`.
- **Controls:** Anything that behaves like a control carries a role, takes focus, and activates from the keyboard through `UIX/Interactions/activate.ts`. Tab strips use roving tabindex; pointer-only affordances take no interactive role, and decorative graphics are hidden with a literal attribute.
- **Drag Handles:** `useDragItem` and `useLineRow` handles ship their own keyboard handling, tab stop, and aria. Spread `{...handle}` last and declare nothing it already carries, or keyboard reordering silently breaks.
