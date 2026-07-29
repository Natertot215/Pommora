## Handoff — Pommora React

> **User Prompt:** Reconcile how properties are keyed against how Contexts are, then unify the two — one wrapped, name-keyed syntax at the frontmatter root, and the removal of the old path as half the work.

### Session Summary — one syntax for every Pommora-owned key

**Session ID:** 65fae5a7-dad4-475d-902e-9bf624673db1
**Dates:** 07-27-2026 → 07-29-2026
**Model:** Opus 5 (1M context)
**Compactions:** 3
**Connectors:** none
**Commands:** /compact ×2 · /handoff · /studio-brainstorm
**Agents:** a 26-agent feature-doc audit (one Workflow, the session's only explicit opt-in) · build-breaking-agent ×7 (three spec rounds, three plan rounds, one final) · code-simplifier ×3 · comment-killer-agent across several passes · Explore ×5
**Skills:** studio-brainstorm · superpowers:writing-plans

**What Started:** `contexts-spaces` was merged and `Context.md` needed truing. That became a doc audit, the `tierN` retirement, a live-driven filter investigation, a whole-tree comment campaign, and an IPC simplification. Nathan then asked where SQL belonged, and the answer turned into the session's second half.

**What Happened Along the Way — the cleanup pass.** The audit put one agent on each feature doc, every finding grounded against real code. It caught a regression of mine: removing `migrateContexts` had removed the de-facto fresh-nexus seeder, since a fresh nexus minted below the version and so always ran the migration that wrote the registry. Nathan live-drove the filter and reported it "completely backwards" — three real problems, the worst being structural bands drawn from the container's Set tree rather than from surviving rows. A dozen defects were fixed, most pre-existing and unreported.

**What Happened Along the Way — the migration.** Scoping the SQL question found that the database had never run: `better-sqlite3` is compiled against Node's ABI, Electron needs its own, and `openDb`'s degradation path caught the failure on every launch. No nexus had ever contained the file. Vitest runs under plain Node, so every SQLite test passed against a database the product never had. `node:sqlite` removed the dependency and the failure class together.

Eight `.nexus/` files then moved into it, along with the block document buried inside two more, and the machinery compensating for whole-file writes — a coalescing engine, a drain contract, a quit gate — retired with them. An adversarial pass proved one of my stated premises false: `reconcileTabs` repairs entity references and returns an intact tab untouched, so the read-time normalization deleted with the JSON was load-bearing and came back. Both live nexuses were migrated by hand, so no migration code shipped.

**What Happened Along the Way — the property syntax.** Nathan asked why properties key by ULID inside a nested map while Contexts key by name at the root. The answer was that the two are mirror images: Contexts pay a rename cascade to buy file legibility, properties pay file illegibility to buy free renames, and they share no code. He'd already chosen legibility once, for Contexts; this was the symmetric half.

The brainstorm ran three adversarial rounds and the plan another three, and the pattern across all six was consistent: the architecture held every time, while every claim of the form *"this reuses existing machinery"* turned out to carry a constraint that didn't transfer. The rename borrowed its ordering from an operation that renames a folder; the delete sentinel was `null` where the writer only honours `undefined`; the straggler gate's `$`-leading tokens never executed because a `$` in double quotes is an end-of-line anchor. Each was caught before code, one of them twice.

Nine phases shipped. The one regression that reached a commit was mine and the simplifier caught it: five switches lost their `case 'status'`, four correctly — they discriminate on the value's kind — and the fifth wrongly, because it discriminates on the declared type. Every Status filter matched every row, silently, with a green suite and no Status filter test in existence to notice.

**What It Ended With:** 93 commits, every one gated green — closing state **typecheck 0 · lint 0 · 1857 tests / 177 files · build clean**. `main` is pushed. The live nexus was hand-converted and verified on disk: zero `properties:` keys, zero ULIDs on any page, zero empty cache blocks. Production code is **+97 lines** against a spec that committed to a net reduction — the removal half landed in full, the additions were simply larger than estimated.

**Next Session:**

- **Live-verify the app against the converted nexus.** Every gate is green and the disk is right, but no screenshot was taken of a table rendering the new keys — the one thing asserted rather than seen.
- **The redundant-identity sweep** logged in `Context.md`. The Status tag was one instance; the pattern is anywhere "what this is" resolves from two places.
- **Definitions into `nexus.db`** is now materially safer — frontmatter is self-describing, so losing the registry costs presentation config rather than readable values. Gated on the database gaining a real migration path.

**Lessons Learned**

- **A fact with two sources is a defect, not untidiness.** Nearly every bug in the first half was that shape. Remove the second source rather than reconciling the two.
- **Guard code divides by what it defends against.** Validating a byte pattern dies with the file; reconciling an id against a missing entity survives any storage change, because foreign keys cannot reach the filesystem. They look identical at the call site.
- **"Is this a why?" is the wrong comment test.** Nathan's is *"would I know this without the comment?"*
- **A green suite can test a thing the product does not have.** The SQLite tests passed for months under a runtime the app never uses.
- **Verify the premise, not just the diff.** The review's most valuable finding was not a bug in the code — it was a false claim in the reasoning that produced it.
- **The compiler is blind at the IO seam.** `splitFrontmatter` returns `Json`, so every `.properties` access through it survives a schema change untouched. Four files depended on named steps rather than a gate, and one of them would have made every option rename silently no-op.
- **A `$`-leading token in shell double quotes is an end-of-line anchor.** `"\$status"` finds nothing; `-F '$status'` finds 54. Sanity-check a gate against a token you know is present before trusting a clean exit.
- **A mechanical sweep across test files needs a verification pass, not just a careful pattern.** One regex would have rewritten `[Docs](url)` and `[[Beta]]`; another under-matched a multi-line fixture and failed three steps from its cause.

**Session Pointers**

- **`main/db/`** — `driver.ts` (the `node:sqlite` seam), `schema.ts` (`meta` + `local_state`), `open.ts` (version handshake), `localState.ts` (the one keyed store).
- **`main/io/tabsState.ts`** — `readTab` is deliberate and was restored after review; the renderer does not repair shape or lockstep.
- **The filter pipeline** — `Detail/Views/pipeline/`: `filter.ts` (`null` abstains, only `false` excludes), `group.ts` (`pruneEmptyGroups`).

**Landmines**

- **`nexus.db` is not regeneratable.** It holds the only copy of every machine's chrome. A schema bump drops it, which costs a user their folds and tab set once — the schema stays small so that trade stays obvious.
- **It also lives inside the nexus folder.** A file syncer over a WAL database is a known corruption vector, and one event now costs eight surfaces where it used to cost one sidecar.
- **The `.trash` layout mirrors the folder chain** a delete came from.
- **`rename` no longer accepts a Space, a Context, or a property** — all three are title-keyed and rename through their own cascade.
- **The straggler gate cannot return zero for `.properties`.** Roughly sixteen non-test sites are the Collection assignment list, which this change deliberately keeps. Chasing it to zero deletes what the change preserves.
- **The Context key wrappers must pass `layer: 'context'`.** A layer-blind parse reads `<Projects>` as the Context "Projects", and since the two layers may share a name, one assign would delete that property's values off disk.

**User Feedback**

- **"Whatever we do must ensure DB actions are cheap, scoped, and don't do a full-pass when they don't need to. HARD YAGNI here."**
- **"Don't take this direction unless you've looked and it's the right move, I might be wrong"** — he was right about block layout, and asked to be checked rather than obeyed.
- **"Reduce code where possible to fix these"** — a fix that adds a guard is usually the wrong fix.
- **The comment standard is his own hand-edits** in `da096de5`.
- **"Are these flags actual issues or is this over-protection that would only be dust in a month?"** — he was right about one of three, and the guard came out.
- **"stop pausing"** and **"stop writing code with bugs"** — phase-boundary reports were costing more than they returned, and two of my own edit scripts shipped defects.
- **"[Context] + {Property}, not (Context) + <Property>"** — then, shown that both bracket forms only parse quoted, he chose no-quotes over the shapes.

**Uncertain**

- The favorites quit gate is argued from the baseline's own drain code, not measured against Electron's real `before-quit` ordering.
- `Compactions: 3` is best-effort.
- **No live-app verification of the converted nexus.** Gates are green and disk state is confirmed, but nothing was rendered and looked at.
- **The `+97` production line count** is measured with comments and blanks excluded; the boundary between "production" and "test" is a filename match on `.test.`.

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
