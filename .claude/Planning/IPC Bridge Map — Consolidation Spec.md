## IPC Bridge Map — Consolidation Spec

**Status:** Adversarially reviewed once (ten findings; the mechanism itself was compiled and held). Every surviving finding is folded below — the folds adopt the reviewer's own verified fixes. This is a correction pass, not new architecture: it removes the triple declaration, the envelope split, and the refusal drift. It adds no capability and no optional machinery; the one behavior change (throw-safety on 39 currently-unsafe channels) is staged deliberately, never smuggled.

#### The Law This Spec Serves

`shared/result.ts` opens with the contract this design enforces: *"Mirrors the IPC envelope shape so a handler can return a Result straight across the boundary."* Today that sentence is true for one of ~97 channels. After this pass it is true for all of them, and the drift that broke it becomes structurally impossible: **a channel is declared once, in one map, and both sides derive from it.**

#### The Verified Defect

Every number was produced by census and independently re-verified against the code.

- **97 request channels + 4 fire-and-forget sends + 6 main→renderer pushes.** Every channel's name is hand-written at least twice (main registration + preload dialer); its payload types a third time. Nothing type-checks the two ends against each other.
- **Three failure encodings coexist**: bare-string `{ok:false;error:string}` (~60 channels), structured `PommoraError` (`mutate` alone), and bare sentinels (`null`/`false`/`{}`) on ~30. Six ad-hoc `{ok:true;…}` unions are declared twice each, once per side.
- **31 sites in `main/index.ts` flatten** a rich `PommoraError` to `.error.message`. `code` reaches the renderer on one channel and is read by zero consumers; `lossy-change-requires-confirmation` exists solely for renderer branching and is structurally unreachable.
- **Five spellings of one refusal** (`'No nexus is open.'` ×32 · `'No nexus open'` ×3 · `'no nexus open'` ×1 · `'No open nexus.'` ×1 · `'Nexus switching.'`) — possible only because the refusal is a free string at every site.
- **Four registration forms with different guarantees**: `handleEnvelope` (46, throw-safe) · `handleWindowMenu` (23, no throw safety) · raw `ipcMain.handle` (17, no throw safety — including the `tabs:save`/`previews:save` writers) · `handleLocalScope` (4 → 8 channels). "IPC never throws across the boundary" is a hard rule enforced on less than half the surface.
- **Ten menu-action unions are re-typed inline in preload** (verified: preload imports nothing from main; the mirroring is habit). Twelve sibling menus already live in `shared/*Menu.ts` — the correct pattern exists, unfinished.
- **Renderer blast radius of the structured error is funnel-shaped**: one `commit` helper covers 19 call sites; ~13 sites total read `res.error` as a string; two store fields are typed `string`; one site fabricates the string envelope; one throws `new Error(res.error)`.
- **Hard constraint (verified twice):** preload is sandboxed; its built bundle requires exactly `electron`, and every `@shared` import it holds is `import type`. A shared module preload consumes **as a value** must have zero external runtime imports. And `src/preload/index.ts` is type-checked by *both* tsconfig projects.

#### The Mechanism

**One new shared module, `shared/bridge.ts`** — named for the noun CLAUDE.md already uses ("a narrow typed IPC **bridge**"; "channel" is design-system vocabulary here). The `governedKeys` idiom: the one owner of the wire — every channel's name, direction, argument tuple, and reply type. Zero external runtime imports (the sandboxed preload consumes its table as a value); domain types arrive `import type` only.

Three declaration surfaces:

