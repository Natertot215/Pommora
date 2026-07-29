# Post-Compact Brief — Property Syntax Unification

You are picking up mid-engagement. Nathan is asleep and unreachable. This file carries what the spec and plan do **not**: the working rules he set in conversation, the verification lessons that were paid for in real defects, and the corrections he made to my reasoning that a fresh agent would otherwise repeat.

## The Two Authoritative Documents

Read both before touching anything. They are the contract; this file never overrides them.

- **`.claude/Planning/Property Syntax Unification — Decision Log.md`** — the ratified spec. Survived three adversarial rounds. Decisions are referenced as `B-2`, `H-3`, `K-1a`.
- **`.claude/Planning/Property Syntax Unification — Implementation Plan.md`** — phases, steps, gates. Its **Execution Order — Authoritative** section overrides the document's own section order. Its **Nathan's Instructions — Verbatim** section is his exact words on execution, docs, and the final deliverable. Its **Working While Nathan Is Unreachable** section is the decision procedure when you are stuck.

**In one sentence:** page and agenda property values leave the ULID-keyed `properties:` map and become `{Property}` keys at the frontmatter root, Contexts move from `[Context]` to `[Context]`, values stay bare, and the removal of the old path is half the work rather than cleanup.

## Working Rules Nathan Set This Session

These are his, from conversation, and they are not all in the docs:

- **Removal is scheduled work, not cleanup.** "This plan should equally focus on REMOVING old shit, after the rework is done." Every merge names its loser and deletes it in the same phase.
- **The codebase must read as if the post-implementation state was always intended.** No stragglers, no "formerly" comments, no amendment trails.
- **Documentation is reworded, never amended.** "Don't ammend, keep flowing prose where they are, just reword or rewrite facts." A fresh reader must not be able to tell the old version existed. `Properties.md`, `Architecture.md` and `PommoraPRD.md` get larger rewrites.
- **No migration code, ever, for this change.** He is the only user. His nexus is converted by hand so no aid needs writing.
- **YAGNI is a hard filter.** He challenged the review findings directly — *"Are these flags actual issues or is this over-protection that would only be dust in a month?"* — and he was right about one. A guard for an event needing a coincidence chain does not get built.
- **A fix that is also a simplification is the good kind.** The rename went from three passes to one because the correct design was smaller, not because it was safer.
- **He is unreachable.** Ask-before-designing is void; proceed on the best record and **disclose every assumption as you make it**. They go in the final deliverable.
- **Phone updates at phase boundaries and real blockers only.** Not routine progress.

## Verification Lessons — Each One Cost A Real Defect

- **Never conclude "dead" from a truncated search.** A `$ctx` grep piped through `head` cut off at ten lines and hid a second live decoder that would have silently dropped every cached status value.
- **A `$`-leading token in shell double quotes is an end-of-line anchor.** `"\$status"` finds 0; `-F '$status'` finds 54. This defeated the plan's own straggler gate twice. **Sanity-check any gate against a token you know is present before trusting a clean exit.**
- **`\'` does not escape inside single quotes.** The "corrected" grep became a hard parse abort. Test the command, not the intent.
- **The typecheck is blind at the IO seam.** `splitFrontmatter` returns `Json`, so every `.properties` access through it survives untouched. Five files depend on named steps, not on the compiler.
- **Verify every reviewer finding against the code before folding it.** One claimed `~/Test` had nine empty maps; it has zero. Another miscounted `$status` pages. Most were right — check anyway.
- **Test YAML behaviour by execution, never by inference.** Every sigil and merge claim in the spec was proven by running the repo's own `yaml`.
- **A test can pass while asserting nothing.** Three in the plan's first draft did: an NFC test with both literals precomposed, a YAML test with hardcoded keys that survives changing the sigil, an idempotence test inheriting the previous test's file.

## Corrections Nathan Made — Do Not Re-Derive The Wrong Version

- **Status as a *property type* is untouched.** Only the in-memory `PropertyValue.kind = 'status'` tag goes, as a consequence of the type-directed decoder. Groups, the option editor, the pill chip, Capsule and Checkbox all survive.
- **`$status` values were deleted from his vault, not converted.** Obsidian's own bare `Status:` frontmatter key is a different field and was deliberately left alone.
- **The PRD's "Connections are ID-keyed" line is reframed, not deleted** — the slot holds a real claim, so it states the true one: no on-disk reference carries an id.
- **No leading-`_` ban on property names.** The wrap is the namespace boundary; reserved ids only ever appear unwrapped. He caught this; the guard was for a collision that cannot occur.
- **Sigils are single, not doubled**, and `[[…]]` is reserved for a possible Connections-in-frontmatter future and to avoid colliding with wikilinks-as-values in his dual Obsidian vault. His reasoning, better than mine.
- **The registry `order` array stays.** The earlier suggestion was to fold ordering into list position; ordering itself was never in question.

## Agent Discipline

- **Serialize every agent that touches the tree.** One dispatch once became thirteen agents writing concurrently. Confirm `git status` is quiet before the next writer starts.
- **Forbid sub-agents in every brief.**
- **Every review brief carries the settled-decisions block** from the plan's Review Briefing section verbatim. Without it, reviewers spend their findings re-arguing the journal, the sigils and the sidecar keying — all settled here, all invisible to fresh eyes.
- **Do not send a comment-killer** at `propertyValue.ts`, `removeProperty.ts` or `pipeline/value.ts`. Their comments explain genuine whys, and two of them are what made the decoder consolidation findable.
- **Stage explicit paths, never `git add -A`.** A dir-level add has swept a parallel session's work into an unrelated commit.

## State At Handoff

**Done:** spec ratified (three rounds). **Plan certified** — three review rounds, the cap; rounds 1 and 2 found real defects in the plan and in my fixes to it, round 3 verified the load-bearing decision correct by execution and returned eight text repairs, all folded. `$status` stripped from 15 live pages and verified. The skills symlink fixed. The spec's stale Core line corrected.

**The plan is executable as written.** Its architecture was attacked three times and held; what kept failing was my *coverage mechanisms* — greps that did not parse, a typecheck blind at the IO seam, a delete sentinel that set instead of deleting. Those are fixed and each one is now stated in the plan as a trap rather than left implicit.

**Committed:** `229dd31c` (spec + plan + Nathan's manual README/BranchHandoff deletions), `ec2ff76b` (plan round-1 fixes), `b5618261` (plan round-2 fixes).

**Next:** execute Phase 1 onward, in the order given by the plan's **Execution Order — Authoritative** section (not its section order). Simplifier agent after each phase; the removal gate is its own deliverable, not a formality.

**Two traps that will bite an unattended agent, both now written into the plan but worth carrying here too:**
- The straggler gate **cannot return zero** for `.properties` — roughly thirty non-test sites are the Collection assignment list the spec deliberately keeps. Chasing it to zero deletes the thing the change preserves.
- The Context key wrappers must pass `layer: 'context'`. A layer-blind parse makes one Context assign delete a same-named property's values off disk.

**Not pushed.** 100+ commits on `contexts-spaces`. Pushing is Nathan's call and he has never given it.
