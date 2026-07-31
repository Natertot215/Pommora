### Identity-Plan Watchlog

The standing watch record for [[Identity + Enforcement — Implementation Plan]], executed against [[Identity + Enforcement — Decision Log]] and [[Agenda De-Scaffolding Report]]. Read-only against the tree; this file is the watch's only writable artifact.

### Non-Negotiables

- **D-20 sequencing law.** Remove the old architecture → verify the slate is truly clean → implement the new system. Never interleaved. Phase 1 removes agenda infrastructure wholesale; the old ID scatter consolidates in Phase 2; the kind-key system lands on the clean seam in Phase 3.

- **The four gates, exit codes read directly, never piped.** `env -u ELECTRON_RUN_AS_NODE npm run typecheck` · `npx biome lint src` · `npx vitest run` · `env -u ELECTRON_RUN_AS_NODE npm run build`. A red gate stops the line. A piped exit code is a masked failure, not a pass.

- **The Phase-3 app-closed window.** Between Task 8 landing and Task 12 completing, the app must not open either live nexus (test or NexusOS). Adoption under the flipped seam stamps fresh `PageID`s onto legacy `id:` pages, and the later rename then creates duplicate keys — silent identity loss plus a permanent write-freeze via the broken-frontmatter refusal. Task 12 runs immediately after Task 8 gates green; Tasks 9–11 touch no on-disk format and follow after.

- **Nathan-coordination points, two.** Task 4: enumerate every live-nexus agenda singleton folder with its contents and present before touching anything; move to the system trash on explicit per-item go, never `rm`. Task 12: the non-ULID pre-flight census gets a per-file ruling from Nathan **before** any rename runs.

- **Explicit-path staging only.** Never a directory-level `git add` — parallel sessions are possible and a dir-level stage sweeps another session's work into this plan's commits.

- **No deferred cleanup.** Every stale comment, dead export, orphaned fixture, orphaned style block, and stale doc claim encountered in a touched area is cleaned in that task's commit. No backlog may exist at plan close.

- **Never strip `KNOB` or `(Nathan's call)` / `(Nathan's spec)` markers.** They are functional, not decoration. Grep-verify after any agent pass over a touched file.

- **Zero Swift-parity tolerance.** Anything existing only as a Swift remnant is dead code — re-chosen on Pommora's own merit or removed. No tolerance or migration code is ever written for what Task 4 deletes.

