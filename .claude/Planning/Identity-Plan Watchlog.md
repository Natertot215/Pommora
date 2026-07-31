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

*(none yet)*

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

**Standing discrepancies carried, not owned by this plan:** the PRD's dangling "see Prospects below" (no such section; Framework points at it too).
