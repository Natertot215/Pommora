## Handoff — Pommora React

> **User Prompt:** Resume inline execution of the Contexts & Spaces implementation plan on `contexts-spaces` exactly where it stopped (Task 3.5's second half), run the remaining phases under the same gate + breaker discipline, and close with a **surgical** doc sweep — rewrite the minimum needed to be true, never drastic restatements of mechanisms.

> ⚡ **Cornerstone — carry into every handoff, unchanged (Nathan's voice).**
> *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

### Session Summary — Contexts & Spaces: brainstorm → ratified plan → Phases 0–3 executed

**Session ID:** 7e6f7f15-d1c8-41b7-a9cc-285d23f84fad
**Dates:** 07-22-2026
**Model:** Fable 5
**Compactions:** 2
**Connectors:** none
**Commands:** /compact · /handoff
**Agents:** Explore (targeted code recon for the brainstorm) · build-breaking-agent (plan review rounds + the Phase 2 attack) · code-simplifier (the over-protection audit)
**Skills:** studio-brainstorm (manual-load) · superpowers:writing-plans · superpowers:executing-plans · handoff · project-context

**What Started:** The session opened on a daily-driver livability sweep of every prospective-feature doc, then pivoted into the Contexts redesign: Nathan's Context (group) / Space (member) vocabulary, user-defined Contexts via a `contexts.json` registry, Spaces as SurfacePM block surfaces, and bracketed title-keyed frontmatter (`"[Projects]": [Pommora]`) replacing the bare-ULID `tierN` arrays. The studio-brainstorm skill drove a full decision log ([[Contexts & Spaces — Decision Log]], RATIFIED) and superpowers:writing-plans produced the seven-phase [[Contexts & Spaces — Implementation Plan]], hardened through three adversarial review rounds plus a simplification pass that deleted the reverse map, cache-busting, and the migration re-scan as over-protection.

**What Happened Along the Way:** Execution ran inline on `contexts-spaces` (branched off the post-merge main), one green commit per task. Phases 0–2 landed the whole main-process side: the shared registry contract, the pure resolve/reconcile seams (exact keys, coerced values — A-10/H-6), `rmwJsonStrict` as the one never-fallback-to-empty IO chokepoint, the walk retaining raw bracketed keys per cached node and resolving them onto each entity's own `contextValues` at assembly, the CRUD family (`setContext` per entity kind with per-file reconcile + in-place tierN healing), the journaled three-scope rename cascade with on-open replay at both open call sites, deletes/reorders/watcher exclusion/SQLite generalization (SCHEMA_VERSION 17, `context_id`, Space sources), and the idempotent version-bump-last migration.

The Phase 2 build-breaker earned its dispatch: its HIGH finding — `loadContextWorld`'s lenient sidecar read let the reconcile silently strip a Space's valid tags from files during *successful* writes whenever that Space's `_space.json` was transiently unreadable (the evicted-iCloud class the strict IO layer was built against, bypassed one layer up) — was verified line-by-line and folded as a strict world load, alongside three smaller folds (rename-onto-inert-key merge+dedup, seeded-title disambiguation, `isReserved` on setContext). Phase 3 then generalized the renderer pipeline: `contextIdentity.ts` as the ONE identity seam, default-OFF context columns via `resolveColumns(view, schema, contextIds)`, values read off `row.contextValues` with the optimistic `contextValues` rider on the frontmatter override (`contextCellWrite.ts`), registry-aware filter typing, id-keyed `contextOptionsFor`, the chip icon+color threading (folding the pre-session working-tree icon diff), `CurrentColorIcon`, and the PreviewInspector rebuilt on the unified assign-reveal flow. One plan deviation recorded back into the plan: the create-group op is `createContextGroup` (the legacy tier op owns the `createContext` discriminant until 7.0).

**What It Ended With:** Fifteen commits on `contexts-spaces`, every one gated green — closing state **typecheck 0 · 1841 tests / 182 files · build 0**. Phases 0–2 complete and breaker-certified; Phase 3 complete except Task 3.5's second half (first slice committed: `allSpaces`, `findSpace`, `isSurfaceKind('space')`, ViewSettingsScope/tabs/nav-search/nav-keys/crumbs space branches). Everything is gated + breaker-verified but NOT live-driven — the app hasn't been launched against the real nexus this session, and the migration has only run against test fixtures. The two Planning docs are committed.

**Next Session:** Finish Task 3.5's remainder (navResolve space index entries, the store select reducer `case 'space'`, SettingsScaffold's space branch routing the `renameSpace` op, SettingsDropdown's inert `'space'` arm, treeMove's `createContextGroup`/`createSpace`/groups patches). Then Phase 4 (sidebar generalization — it flips the selection producer to `{kind:'space'}`), Phase 5 with its live checkpoint, the Phase 6.1 HARD STOP for Nathan's chassis pass, and 7.0–7.2 with the surgical doc sweep.

**Lessons Learned**

- Zod discriminated-union op names collide silently at the type level — adding `{op:'createContext'; name}` beside the legacy `{op:'createContext'; tier; name}` merges into one unusable branch; a new op needs a new discriminant until the legacy strips.
- The optimistic-write seam for context values is the EXISTING frontmatter override layer: a `contextValues` rider on the patched entry wins over the node's walk-resolved field in `value.ts` — no tree patching, no new override map.

**Session Pointers**

- **The post-compact pickup prompt** delivered in-chat (this session's closing message) is the execution brief — it enumerates the exact 3.5 remainder with file:line targets and the amended surgical-doc-sweep directive for 7.2.
- **Main-side context machinery:** `src/main/crud/contextWrite.ts` (world load + setContext family + creates) · `contextCascade.ts` (three-scope sweep, renames, unlinks, replay) · `contextJournal.ts` · `src/main/migrateContexts.ts` · `src/main/contextsRegistry.ts`.
- **Renderer seam:** `Detail/Views/pipeline/contextIdentity.ts` — every surface resolves Context/Space identity through it; nothing re-derives from the tree.
- **Migration trigger:** nexus.json `schemaVersion < 2` alone (never on-disk shape — earlier steps consume the tier dirs), bump withheld until a fully-clean run; runs between `prepareOpenedNexus` and `openSessionIndex` at both open sites, `replayPendingRename` directly after.

**Landmines**

- **The dev window between Task 3.5 and Phase 4:** the sidebar still selects `{kind:'space'}`-less `{kind:'context'}` members; ids are identical (legacy struct derives from the reserved groups) so selection resolves, but the ViewSettingsScope space arm stays unreachable until Phase 4 flips the producer.
- **A real-nexus open will RUN the migration** (tier folders move, member files rewrite) — first live launch on `contexts-spaces` is a one-way door for that nexus's on-disk shape; use a copy or `~/test` first.
- **The blank SpaceDropdown (G-5) is adjudicated KEEP** — don't re-flag it in any review.
- **`FrameworkPM.md` mirror-script bug** — reappears untracked in `.claude/`; never commit it.

**User Feedback**

- **"Just because I mentioned it doesn't mean it's the only issue"** — the simplification audit had license to hunt beyond the named over-protections; the reverse-map/cache-bust/re-scan deletions came from that.
- **"If tiny tweaks to something else entirely replicates a full-blown phase here, that's likely the right move"** — drove the additive-beside-legacy strategy and the sidebar phase's "nothing here is new construction" header.
- **Surgical docs, not restatements** — the closing 7.2 sweep must swap falsified sentences in place, minimal-to-be-true, keeping each doc's structure and voice.

**Uncertain**

- The whole branch is gated + breaker-certified but zero surfaces are live-driven; the migration has never run against a real nexus shape beyond the fixture.
- `Compactions: 2` is best-effort.
- Agenda VIEW rows (task/event tables) still read legacy paths — their context-column story rides the later phases; only the tree/page pipeline is fully re-seamed.

---

### Recent Sessions

- 07-14 → 20 · `1968ae09` · Cards view end-to-end: prototype → ratified plan → executed + hardened; the certified cleanup campaign (one-walk mutations, gesture primitive, autosave registry); merged `cards-view` → `main` at `618720d7`.
- 07-14 → 16 · `nav-gallery-pins` · Navigation surface + NavPane/NavWindow redesign + gallery, then Multi-Tab Nexus shipped end-to-end.
- 07-16 → 17 · `main` · Page Previews + Unified Subfield + Scan-Promote shipped; closed the rebuild at v0.5.0.

### Working Notes

- **Gates:** `env -u ELECTRON_RUN_AS_NODE npm run typecheck` (the ONLY type gate) + `npx vitest run` + `… npm run build`; read the summary line, never a piped exit code (`set -o pipefail`). Biome auto-formats on write — never run it, never hand-align.
- **Cards CDP live-drive:** the reusable harness (`cdp.mjs` + isolated `--user-data-dir` on the real nexus) pattern works; native menus + settings-pane toggles are NOT drivable — verify those by hand.

### Rules

- Resolve = delete + route, never tag — no (resolved) / (fixed) tombstones.
- No standing content here — Pending Focuses / Fix Log / durable rules live in `Context.md`.
- One block per session, in place; parallels share the doc, never edit another's block.
- Verify before finalizing — run the no-stale-state checklist.