- **`Asks`** — an interface keyed by channel name; each entry declares `args` (labeled tuple) and `reply`. Two reply classes, both existing today — the map records them, it doesn't invent them:
  - **Enveloped** (every data read/write): `reply: Result<T, PommoraError>`. `Ack` channels become `Result<null>`; the named `*Result` zoo (`PageResult`, `NavigationResult`, `TabsResult`, `PreviewsResult`, `ThumbResult`, `AgendaListResult`, `BlocksGetResult`, `BlocksSaveResult`) and the six twice-declared inline unions are deleted, replaced by `Result<PageDetail>`, `Result<{id: string}>`, and so on.
  - **Bare** (menus, pickers, sentinel reads): the reply is the raw value (`Action | null`, `boolean`, `Record<string, T>`, `NexusState`). Each bare entry declares its throw policy in the runtime table — and the policy is **per-entry, because a sentinel can be load-bearing**: the menus take a `null` fallback (indistinguishable from dismissal, which is exactly right), while the sentinel reads (`subfield:get`, the scope gets, `linkTitles:get`…) keep **rethrow** — the renderer already documents and handles exactly this split ("the two raw database reads keep a catch; the envelope channels structurally cannot reject", `store.ts`). A fallback that already means something (`false` = "user cancelled" on `nexus:choose`) is never used as a throw disguise: `nexus:choose`/`nexus:openPath` are writers, and they move to the envelope in Stage B, where their one consumer (`openVia`'s existing catch) updates in the same sweep.
- **`Tells`** — the 4 sends, keyed by channel, valued by arg tuples, with the same per-entry window-injection flag `Asks` carries (2 of the 4 — `win:dragBy`, `win:zoom` — resolve the sender's window today).
- **`Pushes`** — the 6 pushes, keyed by channel, valued by payload types (current types, verbatim). Both halves derive: subscribers via the `on` builder, and the nine main-side send sites swap to one typed `push(channel, payload)` helper — without it, "declared once" would be true for only half of every push.

**The preload derives, it never declares.** A ~10-line `ask` helper turns a channel key into a fully typed dialer: `openPage: ask('page:open')`. The namespace layout (`nexus.tabs.load`, `nexus.schema.add`…) stays a hand-authored object literal — the grouping is worth keeping readable — but every *signature* comes from `Asks`: 444 lines of hand-typed arrows collapse to ~150 lines of layout, and a typo'd channel is a compile error. `openDropped` keeps its one real behavior (`webUtils.getPathForFile`) as the single hand-written method. `NexusApi` stays `typeof api`; the renderer sees no structural change.

**Main answers by exhaustive object.** `serveBridge(handlers)` takes `{ [K in keyof Asks]: … }` — the compiler enforces that every declared channel is answered and no undeclared channel exists, in both directions. The handlers are **one object literal**, which is what makes a duplicate key a compile error (an object literal cannot repeat a property) — the guarantee Electron's own duplicate-registration throw provides today survives the migration. Handler bodies stay exactly where they live in `main/index.ts`, reorganized into the literal in place — no new file tree; if the file wants splitting later, that rides along the way `mutate.ts`'s arms do, and the split composes through a merge that throws on a duplicate key so the guarantee never lapses. `serveBridge` owns the try/catch per the entry's declared policy (enveloped → `fail('operation-failed', errText(e))`; bare → fallback or rethrow) and window injection where an entry declares it. The `handleLocalScope` family survives as a typed `scopePair` generator producing its eight entries — its four shared rules (the emptied-value delete, the key guard, the per-scope refusal, the no-nexus refusal) keep their single owner rather than flattening into eight hand-written handlers. One implementation note the review surfaced: handler return types are annotated explicitly — an async menu handler's bare string literal otherwise widens past the union.

**One envelope, and the flatten dies at its source.** Handlers return `Result<T, PommoraError>` straight through; the 31 flatten one-liners and `mutate`'s `relay` shim dissolve rather than being rewritten. `ErrorCode` gains `'no-nexus'` and `'busy'`, and the refusal strings live exactly once, beside their codes, in shared guard helpers (`openRoot(): Result<string>` — the root, or THE no-nexus failure). Five spellings collapse to one because only one place holds a spelling. `lossy-change-requires-confirmation` becomes *reachable* — this plan builds no dialog; it just stops making the signal impossible.

**The renderer sweep is the funnel**: the `commit` helper and the `showError` sites read `.error.message`; `SessionState.error`/`pageError` stay `string` (the store maps `error.message` at ingestion); `viewMint`'s throw and the store's fabricated envelope are one-line updates. `showError` keeps its `string` signature.

**The ten orphaned menu unions move to `shared/`** — required so the derived dialers can type their replies from shared, and it completes the existing twelve-menu convention. No new pattern; the unfinished half of an old one.

#### What This Corrects, By Ledger Item

- The triple declaration (the Boring Work headline) — dies structurally.
- The `PommoraError.code` flattening at the ~34 tails (Pending) — dies with the envelope.
- The two coexisting envelope shapes (Pending) — dies by definition.
- The mirrored menu enums (rework sweep A3) — the shared move.
- The five refusal spellings — the guard helpers.
- The throw-safety gap on 40 channels — `serveBridge`'s uniform catch.

#### What Deliberately Does Not Change

- **Handler behavior.** Every guard, validation, and side effect stays put. The `adopting` guard keeps its current 4–5 channel coverage — extending it is a real behavior decision, deliberately out of scope, parked in the ledger (with the review's rider: the flag is a plain boolean with four entry points and no re-entrancy guard, so any future extension should make it a counter first).
- **`mutate`'s dispatch** and the crud layer. `MutateResult` aligns to `Result<{created?}>` — a mechanical shape alignment of one channel and its single consumer.
- Channel names, verbatim — no renames, no convention cleanup. (Post-map a rename is a one-line edit; that's a fact, not a task.)
- The `context-menu` void-plus-push pattern, the dialog placements, the protocol handlers, the watcher, the sends and pushes' behavior, the sentinel reads' absence-is-fine semantics (`view:loadValues`' failures-collapse-to-`{}` included — kept, documented).
- The `menu:action` payload type, the test stubs, per-key scope reads — all untouched. Not this pass.

#### Stages

Both stages land green (typecheck · lint · vitest · build) and are independently shippable.

- **Stage A — the map and the wiring.** `bridge.ts` declares every channel with its *current* types verbatim (string envelopes included); preload derives; main re-registers through `serveBridge` with handler bodies unchanged; menu unions move to shared. **The wire is identical before and after — rejections included**: the 39 channels with no throw safety today keep per-entry rethrow, so Stage A changes zero behavior and its safety net is real, not asserted.
- **Stage B — the envelope, and the law applied.** Replies flip to `Result<T, PommoraError>`; the flatten sites and `relay` dissolve; `ErrorCode` gains its two members; the guard helpers replace the refusal literals; `nexus:choose`/`nexus:openPath` join the envelope (their throw currently surfaces through `openVia`'s catch — that site updates here, so a failed open never degrades into a silent `false`); the enveloped channels' rethrows flip to the uniform catch. The renderer sweep lands in the same stage: the deleted `*Result` types make the compiler name every affected site.

#### Sizing

~1,800 raw lines touched; net negative. New: `bridge.ts` (~360–450 — the review's sample-measured estimate; the census is the entry list). Shrunk: `preload/index.ts` 444 → ~150. Reshaped in place: `main/index.ts`'s registration span. Deleted: the `*Result` zoo, the flatten one-liners, the inline unions, the preload re-typings, `relay`. Renderer: the error reads are the funnel (~13 sites, one `commit` helper covering 19 callers); the success reads are a broad mechanical sweep (~52 field reads across ~21 files, `res.page` → `res.value` shaped) — every one of both kinds is compiler-named once the old types are gone. Risk concentrates in Stage B's renderer sweep; Stage A is behavior-identical by construction.
