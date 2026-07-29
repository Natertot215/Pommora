## Handoff — Pommora React

> **User Prompt:** Map the SQLite database and the `.nexus/` JSON plumbing, then scope moving the plumbing into the database — priority on cutting code, filesystem writes, and operational-write footprint. Which became the migration itself.

### Session Summary — operational state into the database

**Session ID:** 65fae5a7-dad4-475d-902e-9bf624673db1
**Dates:** 07-27-2026
**Model:** Opus 5 (1M context)
**Compactions:** 2
**Connectors:** none
**Commands:** /compact · /handoff
**Agents:** a 26-agent feature-doc audit (one Workflow, the session's only explicit opt-in) · comment-killer-agent across several passes · code-simplifier ×2 · build-breaking-agent ×2 · three read-only Explore sweeps
**Skills:** none

**What Started:** `contexts-spaces` was merged and `Context.md` needed truing. That became a doc audit, the `tierN` retirement, a live-driven filter investigation, a whole-tree comment campaign, and an IPC simplification. Nathan then asked where SQL belonged, and the answer turned into the session's second half.

**What Happened Along the Way — the cleanup pass.** The audit put one agent on each feature doc, every finding grounded against real code. It caught a regression of mine: removing `migrateContexts` had removed the de-facto fresh-nexus seeder, since a fresh nexus minted below the version and so always ran the migration that wrote the registry. Nathan live-drove the filter and reported it "completely backwards" — three real problems, the worst being structural bands drawn from the container's Set tree rather than from surviving rows. A dozen defects were fixed, most pre-existing and unreported.

**What Happened Along the Way — the migration.** Scoping the SQL question found that the database had never run: `better-sqlite3` is compiled against Node's ABI, Electron needs its own, and `openDb`'s degradation path caught the failure on every launch. No nexus had ever contained the file. Vitest runs under plain Node, so every SQLite test passed against a database the product never had. `node:sqlite` removed the dependency and the failure class together.

Eight `.nexus/` files then moved into it, along with the block document buried inside two more, and the machinery compensating for whole-file writes — a coalescing engine, a drain contract, a quit gate — retired with them. An adversarial pass proved one of my stated premises false: `reconcileTabs` repairs entity references and returns an intact tab untouched, so the read-time normalization deleted with the JSON was load-bearing and came back. Both live nexuses were migrated by hand, so no migration code shipped.

**What It Ended With:** 84 commits, every one gated green — closing state **typecheck 0 · lint 0 · 1871 tests / 176 files · build clean**. Verified end-to-end rather than asserted: the built app was launched against copies of both real nexuses and every migrated surface was read back through real IPC.

**Next Session:** Open. `Context.md` carries the pending focuses; the content index for backlinks and full-text is the one with nothing else in front of it.

**Lessons Learned**

- **A fact with two sources is a defect, not untidiness.** Nearly every bug in the first half was that shape. Remove the second source rather than reconciling the two.
- **Guard code divides by what it defends against.** Validating a byte pattern dies with the file; reconciling an id against a missing entity survives any storage change, because foreign keys cannot reach the filesystem. They look identical at the call site.
- **"Is this a why?" is the wrong comment test.** Nathan's is *"would I know this without the comment?"*
- **A green suite can test a thing the product does not have.** The SQLite tests passed for months under a runtime the app never uses.
- **Verify the premise, not just the diff.** The review's most valuable finding was not a bug in the code — it was a false claim in the reasoning that produced it.

**Session Pointers**

- **`main/db/`** — `driver.ts` (the `node:sqlite` seam), `schema.ts` (`meta` + `local_state`), `open.ts` (version handshake), `localState.ts` (the one keyed store).
- **`main/io/tabsState.ts`** — `readTab` is deliberate and was restored after review; the renderer does not repair shape or lockstep.
- **The filter pipeline** — `Detail/Views/pipeline/`: `filter.ts` (`null` abstains, only `false` excludes), `group.ts` (`pruneEmptyGroups`).

**Landmines**

- **`nexus.db` is not regeneratable.** It holds the only copy of every machine's chrome. A schema bump drops it, which costs a user their folds and tab set once — the schema stays small so that trade stays obvious.
- **It also lives inside the nexus folder.** A file syncer over a WAL database is a known corruption vector, and one event now costs eight surfaces where it used to cost one sidecar.
- **The `.trash` layout mirrors the folder chain** a delete came from.
- **`rename` no longer accepts a Space or a Context** — their membership is title-keyed.

**User Feedback**

- **"Whatever we do must ensure DB actions are cheap, scoped, and don't do a full-pass when they don't need to. HARD YAGNI here."**
- **"Don't take this direction unless you've looked and it's the right move, I might be wrong"** — he was right about block layout, and asked to be checked rather than obeyed.
- **"Reduce code where possible to fix these"** — a fix that adds a guard is usually the wrong fix.
- **The comment standard is his own hand-edits** in `da096de5`.

**Uncertain**

- The favorites quit gate is argued from the baseline's own drain code, not measured against Electron's real `before-quit` ordering.
- `Compactions: 2` is best-effort.

---

### Recent Sessions

- 07-22 · `contexts-spaces` · Contexts & Spaces: the registry model, title-keyed frontmatter, the three-scope rename cascade.
- 07-14 → 20 · `1968ae09` · Cards view end-to-end plus the certified cleanup campaign.
- 07-14 → 16 · `nav-gallery-pins` · Navigation surface + NavPane/NavWindow redesign, then Multi-Tab Nexus.

### Working Notes

- **Gates:** `env -u ELECTRON_RUN_AS_NODE npm run typecheck` (the ONLY type gate) + `npx biome lint src` + `npx vitest run` + `… npm run build`; read the summary line, never a piped exit code (`set -o pipefail`). Biome auto-formats on write — never run it, never hand-align.
- **Serialize every tree-touching agent.** One writer at a time, and confirm the tree has actually stopped changing before starting the next.

### Rules

- Resolve = delete + route, never tag — no (resolved) / (fixed) tombstones.
- No standing content here — Pending Focuses / Fix Log / durable rules live in `Context.md`.
- One block per session, in place; parallels share the doc, never edit another's block.
- Verify before finalizing — run the no-stale-state checklist.