- **Task 2's deliberate survivors — do NOT touch.** The `'agenda'` `SidebarMode` + ribbon entry + the `readPersonalization` allowlist · `labels.agendaTask` / `agendaEvent` parsing · `NavRef`'s `'task' | 'event'` kinds, the three renderer guards (`tabsModel`'s `liveTarget`, `store`'s `pinTarget`, `store`'s `addFavorite`), and the `NAV_KINDS` / `TAB_KINDS` allowlists (D-19 — the kind-scoping capability stays) · `NavList`'s extras rendering · `splitSearch` / `extras` in `useNavData`.

- **Task 3's deliberate survivors — do NOT touch.** `paths.ts`'s `taskConfig` / `eventConfig` filenames, and the agenda-folder skips in `adopt.ts` + `readNexus.ts` — they keep old or stray agenda folders from adopting as Collections until Task 8's registration-aware classification replaces them.

- **Mid-execution rulings from Nathan** are recorded below as they land.

#### Rulings Recorded Mid-Plan

- **Ratification is on record.** Nathan's execution instruction ("Execute the ratified implementation plan") ratifies both the log and the plan; the "attack round pending fold" header was stale — the plan body carries the folded round-2 findings. Headers rewritten, committed `8c5ef003`.
- **Doc reconciliation moves to the falsifying commit.** Docs made false by a Phase-1 deletion land in that task's commit, not Task 13. Task 13 keeps a "Not here — landed with the code that falsified them" clause and reconciles against this ledger at close.
- **Evidence beats classification.** Where the De-Scaffolding Report's own sections disagree (`listFilesBySuffix` listed as both generic-and-surviving and as retiring), the zero-consumer evidence governs.
- **Core-bullet narrowing is Nathan's to adjudicate.** The decision log's Core lists the record-based mislocation revert in this plan; D-17 splits it out. The plan's reading is the coherent one; the Core text drifted. Raised, unresolved.
- **No time-specific comments (Nathan, standing).** A comment or doc line stating what is or isn't built goes stale — state the durable why instead. Bans `yet` · `currently` · `for now` · `today` · `until X lands` as claims about build state. Applies to docs equally.

#### Task Log

- **Task 4 — held, app running.** The dev process (electron-vite + Electron main/renderer) is live; the plan's first checkbox is "App closed (both nexuses)." Hold is correct. **Enumeration finding carried forward for the Agenda Rethink:** both NexusOS agenda configs carry a second, user-authored `_type` Select property that exists nowhere in code and is not recoverable from `defaultStatusSeed()` — Tasks: Task / To-Do / Phase; Events: Event / Meeting / Appointment. Nathan's own taxonomy, and a real design input for the agenda schema scrub. The test-nexus configs carry Status only. All four are Swift-serialized and key their schema under `properties`, not `property_definitions` — the deleted `agendaConfigSidecar` could never have read them.
- **Task 3 — landed `b927a99c`, four gates green.** `AGENDA_SUFFIX` · `agendaKindOf` · `shared/agenda` return zero hits; the only surviving `task.json` / `event.json` string is `util.test.ts:31`'s accepted-name fixture, exactly as the amended grep step predicts. Survivors intact: `paths.ts` filenames, the `adopt.ts` + `readNexus.ts` folder skips.
- **Task 2 — landed `8be1cc7e`, four gates green.** `agenda:list` · `AgendaEntry` · `agendaSnapshot` · `ensureAgendaSnapshot` all zero hits. `buildNavIndex` collapsed rather than kept as a passthrough seam.
- **Task 1 — landed `9b005cb8`, four gates green.** Verified independently: `agendaEntity` · `agendaConfigSidecar` · `SchemaTarget` · `schemaTransaction` · `invalid-event` · `not-agenda` · `listFilesBySuffix` all return zero hits across `Pommora/src`. `stripPageMember` lives at `pageValue.ts:85`; both importers repoint to `./pageValue`. `listFilesRecursive` + `listMarkdownFiles` survive with live callers. Baseline before the edit: typecheck 0 · lint 0 · vitest 0 (175 files / 1875 tests) · build 0.

### Docs To Change

Seeded from the plan's Task 13 list and the decision log's Reconciliation Bill (identity half). Each entry: **doc · the claim · what makes it false · task.**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| [[Architecture]] | Principle 1 — "Only Pages are Markdown; Tasks, Events, sidecars… stay JSON" | One `.md` grammar covers all operational content; JSON narrows to sidecars/configs/registries | 13 |
| [[Architecture]] | "An agenda item's own kind is its filename suffix" — the suffix as read-walk-load-bearing discriminator | Task 3 deletes `AGENDA_SUFFIX` / `agendaKindOf`; the folder-sidecar law loses its sole exception | 3 → 13 |
| [[Architecture]] | "Kind authority = the folder sidecar, not the extension… Any kind-like frontmatter key is treated as preserved foreign frontmatter" | The kind-stamped ID key is a classification input — the first in-file kind marker | 8 → 13 |
| [[Architecture]] | Pending block — "per-file kind at adoption… applying the existing suffix discriminator per file" | Resolves via a different mechanism entirely (the admission predicate + folder-kind resolver), not the suffix | 9/11 → 13 |
| [[Architecture]] | "Agenda is discriminated by config sidecar, never by name… every collection-discovery path skips a folder iff it carries an agenda config" | D-8: registration by sidecar id is the authority; an unregistered, duplicated, or nested config is inert bytes | 9/10 → 13 |
| [[Architecture]] | Adoption paragraph — "agenda singletons… are left alone" | Adoption's skip-agenda-wholesale rule inverts; singletons stamp their direct `.md` children | 11 → 13 |
| [[Architecture]] | "That partitions the keyspace with no reserved-name blocklist" | Three unwrapped kind keys are now recognized names — the clause needs restating, not deleting (D-2: wrap-blindness still holds for `<PageID>`) | 8 → 13 |
| [[PommoraPRD]] | "classification never depends on a file extension or a frontmatter field" | The ID key participates in classification | 8 → 13 |
| [[PommoraPRD]] | "`id` — a stable ULID assigned at creation" | The key is kind-stamped: `PageID:` / `TaskID:` / `EventID:`; the value stays a bare ULID | 8 → 13 |
| [[PommoraPRD]] | Storage philosophy — "Agenda entries, Contexts, and all configuration are JSON"; "Tasks (`.task.json`)" | Agenda becomes `.md`; the format lines are false | 13 |
| [[PommoraPRD]] | "Agenda rows are read-only today" + the Agenda section's shipped-surface framing | Task 2 removes the read surface entirely — the mode renders inert | 2 → 13 |
| [[Structure]] | "A container's kind is its folder's sidecar filename… an Agenda item's kind is its file extension" | Both halves restated under the kind-key law | 8 → 13 |
| [[Structure]] | "`id` — a stable ULID assigned at creation" | Same kind-stamped-key rewrite as the PRD's | 8 → 13 |
| [[Connections]] | Rename-cascade description — the sweep's real-page gate | The gate becomes the admission check (`state !== 'unknown'`), admitting member AND missing | 11 → 13 |
| Project `CLAUDE.md` | "Contexts, Agenda, and container sidecars are JSON" + the incomplete kind law ("an entity's kind comes from its folder's sidecar, not the extension") | Agenda leaves JSON; kind gains the in-file agreement clause | 13 |
| `Context.md` | The "redundant identity sources" hunt + the "two-writers-for-one-fact" lesson | Need the written carve-out: the kind key is a deliberate second source whose *disagreement is the detection signal* — a checksum, not the defect. Without it the next consolidation sweep "fixes" it | 13 |
| `Context.md` | "The `adopting` flag is a plain boolean… any extension of its coverage should make it a counter first" | Task 11 makes it a counter — the debt resolves and the entry is stale | 11 → 13 |
| [[Agenda]] | "What ships is a read-only list feeding display-only rows" + the Pending *Agenda Surfacing* paragraph (the sidebar list, the warmed nav snapshot) | Task 2 deletes the channel, the loader, both fetch paths, and the snapshot | 2 → 13 |
| [[Agenda]] | Format claims — `.task.json` / `.event.json`, the EventKit field roster, `description`, the inline `property_definitions` framing | Task 3 deletes the suffix grammar; the shape decisions belong to the Agenda rethink, but the *format* lines are already false | 3 → 13 |
| [[Sidebar]] | "the sidebar owns the fetch rather than the mode component… It re-reads per open nexus" — the whole design-around paragraph | Task 2 deletes the fetch; the rationale existed only because agenda was off-tree | 2 → 13 |
| [[Navigation]] | "plus a cached Agenda snapshot so Tasks and Events are findable" | Task 2 deletes `agendaSnapshot`, `ensureAgendaSnapshot`, both invalidations, and the search append | 2 → 13 |
| [[Navigation]] | "the inert agenda hits render as List rows only, having no card form" + Deferred's "Agenda entries are search-listable but route nowhere" | No producer remains; `extras` is simply always empty | 2 → 13 |
| `Framework.md` v0.7.0 | The agenda-CRUD "gets reached" plan | Inverts — the CRUD converges onto the page writers; the JSON writers die | 13 |
| [[Properties]] | JSON-root value claims, `description`, the agenda `id` | Agenda values become frontmatter under the page codec | 13 |
| [[Architecture]] | `excluded_folders` "ignored *completely* at any depth" | Already false pre-plan (cascade enumerators apply no exclusion filter) and now load-bearing — F4 makes exclusion a *preference* the revert must not fight | 11 → 13 |
| `src/main/crud/adopt.ts` comment block | The skip comment cites `agendaKindOf` / `shared/agenda.ts` | Both deleted in Task 3 — comment restates the new truth in that task's commit | 3 |
| `src/renderer/src/Sidebar/Sidebar.css` | `/* --- agenda mode (read-only list) --- */` heading over `.agenda-row` / `.agenda-title` | Task 2 reduces AgendaMode to its empty state; those two rules orphan and the comment's claim dies | 2 |
| `src/shared/bridge.ts` comment | "Agenda / navigation / tabs / previews / thumbnails" section header | `agenda:list` leaves the map in Task 2 | 2 |
| `src/renderer/src/Navigation/navSearch.ts:1-5` | File header — "over the live tree (+ a cached agenda snapshot)… agenda hits ride the same index… memoizes buildNavIndex over (tree, agenda)" | Every clause dies with the parameter and the append loops | 2 |
| `src/renderer/src/Navigation/useNavData.ts:34-35` | "The tree index is memoized on (tree, agenda)" | The agenda dependency drops from the search memo | 2 |
| `src/renderer/src/Navigation/useNavData.ts:17, :21-22` | `SearchResult.resolved` and `splitSearch` docs — "unresolvable hit (agenda kinds)" / "unresolvable ones (agenda) become inert `extras`" | The shape is a deliberate survivor; its comments cite a producer that no longer exists — restate generically, do not delete | 2 |
| `src/renderer/src/Navigation/NavList.tsx:203` | `extras` prop doc — "Unresolvable hits (agenda kinds) — listed inert until Agenda routing ships" | Same class as above — survivor, stale rationale | 2 |
| `src/renderer/src/Navigation/NavList.tsx:246` | Tooltip copy `title="Agenda navigation isn't wired yet"` | User-visible copy on a survivor block that can no longer receive agenda rows — needs Nathan's call, not a silent rewrite | 2 |
| `src/renderer/src/NavWindow/NavWindow.tsx:231-232` | "`extras` (inert agenda hits) has no card form, so it renders as a List row regardless of the Style toggle" | Already false pre-plan — gallery mode passes no `extras` at all, so nothing renders there; also cites the dying producer | 2 |

**Standing discrepancies carried, not owned by this plan:** the PRD's dangling "see Prospects below" (no such section; Framework points at it too).
