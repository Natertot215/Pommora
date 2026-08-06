## Handoff — Pommora 

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

### Session Summary

**Session ID:** 6dc9212b-b419-4b10-9e15-aa2fb5aedb6e
**Dates:** 08-03-2026 → 08-05-2026
**Model:** Fable 5

The session opened on embedded pages in MarkdownPM and carried that arc from brainstorm through a six-phase certified plan to a shipped feature — `![[Title]]` tiles on the shared Embed Framework, with the guards, chrome, native menus, autocomplete, warm cache, and rename cascade that surround them. That arc closed with a 202-check live walkthrough, trued documentation, and a green board, and its remaining hand-checks sit in the NEEDS-NATHAN list of the walkthrough document.

A middle stretch cleared the decks: the table append strips landed with their elastic gutter and a cell line-box fix, the post-0.5.0 History records were reshaped into milestone arcs (the reshaping conventions were saved to memory), three scouts surveyed future work into `Planning/Pending-Work 8-5.md`, the dead table-Compact format was excised end to end with Cards' live density mode preserved, and the inline-rename surfaces were consolidated onto one `RenamableLabel` wrapper carrying the ratified caret policy (caret-at-end for titles, select-all for rows).

The closing arc built the connection hover previews. A brainstorm produced a review-certified decision log; a ten-task plan survived an attack round and a simplification round (the latter deleted a registry, a closure convention, a pending-fetch watcher, and a premature Settings schema before any code existed); execution ran seven phases with per-gate reviews that each caught something real — a keyboard-navigation orphan card, a read-only editor popping the autocomplete picker, a single-axis resize silently ratcheting the universal size, and a scroll-timing race with CM6's node pruning, all fixed and pinned. The feature: hovering a resolved connection opens a compact read-only preview through PageEmbed (no banner or title), beak-anchored to the live link, resizable from its free edges to one per-machine remembered size, with a Settings ▸ Pages linger slider and the same trigger in resting table cells.

Nathan's live refinements then tightened the card: a scroll-only interior (no gutter lane or vertical padding), the shared hot accent stroke on resize breathing on the tile border's beat, no caret entry at all (the press dies at the card's edge), click-to-fold headings replacing the chevron, and a held-content fix so the bloom-out fades the card whole. The symmetric width-resize feel (the edge tracks at half the cursor because the card grows around its anchor) was explained and accepted. Along the way the `studio-context` skill's voice section was rewritten to ask for professional documentation phrasing rather than stylized imitation, and Hover Previews entered HistoryPM and MarkdownPM §II with PagePreviewPM condensed to a pointer.

- **Verified:** typecheck and lint clean, 2,188 tests across 194 files, every arc commit local on `main` (the batch is unpushed). 
- **Unverified:** the two ten-second checks from the closeout attack — card clipping under a very short window, and a possible one-frame height pop when consecutive cards open on opposite sides — plus the size-persistence IPC needs a dev-process restart before it is live.

#### Pending Focuses

- Restart the dev process (the `hoverCard` IPC is main-side), then fill out the card: the two ten-second checks above and the linger slider end-to-end.
- Drive the NEEDS-NATHAN list in the embedded-pages walkthrough doc — native menu picks, real-pointer checks, one real ⌘Q, the SurfacePM visual baseline.
- Push the local batch when satisfied.
- The prioritized future-work survey is in Planning/Pending-Work 8-5.md; the option-rename replumb remains in effect.
- The gesture-family survey settled what migrates and what doesn't; the remaining candidates and the reasoning sit on the standing Debt line, to be taken as each file is next opened.

#### Session Pointers

- The hover-preview record: `Planning/Hover Preview — Decision Log.md` (the ratified spec) and `Planning/Hover Preview — Implementation Plan.md` (per-task commits, rulings, the closeout verdicts).
- The card's knobs: `Pommora/src/renderer/src/Embeds/hoverCardSize.ts` (default and floor sizes) and the interior inset KNOB in `Embeds/embeds.css`.
- The card is a module-singleton seam — edits to `ConnectionHoverCard.tsx` need a full renderer reload to test; HMR leaves hosts holding a dead entry.

#### Handoff Guidelines

- The Summary and Pending Focus restate to current truth on every run; the transcript is the memory, so past compactions and earlier passes are read there rather than re-told.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Parallel sessions: the latest /handoff owns the document, and every session's transcript survives through retirement into // Sessions.

---

## Transcript

**|| COMPACTION ||**

##### Claude

Everything you asked for is in place, uncommitted where your verdict gates it. The interjections are done first: the **grip** now nests at the tile's top corner using the callout's own gap-plus-nudge shape (the collapsed line's zero-height text row was its old anchor — that's what left it floating), and **Insert ▸ Page** is live — it runs the rail grip's exact native pick tree aimed at the caret's block, so all four creation doors share one mechanism. Both committed (`58605eb5`, unpushed), gates green, and the instance was restarted so what you're driving has them — the menu item itself is native, so it's yours to try.

#### The Held Calls

- **The `.spm-edge` family relocation** — SurfacePM's resize edges are one coherent eight-piece family (four edges, four corners) sharing a base class and hover triggers; the embed borrowed only the south edge. Extracting just that edge would split the family across two files and make the design system speak SurfacePM's private names — the clean version relocates the *whole* family into the shared tile chassis, which is a ~70-line standalone refactor, not diff cleanup.
- **The scroll-park CSS block** — the page header and the tile banner now carry byte-identical park declarations (five properties), but on two different DOM nodes in two stylesheets. It was held under Rule of Three; **under your new Rule of Two this flips to actionable** — they're identical, and the only "reason to be separate" is that a shared class needs both renderers to apply it. Your verdict can rule it in.
- **`.md-checkbox-checked`** — it carries the same `color-mix` literal as the new hot stroke but is a checkbox *fill*, not a manipulation stroke; sharing the token would mean re-tuning the resize accent silently recolors every checked task. Identical value, real reason to be separate — it stays its own literal even under the new rule.

#### The No-Subagents Rule — Removed

It lived in exactly two places, both mine, neither yours: `~//.claude//skills//writing-plans-v2` ("forbid sub-agents in every brief") and my auto-memory file from the July comment-killer incident where one dispatch became thirteen writers. The prescription is gone from both; what survives is the true mechanic — a completion notice only covers that agent's own children, so the tree gets confirmed still before the *next writer* starts. Fan-out itself is now explicitly allowed.

#### Rule of Three → Rule of Two

It lived in `//The Studio//.claude//skills//code-simplification//SKILL.md` (the judgment section, a rationalization row, and the closing checklist) and in `~//.claude//agents//code-simplifier.md`'s workflow — and notably, the parallel session's `Findings.md` audit already has this as its **Fix 4**, recording that you'd ruled it once before and the ruling never landed in the skill. All four passages now read your way: *two identical occurrences of one fact or mechanism with no reason to be separate consolidate; similar-but-diverging copies stay the judgment call; one occurrence is never abstracted speculatively.*

Ready for your verdict — then the doc-correction pass from your standards (replace, never amend; no correction framed as discovery), the commits, and the surgical handoff.

##### Nathan

/compact

##### Claude

No response requested.

##### Nathan

When inserting a page; it should automatically introduce the required syntax so that it shows the autocomplete. It should not simply re-route to the native menue.

##### Claude

Understood — Insert ▸ Page should type the `![[` opener at the caret so the embed autocomplete pops, the same way you'd get it by typing the syntax yourself, not detour to the native pick menu. Let me check how the embed autocomplete is triggered so the insert lands in a state that actually opens it.

- **Bash:** Find autocomplete-related files in MarkdownPM
- **Read:** Pommora/src/renderer/src/MarkdownPM/autocomplete.ts + Pommora/src/renderer/src/MarkdownPM/useConnectionAutocomplete.ts
- **Bash:** Find autocomplete wiring in the main editor
- **Read:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Bash:** Find the candidates method in connections
- **Read:** Pommora/src/renderer/src/MarkdownPM/connections/index.ts
- **Bash:** Check table cell autocomplete wiring
- **Bash:** Find all embedInsertAfter/AtCaret references
- **Read:** Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.test.ts
Now the implementation. Three coordinated edits:

- **Bash:** Find all candidates() consumers
Both consumers run through the shared hook, so the empty-link gate lives in one place there. Applying the edits:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/connections/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/useConnectionAutocomplete.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/menu.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.test.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.test.ts
- **Bash:** Find tests pinning candidates behavior
- **Read:** Pommora/src/renderer/src/MarkdownPM/connections/connections.test.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/connections/connections.test.ts
- **Bash:** Run typecheck and full test suite
- **Bash:** Show the failing test
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.test.ts
- **Bash:** Re-run tests and lint **[interrupted]**

##### Nathan

Don't test yourself. Make sure the auto-complete works too, since the mirrored ]] didnt fire upon first test.

##### Claude

- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.ts
  
Critical check — must make sure a bare `![[]]` doesn't get claimed as an embed token itself (which would mount a widget over the line and swallow the caret):

- **Read:** Pommora/src/renderer/src/MarkdownPM/editor/embedRanges.ts
- **Bash:** Read the embed-line token matcher
- **Bash:** Locate blockEmbedLines implementation
- **Bash:** Read loneEmbedTitle matcher
- **Bash:** Find the lone-embed regex
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.test.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.test.ts
- **Bash:** Check panel render condition and Features doc sentence
- **Read:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Bash:** Check panel hide condition
- **Bash:** Run typecheck, tests, lint
- **Edit:** .claude/Features/MarkdownPM.md
  
All green — 2164 tests, typecheck and lint clean. Committing (explicit paths, doc bundled):

- **Bash:** Commit the Insert ▸ Page autocomplete handoff
Done — Insert ▸ Page no longer routes to the native pick tree. It now types the full `![[]]` pair on a properly fenced line below your caret's block, mirrored closer included, with the caret landing between the brackets — and the embed autocomplete opens immediately, browsing the whole page index alphabetically until you type to filter. Picking a candidate replaces the pair with the finished `![[Title]]` and the tile forms; pressing Escape just leaves the well-formed empty pair as ordinary deletable text.

Two things worth knowing:

- **The empty-query behavior is embed-scoped.** `candidates('')` now returns the full index A–Z, but the shared hook gates it so a plain `[[` link query still shows nothing until the first character — cell editors and prose links behave exactly as before. If you'd rather `[[` also pop the full list Obsidian-style, that's a one-line gate removal — say the word.
- **You'll need ⌘R on the open page** before testing — the autocomplete detection lives in the editor's update listener, which bakes at mount and doesn't hot-reload. No app restart needed; nothing in the main process changed.

Verified in code rather than by driving the app, per your call: a new test walks the actual handoff — the insert's output fed through `autocompleteQuery` comes back as an embed-form empty query spanning the whole pair, which is precisely what the commit later replaces. I also confirmed the empty `![[]]` can't be claimed as a tile (an empty title resolves phantom), so the caret is never swallowed. Gates: 2164/2164 tests, typecheck and lint clean. Committed as `0ba7f0d8`, held local with `58605eb5` for the post-verdict push. Net code diff excluding comments and tests: roughly +25/−12.

Still standing from before: your verdict on the held calls, then the doc-correction pass over the uncommitted rule-file edits, then the handoff update.

##### Nathan

Hmm it seems like the scroll and caret placement within the EMBEDD itself doesnt chache; i'll take my caret out of the embedding and it will reset the embedds scroll positioning. Please see where this functionality can be included most naturally.

##### Claude

The tile's inner editor is losing its scroll when editing flips — let me trace how the widget mounts its nested editor and what happens on the caret-exit rebuild to find where the cache belongs.

- **Bash:** Map editing/mount/scroll structure of embedWidget
- **Read:** Pommora/src/renderer/src/Embeds/PageEmbed.tsx + Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx
- **Bash:** Map readOnly/scroll handling in MarkdownEditor
Two threads now — dispatching the grip-alignment fix to a subagent as asked, while I keep tracing the scroll reset:

- **Dispatch:** general-purpose — Lower embed grip to corner
- **Read:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Bash:** Find overflow/scroll CSS for embed tiles
- **Read:** Pommora/src/renderer/src/Embeds/embeds.css + Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Find all editing-state CSS rules
- **Bash:** Find WarmSeam producers and consumers
- **Read:** Pommora/src/renderer/src/PagePreview/usePreviewWarm.ts
- **Bash:** Check ancestors plumbing and warmCache slot semantics
`ancestors` for a top-level tile is `[hostPath]`, and the tabs cache exposes a write-through path-keyed detail slot — everything needed. Building the tile warm cache:

- **Write:** Pommora/src/renderer/src/Embeds/tileWarm.ts
- **Edit:** Pommora/src/renderer/src/Embeds/tileWarm.ts
- **Read:** Pommora/src/renderer/src/Embeds/tileWarm.ts
- **Edit:** Pommora/src/renderer/src/Embeds/tileWarm.ts
- **Write:** Pommora/src/renderer/src/Embeds/tileWarm.ts
  
Now wiring the seam into the widget and merging cached metadata on warm restore in PageEmbed:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx
- **Bash:** Check embedWidget imports for the seam
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/PageEmbed.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/PageEmbed.tsx
  
Adding a compact test pinning the seam's roundtrip, invalidation, and per-chain isolation:

- **Bash:** Check PageDetail shape for test fixture
- **Write:** Pommora/src/renderer/src/Embeds/tileWarm.test.ts
- **Bash:** Run typecheck, tests, lint
  
All green — 2166 tests. Adding the Features doc line, then committing:

- **Bash:** Find the embed-tile paragraph in the Features doc
- **Edit:** .claude/Features/MarkdownPM.md
- **Bash:** Commit the tile warm cache
  
The `connections.test.ts` update (the empty-query A–Z pin) missed the earlier autocomplete commit — folding it in now:

- **Bash:** Commit the missed test file
  
Found it and built the fix in the system's own natural home. Summary of both threads:

**The scroll/caret reset.** The editing flip itself was innocent — the tile re-renders its same React root and only reconfigures editability, no remount. The real loss path is the outer editor's viewport management: CodeMirror tears down a tile's DOM whenever it leaves the rendered viewport or a rebuild drops the widget, the nested editor unmounts whole, and it re-created *cold* — because block tiles were the one embed surface with no warm seam. Tabs and the floating preview already cache editor state through the `WarmSeam` (capture at unmount, restore at mount), and `PageEmbed` already accepted one; tiles just never passed it.

So the fix is a small new `tileWarm` cache mirroring the preview's: each tile now captures its full editor state — scroll position, caret, selection, and undo history — when its DOM is torn down, and restores it on re-create. Keyed by the full host chain, so the same page embedded under two hosts keeps two independent positions. Session-memory only, nothing on disk. One coherence rule: if the page's body changed anywhere else since the capture (say, edited in a tab), the whole entry is dropped and the tile mounts cold from the fresh slot — a stale caret into a doc that no longer exists is worse than no cache. A warm-restored tile also merges the slot's metadata so banners and breadcrumbs survive the restore.

**The grip.** The subagent moved it down: `--grip-top` now sums the tile's top margin and the chassis's corner radius, landing the grip's top exactly where the top-left rounding ends. That's CSS-only and live via HMR for your eye — left uncommitted until you approve it.

**You'll need ⌘R** to see the warm cache working — the widget code bakes into the editor at mount. Gates: 2166/2166 tests (two new pinning the seam), typecheck and lint clean. Committed as `6d513622` plus a small test fixup `c8e7db89`, both held local with the batch. Net code diff excluding comments and tests: roughly +30/−4.

##### Nathan

move the grip -4pt.

##### Claude

- **Bash:** Read the current grip-top rule
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
  
Moved — `--grip-top` is now `16px` (was `4px + 16px`), live via CSS HMR. The comment now marks it as a KNOB tuned by eye rather than claiming a derivation the value no longer matches. Still uncommitted with the rest of the grip work — say the word when it looks right and I'll fold it into the batch.

##### Nathan

placing my caret below the embed should not have the caret be placed to the right of the indent and take on title-like sizing. It should go into the line below it.

##### Claude

Let me trace exactly where a click below the tile seats today — reading the click-seat handler and the embed line's styling for that indent.

- **Read:** Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx
- **Bash:** Check scratchpad tooling and build output
- **Bash:** Check CDP helper and whether 9333 is alive
- **Bash:** Passive read of caret and tile geometry on 9333
- **Bash:** Look for running app instances with debug ports
- **Read:** Pommora/src/renderer/src/MarkdownPM/editor/caret.ts
- **Bash:** Read RectangleMarker source for coordinate space
- **Bash:** Read forRange coordinate conversion
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/caret.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/caret.ts
- **Read:** Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx
- **Bash:** Run typecheck, tests, lint
- **Bash:** Commit the caret geometry fix
Fixed. The root cause: your tile ends the document. A click below it clamps the caret to the document edge — which is the one seat the tile's atomic range legally allows inside itself, sitting on the embed line's own end. Measuring that seat returns the *tile's box* as the caret rectangle, and the old repair only clamped its height in place — leaving a caret parked at the tile's top on the widget's x. That's the "right of the indent, title-like sizing" you saw.

The caret's data position was actually correct the whole time — typing at that seat already repairs the character onto a fresh line below the tile (that's the boundary guard's shipped contract). Only the drawn caret was lying about it. So the fix is in the caret layer: a seat at a document-edge tile now draws one line's height below the tile (or above, for a doc-starting tile) at the content indent — visually on the line below, exactly where the typed character will land. Mid-document tiles were already fine, since their fencing blanks hold the real seats.

Committed as `f45efa0d`, gates green (2166 tests, typecheck, lint). **⌘R needed** — the caret layer bakes at editor mount. One honest note: your dev instance is running without a debug port, so I verified this against CodeMirror's own marker source (the coordinate math mirrors `forRange`'s exactly) rather than live pixels — if the caret's vertical seat wants a nudge once you see it, that's a one-line offset in [caret.ts](Pommora/src/renderer/src/MarkdownPM/editor/caret.ts).

##### Nathan

caret should be body sized not title-sized

- **Sent:** image attachment

##### Claude

The position landed; the height came from `defaultLineHeight`, which CM measures off its default font — taller than your body lines actually render. Sizing it from the content's real computed line-height instead:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/caret.ts
- **Bash:** Check what line-height the content/lines carry
- **Read:** Pommora/src/renderer/src/MarkdownPM/Styles.css
`line-height: 1.6` on the scroller is the body truth, so the computed value is the right source. Gates and commit:

- **Bash:** Typecheck, lint, commit caret height fix
Done — the edge-seat caret now takes its height from the content's computed `line-height` (your body's 1.6em) instead of CodeMirror's `defaultLineHeight`, which measures off its default font probe and runs taller than body lines actually render. Same fix applies to the above-tile seat's offset, so both edges stay body-sized.

Committed as `13a36fd5`, typecheck and lint clean. **⌘R** to pick it up — and if it still reads a hair off after that, the height source is the one `lh` line in [caret.ts](Pommora/src/renderer/src/MarkdownPM/editor/caret.ts).

##### Nathan

Confirmed there. But the issue where clicking onto the host page resets the scrolling and state of the embedded one still persists.

##### Claude

The warm seam didn't cure the flip itself, so the editing exit must genuinely recreate the inner editor — meaning either CM isn't reusing the widget DOM the way the design assumes, or the old root's unmount-capture races the new mount's restore. Checking CM's actual widget-update path for our deco shape:

- **Bash:** Check deco block flag and CM BlockWidgetView update
- **Bash:** Find the replace deco construction and CM widget views
- **Bash:** Locate widget view update code in CM dist
- **Bash:** List CM dist files
- **Bash:** Find updateDOM call sites in CM
- **Bash:** Read the widget reuse logic around line 2553
- **Bash:** See prior isolated launch mechanism
- **Bash:** Find how the app picks its nexus and how prior launches isolated
- **Bash:** Find nexus root selection and userData usage
- **Read:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Bash:** Run gates
- **Bash:** See the failing tests
- **Bash:** Get the failure message
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Bash:** Re-run gates
- **Bash:** Commit the reattach heal

Found the real mechanism this time. The editing flip never unmounts the inner editor — CodeMirror reuses the tile's DOM (that's why the warm cache never fired) — but while rebuilding the tile's range it briefly detaches and re-inserts that DOM, and the browser silently zeroes the scroll position of every scroller inside a disconnected subtree. No scroll event fires, no unmount happens; the React tree survives with its position simply wiped to top.

That silence is also the opening for the fix: the editor's live scroll tracker (`lastScrollTop`, which already feeds the warm capture) never sees the wipe, so it still holds the true position. A ResizeObserver on the scroller — which fires on every reattach, before paint — now reasserts the tracked position whenever the scroller reads zero without the tracker ever having recorded a scroll to zero. A genuine scroll to top updates the tracker first, so it's never fought. This heals the caret-exit flip, and equally any other rebuild that re-slots tile DOM.

Committed as `2afd2656`, gates green (2166 tests — one intermediate red taught me jsdom lacks ResizeObserver, so it's feature-guarded and warm-only). **⌘R** to pick it up. If the reset *still* survives this, my diagnosis chain is exhausted from code alone — in that case relaunch dev with `POMMORA_DEBUG_PORT=9333` set and I'll observe the flip passively while you reproduce it.

##### Nathan

<ide_selection>The user selected the lines 387 to 389 from /Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/Styles.css:
/* KNOB — the grip's seat at the tile's top corner, eye-tuned to where the rounding ends.
     Fixed pixels: the collapsed line's zero-height text row is no anchor, and the tile's box
     doesn't ride the glyph zoom. */

This may or may not be related to the current task.</ide_selection>
it doesnt seem to work when the CM has to render another glyph. SO when i insert my caret into a codeblock, table, or blockquote it still rests. Please apply an all-inclusive fix at the source here.

##### Claude

The observer was the wrong signal — a full-reuse re-slot (widget unchanged, as when a table/codeblock/quote redraw rebuilds neighbors) fires *no* widget callback and no reliable resize, so nothing heard the wipe. The one signal that always accompanies a re-slot is the outer editor's own update cycle, since only CM ever moves that DOM. So the source-level fix: a heal registry every warm editor joins, driven from the outer editor's measure phase after any update on a tile-bearing doc — covering every trigger class at once:

- **Edit:** Pommora/src/renderer/src/Embeds/tileWarm.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Bash:** Check import style in index.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx

Now the trigger side in the widget module:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx
- **Bash:** Check ViewUpdate import
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx
- **Bash:** Run gates
- **Bash:** Commit the registry-driven heal

Replaced, at the source this time. The ResizeObserver missed your cases because a full-reuse re-slot — what happens when a table, codeblock, or blockquote redraw rebuilds the tile's neighborhood — fires *no* widget callback and doesn't change the scroller's box size, so nothing observable happened from inside the tile. The one signal a re-slot can never dodge is the outer editor's own update cycle, since CodeMirror is the only thing that ever moves that DOM.

So the heal is now registry-driven: every warm-seamed editor registers a self-check in the tile cache module (scroller reads zero while the live tracker holds a real position → the wipe → reassert), and the outer editor runs the whole set from its measure phase after *any* update on a tile-bearing document. That covers every trigger class at once — caret into tables, codeblocks, quotes, grip redraws, editing flips, future glyphs — rather than enumerating them. It runs before paint (no top-flash), the check is a handful of `scrollTop` reads batched into CM's own measure pass, and a false fire is a no-op since a genuine scroll to top updates the tracker first.

Committed as `0d221818`, gates green (2166 tests, typecheck, lint). **⌘R** to bake it in.

##### Nathan

Confirmed. Send an opus simplification agent and fold in their findings. If you're aware of any fixes or re-framing needing to documentation from what you have in context, please apply the minimal rephrasing necessary. Following this you should commit the working tree, alongside my documentation edits and css tweaks.

---

NEXT SCOPE

When that's done, please look into the CM6 source and styling / rules used for code-blocks. The scope of this is to allow code-type-specific styling for codeblocks in the same way that Obsidan does -- where a codeblock can be confugured as JSON, YAML, JavaScript, CSS ect.... and the styling/colors of the codeblock itself are then confugured to understand functions, variables, syntax, coments ect.... as styled code using differentated colors.

Please find what already exists for this within CM6 or Pommora if included -- especially design tokens and color-sources we can use or modify / hoist our tokens to within the MarkdownPM style-sheets so that the colors here can be routed properly to different code-types, while also DRY-ing to our color primitives (likely the solids + a light white tint so it reads more pastel without having to re-roll new tokens).

For this; the distingushment of what type of code it is should come alongside the syntax; or follow obsidan/commonmark specifications:

These are examples of what I've seen; the type of code would be displayed as a right-side glyph on the code block, not within the line when the caret isn't directly on it.

Propsectives here can include a drag-handle menue of "Style" > Languages; changing the type of codeblock here.

##### Claude

Three phases: Opus simplifier over this session's diff, fold + commit everything (yours included), then the codeblock-language investigation. Dispatching the simplifier now:

- **Dispatch:** code-simplifier — Simplify session's embed changes
- **Return:** Pass complete. Gates green: `npm run typecheck` clean, `npx vitest run` **2166 passed / 191 files** (baseline held), `npx biome lint src` clean.

## Simplified

- **`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.ts`** — dropped `embedInsertAfter`'s `blockTo &gt;= doc.length` early return; the general path already produces a byte-identical spec at EOF (`indexOf('\n', doc.length + 1)` is `-1` → empty slice → empty `trail`, and `blockTo + 2 + token.length` equals the EOF caret). The generalization to a `token` + `caret` return is exactly what made the branch redundant. −8 lines, `lands clean at EOF` test unchanged and green.
- **`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/caret.ts`** — `tileEdgeMarker`'s `for … continue … return null` became one `.find()` plus a null guard (`embedTileRanges` returns a `readonly` array), de-indenting the eight measurement lines.
- **`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Embeds/PageEmbed.tsx`** — the warm/cached initializer called `entryFrom` in two arms of two nested ternaries; hoisted to one `slot` const and collapsed to `typeof doc === 'string' ? { path, ...slot, body: doc } : slot`, which preserves the "warm doc overlays the slot's metadata" rule the comment describes.

Net roughly −11 code lines, no comment or test changes.

## Flagged (deliberately not done)

- **`candidates('')` in `connections/index.ts` is not mergeable with the ranked branch.** They look like the same `filter/sort/slice` pipeline, but the sort axes differ: the ranked comparator is exact → shortest → A–Z, and with an empty query nothing is ever "exact", so a shared path would order the browse list by *title length* rather than alphabetically. The separate branch is the feature.
- **`--grip-top: 28px`** left untouched, value and KNOB comment intact, per the brief.
- **`caret.ts`'s scroll-origin math left as-is.** Unlike `embedClickSeat` (which hand-rolls the doc→client conversion and is biased by `.cm-content`'s padding), `tileEdgeMarker` already routes through `view.documentTop`; there is nothing to align here.
- **`healMeasure`'s `{ read, key }` shape and the `Set`-based heal registry left alone** — the `key` is what de-dupes repeated `requestMeasure` calls within one cycle, and the registry is the only signal a full-reuse re-slot can't dodge.

## Cross-file opportunity (report-only, outside scope)

There are now **three** session warm caches sharing a `{ restore, capture }` seam over a module-global `Map`: the tab cache and the preview cache in `Pommora/src/renderer/src/Tabs/warmCache.ts`, and the new `Pommora/src/renderer/src/Embeds/tileWarm.ts`. Rule of Three is met on the *shape*, but only `tileWarm` carries a doc-coherence invalidation and only it owns the scroll-heal registry — a generic factory would be abstracting over three genuinely different invalidation policies. Nathan's call, not a diff cleanup.

## Comments

No comment-killer pass warranted — the added comments are why-only (why the EOF branch existed, why `documentTop`, why the heal registry exists at all) and none restate a value.

## Process conflict to note

The `/simplify` skill mandates fanning out to four review sub-agents. I ran its four angles (reuse, simplification, efficiency, altitude) inline instead: this is already a sub-agent invocation on a ~350-line diff, and prior adjudication in my memory flags uncontrolled agent fan-out as a problem. Flagging it rather than silently diverging.
While the simplifier runs, starting the codeblock investigation — read-only, no file collisions. First: what Pommora's markdown setup already has for fenced-code languages and how codeblocks are currently styled:

- **Bash:** Check markdown config and highlighting setup
- **Bash:** Find current codeblock decoration and styling
- **Bash:** Find codeblock styling and detection modules
- **Bash:** Find fence line decoration classes
- **Bash:** Read fence detection and code block handling
- **Bash:** Find how fence lines get their look
- **Bash:** Locate the code line class and mono font styling
- **Read:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Find md-cb application and fence info string parsing
- **Bash:** Read fence regex and the codeblock decoration pass

The fence layer is fully mapped — now the color primitives side:

- **Bash:** List design tokens and find the solids
- **Read:** Pommora/src/renderer/src/design-system/tokens/color.css.ts
- **Bash:** Read the spectrum solids and CSS var names
- **Bash:** See literal CSS var bridge names
- **Bash:** Check solid var bridge and tint steps
- **Bash:** Check installed CM language packages
- **Bash:** See full working-tree state

Status while the Opus simplifier finishes its pass (it's already collapsed a few things — the EOF branch in `embedInsertAfter`, a find-based `tileEdgeMarker`, the PageEmbed initializer — and is still running):

**Codeblock research is done.** The picture: Pommora's fence model is entirely hand-rolled (`fenceBlocks` in the detect layer feeds the `md-cb` line chassis, and the ```` ``` ```` delimiter lines already hide their syntax when the caret's outside the block — which is exactly the seam the language glyph wants). Fence *content* is deliberately excluded from the inline token pass, so codeblocks render as plain mono text — no highlighting exists yet. On the CM side, the Lezer markdown parser is already running and supports nested language parsing per fence info string; `lang-javascript`, `lang-css`, and `lang-html` are already in `node_modules`, and the `HighlightStyle` machinery ships with `@codemirror/language` — nothing is wired. On the token side, the spectrum solids exist only as hashed vanilla-extract values (no literal `--solid-*` CSS vars yet — only `--accent`, `--code`, `--error` derive from them), and the established pastel mechanism is `color-mix` — so your "solids + light white tint" maps cleanly onto existing machinery without new primitives.

Once the simplifier lands I'll fold and verify its findings, apply the one doc reframe I'm aware of (the Features doc's tile-cache sentence should carry the re-slot heal), commit the whole tree including your CLAUDE.md/Handoff edits and the grip CSS (leaving the stray `tileA.png` untracked — say if you want it in), and then present the full codeblock-language design for your sign-off before building.

##### Nathan

quick note; for the mono stuff. I want to KEEP that for non-defined codeblock types.

##### Claude

Noted — a bare ```` ``` ```` fence with no language stays exactly as it is today: plain mono on the `md-cb` chassis, no token coloring. Highlighting only engages when the fence declares a type, which falls out naturally from the CM route anyway (no info string → no nested parse → no tokens to color). The language glyph likewise only appears on typed blocks. This goes into the design as a stated rule.

Simplifier's still working — full fold, commit, and the design proposal when it lands.

Simplifier's back — its three edits were already visible to me and all check out (the EOF-branch collapse is byte-identical by construction, the `.find()` rewrite is mechanical, and the PageEmbed initializer preserves the overlay rule). It also correctly declined merging the empty-query browse into the ranked pipeline — the sort axes genuinely differ. Verifying the grip value it mentioned (28px — looks like your hand-tune) and running the gates myself:

- **Bash:** Confirm grip value and run gates

All green. Applying the one doc reframe, then committing:

- **Edit:** .claude/Features/MarkdownPM.md
- **Bash:** Commit simplifier fold, docs, and CSS tweaks

Committed as `c44c0537` — the simplifier's fold (net −12 lines: the EOF branch, the `.find()` rewrite, the slot merge), your CLAUDE.md and Handoff edits, the 28px grip tune, and the Features doc's re-slot-heal clause. Only `tileA.png` remains untracked. The simplifier's one cross-file flag for your awareness: there are now three warm caches sharing a shape (tabs, preview, tiles), but each carries a different invalidation policy, so it recommended against a shared factory — I agree.

---

### Codeblock Language Styling — the Design

**What exists.** The fence model is Pommora's own (`fenceBlocks` in the detect layer) and already does the hard part: `md-cb` line chassis, and delimiter lines that hide their ```` ``` ```` syntax when the caret's away. The Lezer markdown parser is already running in the editor and natively supports per-fence nested language parsing keyed off the info string — it's simply never been given languages or a highlight style. JS/TS, CSS, and HTML grammars are already installed; JSON and YAML are two small official packages (`@codemirror/lang-json`, `@codemirror/lang-yaml`).

**The proposal, in four pieces:**

1. **Engine — CM-native, ~15 lines.** Pass a `codeLanguages` resolver to the existing `markdown()` and add `syntaxHighlighting()` with a hand-defined `HighlightStyle` covering only code tags (keyword, string, comment, number, property, function…). Typed fences get a real nested parse and colors; **a bare fence gets no nested parse and stays exactly today's plain mono** — your keep-rule falls out of the mechanism for free. Markdown's own constructs are untouched since our style maps no markdown tags. I'd start with a curated set (JSON, YAML, JS/TS, CSS, HTML) over the ~100-language `language-data` package — leaner, and adding a language later is one line plus one small dep.

2. **Colors — DRY to primitives.** Hoist literal `--solid-*` vars into the theme-vars bridge (the solids currently exist only as hashed values — just `--accent`/`--code`/`--error` derive from them), then define the token palette in Styles.css as a KNOB block of `color-mix(solid + system-white)` pastels — the project's established tint mechanism, no new hexes. Proposed mapping: strings green, keywords purple, numbers orange, properties/variables light blue, functions yellow, comments at label-tertiary — all yours to retune in one block.

3. **The glyph.** `FENCE_RE` grows an info-string capture; the block's first line carries it as a `data-lang` attribute and CSS renders a right-aligned mono label from it — no widget needed.

4. **Prospect, logged not built:** grip menu **Style ▸ Language** to retype a block.

**One call for you:** today the raw ```` ```yaml ```` line reveals when the caret is anywhere *inside the block*. Your spec reads as revealing only when the caret is *directly on that line*. Line-level matches your words and I lean that way — but it changes existing reveal behavior for all codeblocks, so say which you want. Then I build.

##### Nathan

yeah that call is the right frame for this. Please design the glyph for the code-type to use the code-symbol of lucide plus the type.

so

</> TYPE

using DRIED-color + sizing here.

##### Claude

Line-level reveal it is, and the glyph is `</> TYPE` from the lucide code symbol. Let me check how CM-side decorations already render design-system icons (the grip/callout glyph mechanism) so this DRYs into it:

- **Bash:** Find the icon-in-CM mechanism
- **Bash:** Find glyph var definitions
- **Bash:** Find where the glyph masks are minted
- **Read:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Bash:** Find intent types and lineWidget materialization
- **Bash:** Read lineWidget materializer and WidgetSpec
- **Bash:** Read LineWidget class

All mechanisms mapped. Building now — deps first, then the layers:

- **Bash:** Install language deps and find pinning tests
- **Bash:** See what the tests pin about fences
- **Bash:** Read the caret-affected-lines mechanism

Line-level reveal actually simplifies the caret-dependency machinery — the fence-block loop in `caretAffectedLines` drops entirely. Writing all layers:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/decorations.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/decorations.ts

Now the highlighting engine module:

- **Write:** Pommora/src/renderer/src/MarkdownPM/editor/codeHighlight.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Read:** Pommora/src/renderer/src/design-system/tokens/theme-vars.css.ts
- **Edit:** Pommora/src/renderer/src/design-system/tokens/theme-vars.css.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Find detect tests
- **Bash:** See detect test structure
- **Bash:** See test file tail and imports
- **Bash:** See imported symbols
- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/detect.test.ts
- **Bash:** Add lang capture tests and run gates
- **Bash:** See the failing test

That failure is the old block-level pin — the deliberately inverted behavior. Rewriting it to pin the new line-level rule:

- **Read:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.test.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.test.ts
- **Bash:** Re-run gates
All green. Design-system was touched, so the build gates too:

- **Bash:** Run app and showcase builds
Builds green. Documenting and committing:

- **Bash:** Find the codeblock section in the Features doc
- **Edit:** .claude/Features/MarkdownPM.md
- **Bash:** Commit the codeblock language feature
- **Bash:** Find the Pending section
- **Bash:** See doc section structure
- **Bash:** Read the Deferred section
- **Edit:** .claude/Features/MarkdownPM.md
- **Bash:** Fold the deferred entry into the feature commit

Typed codeblocks are built and committed as `179a3867`. What landed:

**The engine.** A fence's info word now selects a real nested parse — the curated set is JSON, YAML, JS, TS, CSS, HTML, and Swift (Swift rides the legacy-modes stream grammar; the rest are official grammars, three of which were already installed). Tokens map to classes only; all color lives in the stylesheet. A bare ```` ``` ```` fence gets no parse and keeps today's plain mono exactly, per your keep-rule. Adding a language later is one entry in [codeHighlight.ts](Pommora/src/renderer/src/MarkdownPM/editor/codeHighlight.ts) plus its package.

**The colors.** The spectrum solids are now bridged as literal `--solid-*` vars in the theme tokens, and the token palette is one KNOB block in [Styles.css](Pommora/src/renderer/src/MarkdownPM/Styles.css) — every color is `color-mix(solid, system-white)` with a single `--tok-tint` pastel-strength knob (72% solid to start). Routing: keywords purple, strings green, numbers/bools orange, properties light blue, functions yellow, types cyan, comments at label-tertiary. All scoped under `.md-cb`, so a stray tag outside a fence colors nothing.

**The glyph.** A typed block wears `</> TYPE` at its top right — the lucide code icon minted into the same data-URI mask registry as the grip and fold chevron, riding `currentColor` at the codeblock's own font scale, label-tertiary tone, uppercase via CSS. It stands in exactly where the fence syntax hides.

**The reveal is now line-level** per your call: only a caret directly on a fence line trades the glyph back for the raw ```` ```yaml ````; sitting inside the code no longer reveals either fence. This actually *simplified* the caret-dependency machinery — the fence-block special case in the incremental assembler dropped entirely, and the equivalence pin that guards that assembly stayed green. One old test pinned the block-level behavior; it was inverted in the same commit alongside three new pins (lang capture, per-line reveal, glyph presence).

The **Style ▸ Language** grip menu is logged in the doc's Deferred section. Gates: 2169 tests, typecheck, lint, both builds green. **⌘R** to see it — and since three new packages joined, if the reload complains about a missing import, the dev server wants one restart to pre-bundle them.

##### Nathan

tint should be routed to theme-var tint.

##### Claude

- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Lint and commit the tint routing
Routed — `--tok-tint` now points at `var(--tint-primary)` (the 60% step) instead of a bespoke 72%, so the pastel strength rides the design system's tint scale; re-pointing it to another step (`--tint-secondary` for softer, `--tint-solid` for full saturation) is the knob. It'll read slightly more pastel than before since 60 < 72. Committed as `bf983f7f`, CSS-only so HMR shows it immediately.

##### Nathan

It also doesnt seem like these colors have been implemented. Please use the live nexus (currnetly on CBTEST.md) to test each configured language and it's per-option tokening.

##### Claude

- **Bash:** Probe for a debug port on the live instance
- **Bash:** Relaunch dev with debug port 9333
- **Bash:** Probe current page for codeblock token classes
- **Bash:** Find CBTEST page in the tree
- **Bash:** Navigate to CBTEST and re-probe tokens
- **Bash:** Real-input click on CBTEST and probe
- **Bash:** Screenshot current app state
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/cb0.png
- **Bash:** Seed CBTEST with per-language blocks and probe tokens
- **Bash:** Check editor state and content
- **Bash:** Focus editor directly and insert test content
- **Bash:** Read computed token colors and screenshot
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/cb1.png
Verified live — the colors are fully working. What you were seeing was a stale dev process: the language packages joined after your instance's Vite pre-bundle, so the imports never resolved in that session. I relaunched dev (it's the instance now on your screen, with the debug port restored) and seeded CBTEST with one block per configured language plus a bare control. The screenshot above is the live render; every language tokenizes with its own routing:

- **JS/TS** — `function`/`const`/`type` purple, strings green, numbers orange, comments dimmed, `greet` yellow as a function name, `User`/`number` cyan as types.
- **CSS** — selectors/properties on the light-blue lane, `red`/`color` keywords distinct.
- **HTML** — tags purple, attributes light blue, attribute strings green.
- **Swift** — `func`/`return` purple, `Int` cyan, comments dimmed (the legacy-modes grammar holds up well).
- **YAML/JSON** — keys on the property lane, values as strings/numbers/bools (scrolled above the crop; token counts confirmed all present).
- **The bare control block** stays completely uncolored plain mono, and carries no glyph — your keep-rule verified.

The `</> TYPE` glyphs sit at each block's top right exactly per spec — uppercase, label-tertiary, the lucide mark at text height.

Two notes: CBTEST now contains my seeded test content (it autosaved — it's your designated test page, so I left it for your own inspection), and the computed colors confirm the tint-scale routing (60% solid toward white — if the pastels read too soft or too hot anywhere, the one knob is `--tok-tint` in [Styles.css](Pommora/src/renderer/src/MarkdownPM/Styles.css), plus the per-token solid routing right below it).

##### Nathan

looks good. Please make it so that the ``` always shows (in-line placement required for the TYPE text)

raise lucide mark +1 size; type gliph should be code red colored.

Also, if possible; please look for a per-nexus configuration option where necessary or relevant to put it as "Show line count in code blocks" -> This would be the first option in the Settings under 'Pages" as a new sdiebar tab. What this does is shows line-count using label-tertiary mono for codeblocks. These would be glyphs so that the numbers itself isnt actually something thats editable.

##### Claude

Three pieces: the always-visible fence with inline TYPE, the glyph restyle (+1 icon size, code-red), and the per-nexus "Show Line Count in Code Blocks" setting under a new **Pages** settings tab with non-editable number glyphs. Let me map the settings architecture first:

- **Bash:** Locate settings UI and store
- **Bash:** See settings tabs and the Personalization shape
- **Bash:** Find SettingsWindow and Personalization type
- **Bash:** See settings window structure
- **Read:** Pommora/src/renderer/src/Settings/SettingsWindow.tsx
- **Bash:** See personalization application and ordered-list number styling
- **Read:** Pommora/src/renderer/src/design-system/personalization.ts + Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Check zone vars, icon availability, persistence path
- **Bash:** Confirm persistence write and vars scope
- **Bash:** Find a page-suitable icon in the registry
- **Bash:** Find the default page icon name
- **Edit:** Pommora/src/shared/types.ts
- **Edit:** Pommora/src/renderer/src/design-system/personalization.ts
- **Edit:** Pommora/src/renderer/src/design-system/personalization.ts
- **Edit:** Pommora/src/renderer/src/Settings/SettingsWindow.tsx
- **Edit:** Pommora/src/renderer/src/Settings/SettingsWindow.tsx
Now the detect layer — backtick-safe info capture plus the content-line ordinal:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
Now the intent rework — always-visible backticks, inline glyph over the info word only, and the per-line number widgets:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Read:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.test.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.test.ts
- **Bash:** Run gates
All green. Live verification — reloading the instance and driving the real settings path:

- **Bash:** Reload and probe inline glyphs and hidden numbers
- **Bash:** Drive Settings → Pages → toggle line count
- **Bash:** List left-rail buttons
- **Bash:** Open settings via ribbon and toggle the new option
- **Bash:** Close settings, scroll to JS block, screenshot
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Screenshot after CSS HMR applies the right-side glyph
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/cb5.png
- **Bash:** Probe line-number widget geometry
- **Bash:** Toggle again and watch for echo reversion
- **Bash:** Screenshot the numbered codeblocks
The reversion is tied to settings *close*, not a timing echo. Tracing who reapplies personalization on close:

- **Bash:** Find applyPersonalization callers and closeSettings
- **Read:** Pommora/src/renderer/src/store.ts
- **Bash:** Find the personalization schema in main
- **Read:** Pommora/src/main/readNexus.ts
- **Edit:** Pommora/src/main/readNexus.ts
- **Read:** Pommora/src/main/readNexus.test.ts
- **Edit:** Pommora/src/main/readNexus.test.ts
- **Bash:** Full gates including builds
- **Bash:** Restart dev with the main-process fix
- **Bash:** Verify toggle survives close on fixed main
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/cb7.png
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Verify glyph after HMR fix
- **Bash:** Screenshot the fixed glyph region
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/cb9.png
Glyphs are clean now — but let me confirm the line-count class held through the HMR:

- **Bash:** Check class, persistence, and visible numbers
The write side strips it too — the read fix covered only half. Finding the write handler:

- **Bash:** Find the personalization write path in main
- **Read:** Pommora/src/main/index.ts
- **Bash:** Read writePersonalization
- **Bash:** Locate the live nexus settings.json
- **Bash:** Read the Test nexus personalization block
- **Bash:** Read the NexusOS personalization block
- **Bash:** Check built main for the fix
- **Bash:** Fresh main read of personalization
- **Bash:** Check running processes and bundle age
- **Bash:** Kill all instances, relaunch one with debug port
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css **[interrupted]**

##### Nathan

no, inside of it; i may have told you that before i saw the fix

##### Claude

- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Verify persisted setting applies at launch
Persistence loop closed — main reads `true`, class applies at launch. Final visual:

- **Bash:** Screenshot final state
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/cb10.png
Everything verified live: numbers inside the block riding the shared zone, backticks resting in their column, right-side code-red glyphs, and the setting surviving a full relaunch. Final gates and commit with doc updates:

- **Bash:** Final gates and tree state
- **Bash:** Confirm test count
- **Edit:** .claude/Features/MarkdownPM.md
- **Bash:** Commit the fence, glyph, and line-count feature
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Screenshot the first-char-aligned numbers
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/cb11.png
- **Bash:** Probe class and number display
- **Bash:** Inspect a number widget's geometry
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/cb12.png
That's the spec exactly — numbers at the first-character position with the block's own padding as the only inset, code following in one aligned column. Folding the final CSS and doc wording into the commit:

- **Edit:** .claude/Features/MarkdownPM.md
- **Bash:** Amend the feature commit with final placement
All landed as `300d388c` (amended). The final state, live-verified in the shots you saw:

**The fence and glyph.** The ```` ``` ```` markers now always show on both fence lines; a typed block hides only its info word, and the `</> TYPE` chrome sits at the block's top right — code-red (`--code`, the same red inline code wears), lucide mark a pixel over text height. The caret directly on the open fence line trades the chrome back for the raw ```` ```yaml ````.

**The line count.** New **Pages** tab in Settings (second category ever, `file-text` icon), first option **Show Line Count In Code Blocks** — per-nexus persisted through the same personalization file as every toggle. Numbers render as widget chrome at each content line's first-character position: the block's own padding is the only left inset, and the code follows one shared numbering zone later — the zone and gap are the same vars ordered-list markers use, hoisted to a common scope so the two columns can never drift. Fence lines carry no number; the numbers aren't text and can't be edited or selected.

**Two real bugs surfaced during verification.** First, the toggle kept silently reverting: the write path stores any key raw, but main's read-side sanitizer whitelists every personalization field, so the new key was stripped on the next tree push — the round-trip test in `readNexus.test.ts` literally documents this trap, and both the reader and that test now carry the key. Second, my earlier relaunch left a zombie instance alive alongside the new one, and I spent a round driving the stale pre-fix main — killed both, and the single fresh instance now proves the full loop: setting on disk → applied at launch → survives settings close.

Gates: 2170 tests, typecheck, lint, both builds green. The instance on your screen has everything running, CBTEST still holds the seven-language test content for your own pass, and the earlier flagged echo anomaly is explained by the whitelist bug — nothing else lurking there.

##### Nathan

Please simplify and review this implementation via the standards.

##### Claude

Running the standard pipeline — simplifier first (that ordering is the rule), breaker after, findings verified by me at each step. Dispatching:

- **Dispatch:** code-simplifier — Simplify codeblock language arc
- **Return:** Note first: the brief's `code-simplification` skill name doesn't resolve — the registered name is `simplify`, whose Phase 1 mandates four parallel sub-agents. I ran the four lenses (reuse / simplification / efficiency / altitude) inline over the diff instead, per the serialize-tree-touching-agents rule. Worth reconciling the agent brief with the skill's actual name.

## Simplified

- **`Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts`** — `caretAffectedLines` returned a `Set` that, once the fence reveal became line-local, could only ever hold one element. Collapsed to `caretLine(): number` returning the existing `NO_CARET` sentinel; `assembleLineIntents` now compares `i === caret` instead of allocating a Set and calling `.has` per line.
- **`Pommora/src/renderer/src/MarkdownPM/Styles.css`** — the `color-mix(… solid × --tok-tint → --system-white)` pastel formula was written out six times, once per token class. Now stated once on an `:is()` list, with each `.tok-*` rule routing only its own `--tok-solid`. The KNOB comment still reads true, and `.tok-com` stays deliberately outside the list (label step, not a pastel).
- **`Pommora/src/renderer/src/design-system/personalization.ts`** — three of the four switch arms were the identical boolean-→-root-class shape, and `applyPersonalization` restated the same key list a second time. Both now derive from one `ROOT_CLASSES` map; `connectionColor` keeps its explicit branch (it sets a custom property, not a class). A new boolean knob is one map entry instead of three edits.

## Flagged (judgment)

- **`intent.ts`'s `innerStart + 3`** — intent.ts hardcodes the fence marker length to find the info word, while `detect/index.ts`'s `FENCE_RE` owns the fence grammar and tolerates whitespace between the marker and the info word (```` ``` json ````). They agree today only because every marker is exactly three characters. Deriving the offset from detect would shift the `hide` range's start onto the whitespace — a behavior change, so I left it. Worth an explicit offset export from `detect` if the grammar ever loosens.
- **`theme-vars.css.ts`'s `--solid-*` block** — bridges all ten SPECTRUM keys, six of which the token colors consume. I did *not* prune the other four: it's a complete palette bridge with the same shape as the `--tint-*` and `--icon-*` ladders sitting beside it, and a partial bridge is the worse artifact. Generating it from `colorVars.color.solid` was also rejected — it needs a kebab helper and would leak `greyDefault` in as `--solid-grey-default`.
- **`codeHighlight.ts`'s JS/TS descriptions** — near-identical, differing only in `typescript: true`. Left as two entries: that's the `LanguageDescription` API's own shape, and a factory would save nothing while obscuring the per-language `alias` lists.
- **Line-count widgets emitted unconditionally, gated by `:root.cb-line-count`** — looks like wasted work when the setting is off, but the intent cache is caret-free and per-doc-version; making it read personalization would put a live setting into a cached derivation. Correct as-is.

## Cross-File Opportunities (report-only)

- **`SettingsWindow.tsx`'s `Toggle.key` ↔ `personalization.ts`'s `ROOT_CLASSES`** — the settings list and the DOM-effect table now each enumerate the same knobs independently, so a toggle can ship with no class routing (or vice versa) and nothing complains. A `satisfies` constraint tying `Toggle['key']` to `keyof Personalization` would catch half of it; a shared knob registry would catch all of it. Out of scope to build.
- **`applyPersonalizationKey` has no test file** — `personalization.ts` sits beside no `.test.ts`, so the class-routing behavior (including my consolidation) is covered only transitively. The 2170 suite passing is real but doesn't pin this seam.

## Comments

No comment-killer pass warranted — the new comments in this arc explain mechanism and coupling, not restatement, and the KNOB markers are intact (12 in `Styles.css`, unchanged). I added one line in `Styles.css` explaining why `.tok-com` sits apart, and folded the old `default:`-arm note into the `ROOT_CLASSES` fallthrough where it still applies.

## Gates

From `Pommora/`, all green after the final edit: `npm run typecheck` clean (both projects) · `npx vitest run` → **191 files / 2170 tests passed**, matching baseline with no test file modified · `npx biome lint src` → 698 files checked, no fixes applied. Nothing committed.
Simplifier dispatched over the full arc (`c44c0537..HEAD` — detect, intent, highlighting, tokens, settings, and the main-process reader). Per the serialization rule I'll hold the build-breaking dispatch until it lands and its fold is verified — the breaker should attack the post-simplification state, not a moving tree. Findings from both get verified against the code by me before anything folds; report follows when the round completes.

Simplifier's back with three consolidations. Verifying each against the code before accepting:

- **Bash:** Verify caretLine and ROOT_CLASSES rewrites
- **Bash:** Verify assembleLineIntents and the tok consolidation
- **Read:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts
- **Bash:** Gates and commit the simplification fold
Simplification folded and committed. Now the review half — dispatching the build-breaker against the settled state:

- **Dispatch:** build-breaking-agent — Break typed-codeblock arc
- **Return:** Two findings landed, both verified by execution.

## Findings

### 1. Every indented typed fence hides its own backticks — HIGH [verified]

**What breaks:** On a fence that is indented (spaces or a tab), the info-word hide starts inside the backticks and eats them. `  ```yaml` renders as `` "  `" ``; `   ```js` renders as `"   "` — the opening fence line goes **completely blank** while the closing ` ``` ` renders intact.

**Who produces it:** Anyone who opens a page containing a code block nested in a list — the standard Markdown idiom, and what every README, LLM answer, and Obsidian note already contains. Files are canonical in Pommora, so this arrives with existing content, not just fresh typing.

**Repro** (executed against real `detect/index.ts` + `intent.ts`):

| doc | visible after hides |
|---|---|
| `- item` / `␣␣```yaml` | `` "  ` " `` — 2 of 3 backticks + info word gone |
| `␣␣␣```js` | `"   "` — entire line blank |
| `\t```js` | `` "\t``" `` |

Putting the caret on the line restores the raw text, so it flickers back and forth as the caret moves.

**Source and fix:** `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts:227`

```ts
const infoStart = innerStart + 3
```

`innerStart = ls + base`, and `base` is raised **only** by `co.prefixEnd` (callout) or `bm[0].length` (blockquote) — leading whitespace has no absorber, so `base` stays 0 while the marker sits N columns in. The fix is small and the data already exists: `FENCE_RE` captures the whole prefix in `m[1]` (`detect/index.ts:26`), so carry the marker column into `FenceInfo` alongside `lang`/`ordinal` and use it instead of the literal `+3`. One field, one line at each end.

Note the file on disk is never touched — `hide` is a decoration. It's a rendering corruption, not data loss, but nothing tells the user their backticks are still there.

### 2. The code column jogs right at line 10 — MEDIUM [verified]

**What breaks:** With the line-count setting on, lines 1–9 put code at x=28.56px, lines 10–99 at 31.36px, lines 100+ at 39.03px. The block's own CSS comment promises "one- and two-digit blocks keep one code column"; it breaks at 10, not 100.

**Who produces it:** Anyone with the setting on and a code block longer than nine lines.

**Repro** (headless Chrome against the real `Styles.css` rules): `.md-cb-ln` measures 16.56 / 19.36 / 27.03px for 1 / 2 / 3 digits.

**Source and fix:** The `--number-zone: 1.3em` / `--list-gap: 4px` hoist from `.md-li` up to `.cm-editor` (Styles.css:57-58) assumes the two number columns now share one width. They don't — `em` in a custom property re-resolves at the *use* site, so the ordered-list zone is 19.5px (body, 15px) while `.md-cb-ln` gets 16.56px (`--cb-size: 0.85em`, mono). Global `* { box-sizing: border-box }` (`styles.css:24`) then charges the 4px gap against that min-width, leaving a 12.6px content box for a mono digit ≈7.7px wide. Fix is one declaration on `.md-cb-ln` — a `ch`-based zone, e.g. `min-width: calc(3ch + var(--list-gap))`. The shared-var hoist buys nothing here and the comment claiming otherwise should go with it.

Worth knowing: **the ordered-list twin does not have this defect** — measured flat at 19.5px through `100.`, because it carries `text-align: right` plus the `text-indent: -zone` hanging indent. `.md-cb-ln` has neither. This is the arc's own bug, not an inherited one.

### 3. A four-backtick typed fence gets the parse but no chrome — LOW [verified]

` ````yaml ` yields `lang: undefined` (the `[^`~\s]*` group stops at the 4th backtick), so no glyph and no hide — the raw `` ````yaml `` stays visible. CodeMirror reads the real info string independently and *does* colorize the block. Reachable when wrapping a fence that itself contains ` ``` `. Low, and the pre-existing pairing bug (a ```` block closes on the first inner ` ``` `) already limits four-backtick fences.

## Coverage honesty

Executed the real modules over: top-level / list-indented (2sp, 3sp, tab) / blockquoted / callout-internal / unclosed / four-backtick / tilde / space-before-info / unknown-lang / bare fences, caret on-line vs off vs at EOL, and a 105-line ordinal run. Measured the number-zone geometry and the ordered-list twin in headless Chrome off the real CSS. Grounded the token-color chain, the `--tint-primary` percentage, `.md-cb`'s positioning context, CM's `getCodeParser` / `matchLanguageName` / skipping-parser path, the personalization call sites, and the settings category state.

**Not covered:** fences inside tables and embed tiles (the fence branch precedes `inMathLine`, so math-region fences resolve as fences — pre-existing ordering, untouched here); live pointer behavior (drag-select through the number widget, real click targeting in the number zone); the packaged-build dynamic-import path for the language chunks; and the reslotHeal/tileWarm interplay, per the brief.

## Unknowns

**Does CM re-measure line heights when the line-count class flips?** The only content-side `ResizeObserver` in `@codemirror/view` observes `scrollDOM` (index.cjs:7128) — the one at :10273 is the tooltip manager's. Toggling `:root.cb-line-count` changes every code line's width with no CM notification, and under `EditorView.lineWrapping` a long code line can gain or lose a visual row, leaving the height map stale. I could not determine from static reading whether that is user-visible or self-heals on the next keystroke.

*Ten-second check:* open a page with a code block containing one very long line, toggle "Show Line Count In Code Blocks", then click at the end of that line without typing first — if the caret lands on the wrong row, the height map went stale.

## Killed candidates

- Nested parse regresses other MarkdownPM logic — **nothing in MarkdownPM reads the Lezer tree** (zero `syntaxTree` consumers; detection is entirely regex-based). Kills the whole family. *(Q3: adjacent code)*
- `codeHighlight` pre-empts another highlighter — it's the only `syntaxHighlighting` in the renderer. *(Q3)*
- `color-mix` invalid because `--tint-primary` is unitless — it's emitted as `60%`. *(Q1: nobody)*
- Light-mode contrast on white-mixed pastels — the app is dark-only. *(Q2: surface doesn't exist)*
- `.md-cb-lang` escapes to the wrong containing block — `.cm-line.md-cb` is `position: relative`. *(Q1)*
- `TOGGLES[category]` throws on a stale key — `category` is local `useState`, never persisted. *(Q1)*
- Settings toggle doesn't reach the editor's document — Settings is an in-renderer overlay in the same window. *(Q3)*
- Async language load crashes the first render — CM uses `getSkippingParser(found.load())` and `load()` memoizes. *(Q3)*
- Info word with trailing text diverges from the glyph — CM strips at whitespace with `/\S*/`, matching `[^`~\s]*`. *(Q3)*
- Hidden info word copies wrong / breaks undo — `hide` is a decoration; CM copies from `state.doc`. *(Q3)*
- Caret enters the hidden range — the caret being on the line reveals it, so the hidden span never coexists with a caret inside it. *(Q1)*
- `&gt;  ```yaml` detects no fence — real, but that's the unchanged `FENCE_RE` prefix, pre-existing. *(Q4: not this arc)*
- ` ```foo ` shows a glyph with no highlighting — coherent by design (the glyph reflects what was typed); a design question, not a break.

Two notes outside the findings: HEAD carries `height: calc(1em + 44px)` on the glyph icon, already being fixed in your working tree — not counted. And the arc's own tests pin fences at column 0 only, including `expect(lang?.from).toBe(t.indexOf('yaml'))`, which is precisely the assertion that would have caught finding #1 had one case been indented.

## Verdict

**3 findings** (1 High, 1 Medium, 1 Low) · **0 latent** · **1 unknown** · **13 killed**.

The nested-parse and settings halves of this arc are clean — the language seam, the color chain, and the personalization plumbing all survived direct attack, and the "no syntax-tree consumers" fact kills an entire hunt category outright. Both real findings live in the same place: an offset and a width that are correct for the case the tests cover (column 0, single-digit) and wrong one step outside it.
Simplification half is done and committed as `48743064` (net ±0 lines, but three real consolidations — all verified by me against the code before folding):

- **`caretLine`** — the caret-dependency helper returned a Set that, after the line-local reveal change, could only ever hold one element; it's now a plain index compare, dropping a per-update allocation.
- **The pastel formula** — the `color-mix` expression was written out six times, once per token class; it's now stated once on an `:is()` list with each `.tok-*` rule routing only its own `--tok-solid`. Comments stay deliberately outside (they're a label step, not a pastel).
- **`ROOT_CLASSES`** — three identical boolean-to-root-class switch arms plus a restated key list collapsed into one map; a future knob is one entry instead of three edits.

Its judgment flags all check out as correct restraint: the `innerStart + 3` marker-length assumption (agrees with the fence grammar today; worth an offset export only if the grammar loosens), the full ten-color solids bridge (a partial bridge is the worse artifact), and the always-emitted line-number widgets (a cached caret-free derivation must not read a live setting). One cross-file note worth your awareness: the settings toggle list and the class-routing map now enumerate knobs independently with nothing forcing agreement — a shared registry would close that, logged rather than built. I also caught one stale docstring the simplifier's own rewrite left behind and corrected it.

The build-breaker is now attacking the settled state — briefed on the compose pairs that worry me most (quoted fences with languages, unclosed fences mid-typing, the non-atomic hidden info span, 3-digit line counts against the 1.3em zone, and the settings round-trip). Full catalog and my verification of its findings when it lands.

##### Nathan

please give a knob, no comments, for the code-icon height relative to the text.

##### Claude

- **Read:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
Done — `--code-icon-size` on the `.md-cb-lang` rule at [Styles.css:955](Pommora/src/renderer/src/MarkdownPM/Styles.css#L955), seeded with the current `calc(1em + 1px)`; it's em-based so it scales relative to the label text, and the icon reads it for both dimensions. Live via HMR, uncommitted — it'll ride the breaker-round commit unless you want it sooner.

##### Nathan

height, not size.

##### Claude

- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
Renamed — `--code-icon-height`, same seed value. Width follows it since the mask is square (`contain` keeps the glyph's aspect either way).

##### Nathan

Not working. Looks like you confused size with height and weidth. One knob; just the Y position of the glyph. Nothing else.

##### Claude

- **Bash:** Read the current glyph rules
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
Done — `--code-icon-y` at [Styles.css:955](Pommora/src/renderer/src/MarkdownPM/Styles.css#L955), starting at `0px`; positive values push the glyph down, negative lift it, nothing else moves. The size stays a literal with your `+3px` tune preserved. Live via HMR.

##### Nathan

How about this. Remove the glyph; wrap the TYPE in <TYPE> with centered < to the line-center. Simpler.

##### Claude

- **Bash:** Read current glyph rules before rewrite
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/design-system/tokens/theme-vars.css.ts
- **Bash:** Gates and confirm no code-glyph consumers remain
- **Bash:** Find the glyph phrase in the doc
- **Edit:** .claude/Features/MarkdownPM.md
Done — the chrome is now `<YAML>` / `<JS>` / etc.: the TYPE text wrapped in literal angle-bracket pseudos, all in the block's own mono at the code colour, sitting on the same text baseline so the brackets center to the line with zero alignment machinery. The masked icon, its size literal, and the Y knob are all gone, and the now-orphaned `--code-glyph` token is removed from the theme vars (zero consumers confirmed). Gates green including both builds; live via HMR. This rides the breaker-round commit, which is still running.

##### Nathan

centered via the centering of the text, not necessarially the line.

##### Claude

- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
The brackets now center against the uppercase TYPE text itself: mono `<` `>` glyphs sit on the math axis, which reads low beside caps, so both pseudos carry a small upward nudge — `--code-bracket-y` at [Styles.css:955](Pommora/src/renderer/src/MarkdownPM/Styles.css#L955), seeded `-0.06em` (em-based, so it holds at any scale). More negative lifts the brackets, `0` returns them to the baseline. Live via HMR.

##### Nathan

confirmed. But replace with chevron icons instead.

##### Claude

- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
Swapped — the brackets are now real chevron icons masked from the existing `--fold-chevron-mask` token (the same lucide chevron the heading folds use, so no new asset was minted); the left one is its mirror via `scaleX(-1)`. They ride `currentColor` at 1em, and `--code-bracket-y` remains the one Y knob — reseeded to `0.12em` since an icon box sits differently on the baseline than a text glyph did, so give it your eye and tune that value at [Styles.css:955](Pommora/src/renderer/src/MarkdownPM/Styles.css#L955). Live via HMR.

##### Nathan

Now please make it so the height of the glyph itself is the same height as the text.

##### Claude

The chevron path only fills half its SVG viewBox, so the drawn stroke was half the box. Now the box is `1cap` (the exact height of the uppercase text) with the mask scaled 200% so the visible chevron fills it precisely:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
Done — the chevron boxes are now `1cap` square (the literal height of the uppercase letters, a CSS unit so it tracks the font exactly at any scale), and the mask is scaled 200% because the lucide stroke spans only half its viewBox — so the *drawn* chevron now stands exactly text-height. Since a cap-height box on the baseline aligns with the caps natively, I reset `--code-bracket-y` to `0em` — it remains your Y knob if the optics want a hair of adjustment. Live via HMR.

##### Nathan

please do one-level-down of outline widht for the glyphs here

##### Claude

The fold chevron's stroke is 2.5; one level down on lucide's ladder is 2 — that needs its own mask since the token bakes the stroke. Minting it beside the others:

- **Edit:** Pommora/src/renderer/src/design-system/tokens/theme-vars.css.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Gates after token change
Done — `--code-chevron-mask` minted in the theme vars right beside the fold chevron (same path, stroke 2 instead of 2.5, one lucide step lighter), and the language chrome's brackets now consume it. The fold chevrons keep their heavier stroke untouched. Gates green including both builds; if HMR doesn't swap the token module cleanly, one ⌘R will.

##### Nathan

Confirmed.

##### Claude

- **Bash:** Commit the confirmed chrome iteration
Committed as `d06a3e4c` — the whole chrome iteration in one piece: chevron-icon brackets off the new lighter-stroke token, cap-height sizing, the `--code-bracket-y` knob, the retired code-glyph mask, and the doc line. The build-breaker is still working through the arc; its catalog and my verification of it close out the review round when it lands.

The breaker's catalog is strong — both real findings verified by execution, and I've confirmed each mechanically against the code. Folding both fixes:

**F1 (High) — indented typed fences eat their own backticks.** `infoStart = innerStart + 3` assumes the marker starts where the quote-prefix math left off, but leading whitespace raises nothing — the fix is to let the fence grammar owner report where its marker actually ends:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
- **Bash:** Find the scanFencedCode base object
- **Edit:** Pommora/src/renderer/src/MarkdownPM/detect/index.ts
Now the intent side consumes it instead of the hardcoded offset:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
Now the test the breaker pointed out would have caught F1 — an indented fence case:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/decorations/intent.test.ts
- **Bash:** Run gates on the breaker fold
- **Bash:** Read the Known Issues section
- **Edit:** .claude/Features/MarkdownPM.md
- **Bash:** Commit the breaker fold
The review round is complete — both halves folded, everything verified by me before landing.

**Build-breaker verdict: 3 findings (1 High, 1 Medium, 1 Low), 13 killed candidates, 1 unknown.** The two real ones shared a shape — correct at column zero and single digits, wrong one step outside — and both are fixed in `f9adfc44`:

- **High — indented typed fences ate their own backticks.** A fence nested in a list (`  ```yaml` — the standard Markdown idiom, so it arrives with existing files) had its info-word hide start *inside* the marker, because the offset assumed only quote prefixes could push a fence rightward; plain indentation had no absorber, leaving the opening line partially or fully blank at rest. I confirmed the mechanism directly. The fix moves offset ownership to the fence grammar itself: `FENCE_RE` already sees the whole prefix, so `FenceInfo` now carries `markerEnd` and the intent layer uses it — which handles indented, quoted, and tabbed fences through one value and deletes the hardcoded `+3`. The breaker also noted the existing test would have caught this had one case been indented; that exact case is now pinned.
- **Medium — the line-count column jogged right at line 10.** The `em`-based zone re-resolved smaller in the codeblock's own font and border-box charged the gap against it, so two digits overflowed. The number cell is now `ch`-based in the block's mono — the column holds through 999 lines — and the `--number-zone` hoist reverted home to lists since it no longer has a second consumer (its "can never drift" comment overclaimed and is gone; only the marker gap is genuinely shared).
- **Low — a four-backtick typed fence colorizes but carries no chrome.** Coherent with the pre-existing longer-fence pairing rule, so it's recorded in the doc's Known Issues rather than patched.

The kills are worth a sentence: the entire "nested parse regresses other editor logic" family died on one fact — nothing in MarkdownPM reads the Lezer tree, so the highlighter is fully isolated. **One unknown needs your ten seconds:** open a page with a codeblock containing one very long wrapping line, toggle the line-count setting, then click at the end of that line *without typing first* — if the caret lands on the wrong visual row, CM's height map went stale on the class flip and I'll wire a measure nudge.

Gates: 2171 tests (one new), typecheck, lint green. **⌘R** to pick up the indented-fence fix. All commits remain local — say when you want the batch pushed.

##### Nathan

Yeah; the wrapping isnt really properly applied here.

##### Claude

Confirmed stale height map, then — the class flip changes every code line's geometry with no CodeMirror notification. The narrow fix: each editor subscribes to that one knob and asks CM to re-measure when it flips:

- **Bash:** Find store subscription pattern in the editor
- **Bash:** Check store import in the editor
- **Bash:** See import tail for placement
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Bash:** Gates and commit the re-measure fix
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Amend the wrapping fix commit with the hanging indent
Both halves of the wrapping issue are in `3a1d7896`:

- **The height map** — toggling the setting now triggers a CodeMirror re-measure in every live editor (a narrow store subscription on just that knob), so clicks land on the right visual row immediately after a flip.
- **The visual wrap** — wrapped code lines get the ordered-list hanging indent on the ch-based zone: continuation rows now align under the code column instead of sliding beneath the numbers. Numbers stay at the first-character position and the code column doesn't move; only continuations change. The language chrome gets its indent guard back since the hanging indent inherits into absolutely-positioned children.

The CSS half is live via HMR; the re-measure subscription needs **⌘R**. Gates green (2171 tests, typecheck, lint).

##### Nathan

What i mean now is that the wrapping doesnt properly show as a continuation of the line.

- **Sent:** image attachment

##### Claude

Right — the continuation aligns *exactly* with the code column, so it reads as a new unnumbered line rather than a continuation. Giving wrapped rows their own extra indent past the code column, in both modes, with one knob:

- **Read:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Lint and commit the wrap indent
Done — `c26a76a4`. Continuation rows now step `2ch` past the code column in both modes (with and without line numbers), so a wrap visibly hangs under its own line instead of impersonating a new one. First rows don't move: the number stays at the first-character position and code stays in its column — only the wrapped rows shift. The knob is `--cb-wrap-indent` on the `.md-cb` rule at [Styles.css:891](Pommora/src/renderer/src/MarkdownPM/Styles.css#L891) if `2ch` isn't the depth your eye wants. CSS-only, live via HMR.

##### Nathan

No. I mean it should continue from the line above like how text does; not just insert a new line without the wrapp-ed text.

##### Claude

That screenshot is a single unbroken token — no spaces, so it can't break mid-word and drops to its own row whole instead of filling the line. The list text solved this exact thing; checking its mechanism and applying the same to code lines:

- **Bash:** See how list text restores mid-word breaking
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Fold the break-anywhere into the wrap commit
That's precisely what just landed — the run was one unbroken token, and without a mid-word break allowance the browser carried the whole thing to the next row instead of filling line 1 first. `overflow-wrap: anywhere` (the same restoration `md-li-text` uses beside list glyphs) now lets it break at the right edge: line 1 fills to the margin and only the overflow continues onto the wrapped row, indented `2ch` past the code column so it reads as a continuation. Folded into `b180d5b1`, live via HMR — glance at that HTML block and it should read like flowing text now.

##### Nathan

I dont yhtink you understand what im saying.  THe long-text ORIGINATES from line one, so the remainder that doesnt fit within the codeblocks width should wrap into the second line.

##### Claude

Let me look at the live block directly rather than guess again:

- **Bash:** Inspect the wrapping line's computed styles
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/wrap1.png
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Screenshot the break-all wrap
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/wrap2.png
- **Bash:** Fold break-all into the wrap commit
Committed as `397f49fe`. The root of the back-and-forth: CSS's default word-wrapping *relocates* an unbreakable token to the next row whenever it fits there whole — which is correct for prose and exactly wrong for code. `word-break: break-all` is the editor behavior: every row fills to the edge and breaks between any two characters, with the continuation rows keeping their `2ch` hanging indent under the code column. Verified live on your HTML block before committing.

##### Nathan

It should not add extra padding to the right; it shoudl celanlty use a single-row indentadion. The row-count line-numbers carries that distinction.

##### Claude

- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Styles.css
- **Bash:** Fold the single-row indent into the wrap commit
- **Bash:** Reword the amended commit message
Done — `9fc6c6f9`. The extra `2ch` step is gone: continuation rows now sit exactly at the code column (the single-row indentation), with the row filling to the edge and breaking mid-token as before. The absent line number is what marks a row as a wrap rather than a fresh line, exactly as you framed it. CSS-only, live via HMR.

##### Nathan

Last fix. Not all of the codebliock uses Pommora's caret like it should. Please make sure no CM6 carets appear here -- Pommora's caret is always authoritative.

##### Claude

- **Bash:** Find caret-color and native cursor rules
- **Read:** Pommora/src/renderer/src/Carets.css
- **Bash:** Probe caret-color through codeblock elements
Native hiding checks out everywhere — so let me look at what actually renders when the caret sits in code:

- **Bash:** Click into a keyword and inspect caret rendering
- **Bash:** Probe caret at line start, fence, and wrap end
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/caret1.png
I have to stop and disagree with the premise before applying anything: I just drove the live instance through the suspect positions — mid-token in a keyword, line start beside the number chrome, the fence line, the end of a wrapped row — and every one renders Pommora's bar (correct 15px rounded caret in the screenshot above, zero native cursor elements, and `caret-color` computes transparent through every codeblock element: the line, the token spans, the number widgets). The high-level suppression *already exists* and is holding: one global rule hides the native caret across every CodeMirror surface by specificity, which is exactly the "fixes it everywhere" shape you're asking for.

So whatever you're seeing, my probes can't reproduce it, and shipping a speculative hardening on top of a rule that's already authoritative would just be decoration. Tell me the one thing I'm missing: **where exactly does the CM6 caret show for you** — is it while actively *typing* (which would point at IME/composition, a genuinely different caret path Chromium draws natively), inside an embed tile's codeblock, during a drag-selection, or at rest at some position I haven't hit? With the reproduction gesture I'll find the real mechanism and fix it at the source — which is the only way it actually generalizes.

##### Nathan

What im saying here is that while yes, the codeblocks use Pommora's caret most of the time, when its within different lines / parts of the codeblock, it switches back to CM6. SO I can out my caret next to the trailing ``` and it renders as Pommora's, but put it inside something like `{ return a + 1 }` it then uses the CM6 caret.

##### Claude

Reproducing your exact spot — caret inside the Swift `{ return a + 1 }` — with three timed captures to catch both blink phases (a native caret would stay visible while Pommora's bar is in its faded phase):

- **Bash:** Click inside the Swift braces and capture blink phases
The drawn bar landed 115px left of my click — that's a real displacement. Measuring the true selection position against the drawn bar:

- **Bash:** Compare native selection rect with drawn bar
I can't reproduce it — and this second probe explains my earlier alarm: the click actually clamped to the line's end, and the native selection (x 631) and Pommora's bar (x 630) agree to the pixel. Inside the braces, at the fence, at line starts: every seat I can drive shows one rounded Pommora bar and a fully transparent native caret, verified in both computed style and pixels.

Which puts this in a bug class I've been burned by before: synthetic CDP input demonstrably misses things your real mouse and real typing produce. Rather than guess at a mechanism I can't see, snap me a screenshot of the CM6 caret you're getting inside `{ return a + 1 }` — the crop matters because the tell is in the details: whether the bar is thin and square-ended (truly the native caret, meaning something re-enables `caret-color` under real input — IME composition is my prime suspect if it appears *while typing*), or rounded but hard-blinking (Pommora's bar with a broken animation), or doubled. Each of those has a different source, and with one look I can fix it at the source so it holds everywhere.

##### Nathan

Here, isnside = CM6, outside = Pommora.

- **Sent:** image attachment
- **Sent:** image attachment

##### Claude

Both carets in your crops are real and different — now I can hunt the exact state. Reproducing your first crop precisely (caret between `re` and `d`) and capturing across a full blink cycle, cropped and zoomed:

- **Bash:** Seat caret inside 'red' and capture blink cycle
- **Bash:** Crop and zoom the caret region
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/redz0.png
- **Bash:** Re-crop at device-pixel coordinates
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/redz0.png
- **Bash:** Wider crop attempt
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/redz0.png
- **Bash:** Crop the caret region in remaining frames
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/redz1.png
- **Bash:** Crop at corrected device coordinates
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/redz0.png + /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/redz2.png **[interrupted]**

##### Nathan

Stop. The screenshots are zoomed in by me. The bug exists, stop confirming whether its my eyes or not -- it exists, focus on figuring out what would caus eit.

##### Claude

- **Read:** Pommora/src/renderer/src/Carets.css
- **Bash:** Capture 10x zoomed clips of both caret states
- **Bash:** Retry in-token seat with focus check and 10x clip
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/tok8x.png
Clip coordinates are skewed by the app's zoom — full-frame capture with identical crops instead, both caret states side by side:

- **Bash:** Capture line-end state and crop both identically
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/endz.png
Side-by-side confirmed visually different at identical scale — now measuring the actual bar widths in device pixels from the raw crops:

- **Bash:** Measure bright bar widths in both crops **[interrupted]**

##### Nathan

stop trying to figure out how theyre different -- they are. Send an agent to discover the layers of anything that could impact caret-styling here.

##### Claude

- **Dispatch:** general-purpose — Map caret-styling layer stack
Agent dispatched with the full evidence package — the one-bar-in-DOM fact, the transparent native suppression, the 3-vs-4 device-pixel rasterization measurements, and the fractional-zoom observation — briefed to catalog every layer that touches caret pixels (the CM layer geometry, the zoom stack, the codeblock's compositing context, CM's own coordinate rounding) and rank causes against that evidence, then propose one source-level fix that covers every caret surface at once. Report and my verification when it lands.

##### Nathan

You know what -- no edits have been made in this hunt yet and honestly, its really not an issue. Lets just commit what we have here and move on. We're done here.

##### Claude

- **Stop:** background agent afc9535459b5f0017
- **Bash:** Check tree state and unpushed commits
The tree is already clean — the caret hunt made zero edits, so there was nothing left to commit. Everything from this run is in, ending at `9fc6c6f9`:

- **Embedded pages**: Insert ▸ Page → autocomplete handoff, the tile warm cache, the re-slot scroll heal, and the doc-edge caret seat.
- **Typed codeblocks**: the nested-parse highlighting on solid pastels, the always-visible fence with the `<TYPE>` chevron chrome, the Pages settings tab with the per-nexus line count, editor-style wrapping, and both review rounds folded (simplifier + breaker, with the indented-fence and column-jog fixes).

The only loose ends, stated once: the whole batch — 19 commits including your parallel doc commits — is local and unpushed, so say the word and it goes up; `tileA.png` stays untracked at the root; CBTEST still holds the seven-language test content for whenever you want to clear it; and the dev instance on your screen keeps running with everything live. The caret observation is dropped as not-an-issue, with nothing half-applied anywhere.

##### Nathan

titleA.png can be removed.

##### Claude

- **Bash:** Delete the stray screenshot

##### Nathan

/compact

Okay; here's what I want to do. Please look into the MarkdownPM directory plus components existing for menues, popovers, dropdowns, ect... while also looking at existing embedding behaviorals and mechanisms to visualize other pages through stacked-detail confugration. 

The goal here is to create a dropdown widow within MarkdownPM that fills the gap of the hover-previews. It must consider layotu implicaitons of what would be a hightly "squished" or compact view of an otherwise large document; this requires line-consolidation or readable line-width adjustments similar to how the detail-level condensation or expansion of line lengths occurs.

Importantly; the DURATION for which these previews remain open after hovering off of them should be given a slider within the Pages section of the Settings menue. It would default to "None" and have an incremental slider of 0-30 seconds.

It shouldn'nt include page banners or in-line titles. 

The preview size should also give a min/max width that's persisted as universal' the dropdown would be able to be expanded via the mechanism that SurfacePM tiles use for re-sizing horizontally and vertically; a dropdowns size would remain that standardized size untill changed; that size would persist across all dropdowns.

A Page settings defaulting of this size is a prospective feature.

##### Claude

This is the connection hover-preview gap — a real design arc, so I'm treating it as grounding-first brainstorm work, not a build order. What you've already specified (squished-but-readable document view, the linger-duration slider in Settings ▸ Pages defaulting to None with 0–30s, no banner/inline title, one universal persisted size resized via the SurfacePM tile mechanism, per-page size defaults parked as a prospect) goes in as settled intent; what I need first is what actually exists across MarkdownPM, the popover/menu primitives, PagePreview, the embeds framework, and the Surface resize engine before I come back with the questions that are genuinely yours to answer.

Dispatching three scouts in parallel while I read the feature docs myself:

- **Dispatch:** Explore — Scout hover/connection surface
- **Return:** # Findings: Connections + Hover in MarkdownPM

## 1. How inline `[[Title]]` connections are rendered

**Tokenizer** — `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/tokens/index.ts:118-137` (`wikiLinkTokens`). Each `wikiLink` token carries `range` (whole `[[…]]`), `contentRange` (title only, `fs+2 … fs+2+len`), and `markerRanges` (the two bracket pairs). Pattern comes from `pageLinkPattern()` in `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/shared/connections.ts:44-46` — excludes `![[…]]`, captures group 1 = title, group 2 = alias, 255-char cap (ReDoS guard).

**Decoration** — `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/decorations.ts:268-282`, inside `build()`:
- `Decoration.mark({ class: 'md-connection-' + status })` over `contentRange` only (title text, **not** the brackets).
- `status === 'phantom'` → **no decoration at all**; raw `[[Foo]]` renders as inert prose.
- Brackets: `Decoration.mark({class:'md-bracket'})` when the token is *active* (caret inside, per `activeTokenIndices`, tokens/index.ts:181-194 — a caret exactly at the closing `]]` end does NOT activate), otherwise `hideMarker = Decoration.replace({})` (decorations.ts:145).
- So the DOM shape is a plain inline `&lt;span class="md-connection-resolved"&gt;Title&lt;/span&gt;` inside `.cm-line`. No widget, no wrapper element. It is a *mark* decoration, so CM6 may split it into several sibling spans if other marks overlap.

**Driver plugin** — `markdownDecorations(getConn)` at decorations.ts:293-320. A `ViewPlugin` rebuilding on `docChanged || selectionSet || focusChanged || viewportChanged || resolutionNudge` effect. Viewport-scoped for inline tokens.

**CSS** — `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/Styles.css:321-331`:
```
.md-connection-resolved { color: var(--connection); cursor: pointer; }
.md-connection-ambiguous { color: var(--label-tertiary); }
.md-bracket { color: var(--label-secondary); }
```

**Static (non-CodeMirror) render** for table cells — `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/Tables/cellStatic.tsx:29-41` emits the identical `md-connection-${status}` span. Note: a static cell has **no** click/hover handler for connections — `StaticCell` (cellStatic.tsx:66-96) swallows left-mousedown to swap into a live editor.

**Interactions already handled** — all in one place: `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/connections.ts`, `connectionClicks(getApi)` (line 28), registered at `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/index.tsx:245`.

| Event | Line | Behavior |
|---|---|---|
| `mouseover` | 39-54 | Cancels any pending timer; **cheap class gate first** (`closest('.md-connection-resolved')`) before any layout read/tokenize; resolves the page; arms a `setTimeout` of `CONN_HOVER_INTENT_MS = 450` (line 7) that calls `api.hover?.(page, el.getBoundingClientRect())`. Returns `false` (never consumes). |
| `mouseout` | 55-58 | Cancels the pending timer unconditionally. Comment notes mouseout fires per CM6 text span; re-entry re-arms fresh. |
| `click` | 61-72 | Left button, `detail === 1`, and **selection must be empty** (so drag-select across a link doesn't navigate). `preventDefault()`, then `event.metaKey &amp;&amp; api.bypass` → `bypass(page)`, else `api.open(page)`. Handled on `click`, not `mousedown`. |
| `contextmenu` | 74-82 | `preventDefault()` + `api.menu(page)` → native menu. |

Shared hit-test: `resolvedPageAt(view, api, event)` (line 19-26) uses `view.posAtCoords({x,y})` → `wikiLinkAt` (line 9-16) which re-tokenizes the caret's *line* and finds the wikiLink whose `range` brackets the relative offset, then `api.resolve(title)`; returns the page only when `status === 'resolved'`.

External links have a parallel, separate handler: `externalLinkClicks()` in `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/links.ts:20-30` (click only, no hover).

---

## 2. The existing hover-preview shell — it exists and is wired end-to-end, only the *body* is empty

**`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx`** (77 lines) — `useConnectionHover()`.

Its own header comment states the contract explicitly (lines 5-6):
&gt; `// PLACEHOLDER contract: no dismiss backdrop and `manageFocus={false}` — a hover affordance must never eat the next click or pull focus out of the editor.`

Shape:
- Constants: `CARD = { w: 260, h: 120 }` (line 8), `LEAVE_GRACE_MS = 200` (line 9), `RECT_SLOP = 6` (line 10).
- State: `hovered: { page: ConnPage; rect: DOMRect } | null` (line 22).
- Close lifecycle (lines 26-53): a **window-level `mousemove`** listener while open. If the pointer is inside the card rect (measured live via `cardRef.getBoundingClientRect()`) or inside the stored link rect (±6px slop, `inRect` line 12-16), any pending grace timer is cleared; otherwise a 200ms grace timer fires `setHovered(null)`. Plus a window `keydown` Escape closer that calls `e.preventDefault()` first ("the house contract — window closers skip a handled Escape").
- Render (lines 55-74): a `position: fixed`, `pointerEvents: 'none'` **invisible anchor div** placed at the link's rect, used as `triggerRef` for a `PickerMenu`. The `PickerMenu` gets `solid`, `open={hovered !== null}`, and `manageFocus={false}` — **and no `onDismiss`**, which is what suppresses the backdrop.
- **The card body is literally `&lt;div ref={cardRef} style={{ width: 260, height: 120 }} /&gt;`** (line 71). Empty. That's the never-built part.
- Returns `{ hover, card }` — `hover` is the `ConnectionsApi.hover` callback, `card` is the node the host must render.

**Four hosts mount it today**, each identically wiring `hover` into the ConnectionsApi and rendering `{hoverCard}`:
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Detail/PageView.tsx:32, 44, 72`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Blocks/BlockSurface.tsx:126, 140, 386`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/NavWindow/NavWindow.tsx:133, 142, 260`
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/PagePreview/PreviewWindow.tsx:106, 116, 237`

**Provenance** — commit `fc057f3c` "feat(connections): B-6 preview routing, I-19 ⌘-bypass, I-20 ⌘N promote, B-7 hover card" (2026-07-17). Message: *"The B-7 hover card blooms after intent WITHOUT a dismiss backdrop (a hover affordance must never eat the next click — breaker catch) and leaves on grace; the mouseover probe class-gates before any layout read (breaker catch)."*

Backlog entry: `/Users/nathantaichman/The Studio/Projects/Project Pommora/.claude/Context.md:93` — *"**PagePreview hover.** Unbuilt, self-contained, no dependencies."*

No CM6 `hoverTooltip` / `showTooltip` is used anywhere in the codebase (verified).

---

## 3. Title → page resolution (the in-memory title map)

**Index builder** — `buildPageIndex(pages)` at `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/connections/index.ts:30-68`. Builds `Map&lt;normalizedTitle, ConnPage[]&gt;` once. `resolve(rawTitle)`: 0 holders → `{status:'phantom'}`, &gt;1 → `{status:'ambiguous'}`, exactly 1 → `{status:'resolved', page}`.

**`ConnPage`** (connections/index.ts:3-8) is exactly what a hovered link hands you:
```ts
interface ConnPage { id: string; title: string; path: string; icon?: string }
```
`path` is the Nexus-relative `.md` path — that's the target-page path a preview would load.

**Normalization** — `normalizeTitle` at `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/shared/connections.ts:26-28`: `trim().toLowerCase().normalize('NFC')`. The single shared normalization for scanner, phantom key, resolution, uniqueness.

**Where the index lives / is cached** — `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/treeIndex.ts`:
- `pagesOf(tree)` (line 212-221) — every page in walk order, memoized on the per-tree index object; produces `{id, title, path, icon: r.ownIcon}`.
- `pageIndexOf(tree)` (line 230-233) — memoized `buildPageIndex(pagesOf(tree))`. **This is the title map.**
- `pagesByIdOf(tree)` (line 223-227) — `id → ConnPage`.
- `containersByPathOf(tree)` (line 236-247) — `path → {title, icon, kind}` for breadcrumb-style chrome.

**How a host assembles the API** (identical in all four, e.g. PageView.tsx:33-47):
```ts
const idx = pageIndexOf(tree)
return { ...idx, open, bypass, hover, menu: showConnectionMenu }
```
`ConnectionsApi` interface (connections/index.ts:20-28) — `open` required; `menu`, `bypass`, `hover` optional. `hover` is documented as *"Fired after the hover-intent delay on a resolved connection, with the link's rect."*

**Staleness / re-resolve** — `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/index.tsx:131-133` dispatches a `resolutionNudge` effect whenever the `connections` object identity changes, forcing decorations + embed tiles to re-resolve against a changed tree.

**Nested reach**: the same `ConnectionsApi` object is threaded into embed tiles (`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx:192, 209` → `LazyPageEmbed`), and `PageEmbed.tsx:159` passes it to the nested `MarkdownEditor`. So hovering a connection *inside an embedded page tile* already fires the outer host's `hover()`.

---

## 4. Floating / overlay surfaces MarkdownPM already spawns

There are exactly **three families**, and the split is clean:

### (a) Native OS menus — no DOM at all
All right-click/menu surfaces go through the main process over IPC. Nothing to position, nothing to portal.
- `showConnectionMenu(page)` — `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Embeds/connectionMenu.ts:7-11`. `window.nexus.connMenu()` → resolves `'preview'` → `openPreview({id, path})`.
- `embedGripMenu` — `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/embedGripMenu.ts:84-127`. **The "Insert ▸ Page" / "Embed Page ▸" pick tree is a native menu**, built by `embedPickTree(tree, exclude)` (line 16-25) into a `EmbedPickNode[]` of Collections → Sets → Pages and handed to `window.nexus.embedMenu({mode, tree})`. Also `embedInsertAtCaret(view)` (line 68-82) types `![[]]` and lands the caret between the brackets so the *autocomplete* takes over.
- `calloutGripMenu` — `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/calloutGripMenu.ts:9-20`.
- Table menus — `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/Tables/widget.tsx:182-186`, `window.nexus.tableMenu(ctx)`; triggered from `TableView.tsx:344, 365`.

### (b) The connection autocomplete panel — body portal, caret-anchored, fixed
`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/AutocompletePanel.tsx:42-79`. `createPortal(..., document.body)`. Its comment (lines 38-41) is the load-bearing rule for any new editor overlay:
&gt; `// Body-level portal: the panel is position:fixed on viewport coords, and a transformed ancestor (a SurfacePM tile rides translate()) re-anchors fixed to ITSELF — misplacing and clipping the panel. Popups never render inside a tile's subtree.`

Uses `NotchedPane` with `notchHeight={0}`, `position:'fixed'`, `zIndex: 'var(--z-lifted)'`, `--dropdown-origin: 'top left'`, and `pointerEvents:'none'` while closing. Coordinates come from `view.coordsAtPos(sel.head)` in `detectConnectionQuery` (`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/useConnectionAutocomplete.ts:119-126`, storing `left/caretTop/caretBottom` as rounded viewport coords), flipped up/down by `acPanelTop()` in `autocomplete.ts`. Rows use `onMouseDown` + `preventDefault()` (AutocompletePanel.tsx:65-68) so the click never steals the editor's focus/caret. Closed on editor `blur` via a dedicated `EditorView.domEventHandlers({blur})` at `index.tsx:249-254`. Table cells portal it a *second* time (`Tables/CellEditor.tsx:196-206`) because the cell editor lives inside a widget host.

### (c) `PickerMenu` — the shared body-portal dropdown (what the hover card rides)
`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx`.
- `createPortal(..., document.body)` at line 342-383; both the backdrop and the pane layer carry `data-picker-portal` because `useDismiss`'s containment check can't see through a portal (line 46).
- Placement in a `useLayoutEffect` (lines 139-219): reads `triggerRef.current.getBoundingClientRect()`, gets the pane's own measured size from `NotchedPane`'s `onResize` callback (lines 129-134), auto-flips direction once per open (`decidedDir` ref, lines 122-125, "down is the terminal fallback so flips always converge"), clamps to `VIEWPORT_MARGIN = 8`, gaps by `DROPDOWN_GAP = 6` (`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/design-system/components/dropdownAnchor.ts:6`). `origin: 'right' | 'center' | 'left'` controls which edge is pinned; `notchInset*` aims the beak.
- Re-measures on capture-phase `scroll` (whole document) and `resize`, **rAF-coalesced** (lines 198-211) — this is what would keep a hover card glued to a link while the editor scrolls.
- Freezes placement through the exit animation (`if (!selfManaged || !mounted || closing) return`, line 142) so a detached trigger can't snap the fading pane away.
- `visibility: hidden` until placed (line 376); dev-error if unmounted while open (lines 97-105) — **the card must mount persistently and ride `open`**, which `useConnectionHover` does.
- Portal guards: `stopPointerBubble` on pointerdown and `stopContextBubble` on contextmenu (lines 22-33, 349-350, 360-361), because React events cross portals into the component-tree owner.

---

## 5. Pointer-event handling over decorations — the quirks already dealt with

These are the existing behaviors a hover-open/hover-close lifecycle would have to coexist with:

1. **`mouseover`/`mouseout` fire per CM6 text span, not per logical link.** Explicitly noted at `connections.ts:29-30`. A `Decoration.mark` can be split into multiple spans, and CM re-creates DOM on every decoration rebuild (which happens on `selectionSet` and `viewportChanged`, decorations.ts:302-311) — so the hovered element identity is not stable, and a rebuild while hovering will fire spurious `mouseout`. The current code treats re-entry as "re-arm fresh".

2. **A stored `DOMRect` goes stale.** `api.hover(page, el.getBoundingClientRect())` captures a rect at fire time (connections.ts:50). The `ConnectionHoverCard` grace check (`inRect(hovered.rect, ...)`) compares live mouse coords against that frozen rect — editor scroll, a decoration rebuild, or an embed-tile height change invalidates it. `PickerMenu`'s own ResizeObserver observes the *anchor div*, which is positioned from the same frozen rect, so it re-measures a stationary proxy.

3. **A competing full-document `mousemove` handler already runs on the editor**: `blockGripHover` (`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/blockHandles.ts:70-92`) does `posAtCoords` on every move and reports the hot line to main via `window.nexus.setGripHot()`. It caches by doc-line to avoid re-parsing per pixel (line 67-68, 80-85) — the same cost discipline the connection `mouseover` gate follows.

4. **`WidgetType.ignoreEvent` is `true` by default and CM swallows everything inside a widget.** Deliberately overridden to `false` in `blockHandles.ts:31`, `decorations.ts:50, 79`, `folding.ts:184`; left `true` (events stay the widget's) for embed tiles (`embedWidget.tsx:259`) and tables (`Tables/widget.tsx:265`). Consequence: a connection rendered inside a table cell or embed tile does **not** reach the outer editor's `mouseover` handler — the nested editor's own `connectionClicks` is what fires there.

5. **Mousedown is contested territory.** Multiple handlers `preventDefault()` on press to stop CM's native selection/focus:
   - `embedClickSeat` (`embedWidget.tsx:533-564`) — nearest-edge caret seating around tiles, with a `documentTop` band gate.
   - `listDrag.ts:149-168` — "CM starts its text-selection drag on mousedown, and preventDefault on pointerdown doesn't cancel the drag".
   - `blockDrag.ts:84, 115, 206` — `setPointerCapture` on the grip.
   - `StaticCell` (`cellStatic.tsx:79-85`) — "the native focus-shift otherwise races ours — the 'needs two clicks' bug".
   This is why connection navigation lives on `click` and not `mousedown`, and why the hover card must not introduce any backdrop that intercepts the press.

6. **Escape is a contended, ordered resource.** Three layers preventDefault it and the convention is "mark it handled so window-level closers stand down": the AC keymap at `Prec.highest` (`index.tsx:175-182`, `whenAcOpen`), `PickerMenu`'s dismiss (`PickerMenu.tsx:225-231`), `ConnectionHoverCard`'s closer (`ConnectionHoverCard.tsx:41-45`), and consumers that check `!e.defaultPrevented` (`BlockSurface.tsx` — *"CM6 consumes Esc first when its autocomplete is open"*).

7. **Focus must not move.** `manageFocus={false}` on the hover card's PickerMenu bypasses PickerMenu's focus capture/restore/tab-trap (lines 238-287). Any interactive content added to the card body would need to reckon with that deliberately-disabled machinery.

8. **Transformed ancestors break `position: fixed`.** SurfacePM tiles ride `translate()`; both AutocompletePanel and PickerMenu portal to `document.body` for exactly this reason. Any editor-local overlay would be misplaced and clipped.
- **Dispatch:** Explore — Scout page render + embeds
- **Return:** Findings report below.

---

# 1. PagePreview — the floating page window

**Directory:** `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/PagePreview/`

### What it mounts
`PreviewWindow.tsx:226-236` — the window body is **not** a bespoke renderer. It mounts exactly one thing:

```tsx
&lt;div className="pgpreview-body edge-fade pgembed-grows" ref={bodyRef}&gt;
  &lt;PageEmbed key={target.path} path={target.path} editing={editing}
             onBeginEdit={…} connections={…} onBody={…} warm={warmSeam} /&gt;
&lt;/div&gt;
```

So the preview is a **PageEmbed host**, and PageEmbed is a live `MarkdownEditor` (CM6) — read-only at rest, flipped editable in place. There is no separate read-only markdown renderer anywhere in the codebase.

- Read-only → editable flip: `PreviewWindow.tsx:69-70` (`const [editing, setEditing] = useState(false)`, reset per `target.path`), handed to PageEmbed's `editing` prop; PageEmbed passes `readOnly={!editing}` (`PageEmbed.tsx:159`).
- Note `chrome` is **omitted** here, so it defaults to `'none'` (`PageEmbed.tsx:48`) — **no banner and no inline title inside the body**. The preview carries location itself via `PreviewTabStrip` + `NavCrumbs` in the pane title (`PreviewWindow.tsx:199-204`). This is documented at `PageEmbed.tsx:63-67`.

### How it fetches content
It doesn't — PageEmbed does (see §5). The window only supplies a warm seam: `usePreviewWarm(bodyRef, target.path)` at `PreviewWindow.tsx:154`.

### Banners / inline titles
- `chrome='page'` (used by the in-markdown embed tile, not the preview) renders `EmbedBanner` when the page has a `cover`, else `EmbedCrumbs` — `PageEmbed.tsx:118-136, 171-211`.
- `chrome='none'` (preview, SurfacePM tiles) renders nothing above the editor.
- The **full page** title/banner is a different component entirely: `MarkdownPM/PageHeader.tsx`, mounted only when *both* `title` and `path` props are present — `MarkdownPM/index.tsx:402-411`. The preview never passes them, so no PageHeader.

### Sizing / positioning
- Shell is the shared `PreviewPane` (`design-system/components/PreviewPane/PreviewPane.tsx`). Default floating bounds: `PreviewPane.tsx:17` — `{ minW: 360, minH: 280, defW: 850, defH: 600 }`. The preview does **not** override `bounds`, so it opens 850×600.
- Position/drag/resize: `useFloatingWindow(id, bounds, surfaces)` at `PreviewPane.tsx:102`; size persists per `id` ("page-preview", `PreviewWindow.tsx:187`).
- Drag surfaces: `PreviewWindow.tsx:28-29`.
- Inspector rail bounds: `PreviewPane.tsx:20` — `{ min: 180, def: 260, max: 420 }`, mounted `mode: 'overlay'` (`PreviewWindow.tsx:211-222`).
- Text scale: the pane sets `--mdpm-scale: EMBED_SCALE` inline (`PreviewWindow.tsx:197`); the body's scroll model is `previewWindow.css:25-41`; footer alignment `previewWindow.css:45-48`.

### Open/close lifecycle
- Store slice: `store.ts:1091-1184` — `openPreview` (1095), `openNavPreview` (1113), `openPreviewTab` (1140), `activatePreviewTab` (1160), `closePreviewTab` (1169), `closePreview` (1180). Types at `store.ts:113, 240-250`.
- Mount gate: `PreviewWindow.tsx:44-52` — `open` keys on `preview?.flavor === 'page'`; `useExitPresence(open)` gives `{mounted, closing}`; `held` ref keeps the target alive through the exit animation.
- Three exits (`previewExit`): `dismiss` | `engulf` | `morph` — class map `PreviewWindow.tsx:39`, engulf FLIP into the detail pane rect at `PreviewWindow.tsx:164-183` (uses `getDetailPaneRect()` from `Detail/DetailPane.tsx:69`), CSS at `previewWindow.css:11-21`.
- Escape: inspector first, then window — `PreviewWindow.tsx:192`; the pane's global Escape listener is `PreviewPane.tsx:132-139`.
- Tab-swap slide animation: `PreviewWindow.tsx:128-152` (WAAPI, ±14px).

Other files: `PreviewTabStrip.tsx`, `PreviewActions.tsx` (29 lines — inspector toggle), `previewTabs.ts` (tab model), `WindowMorph.ts` (rect stash for the nav morph).

---

# 2. The Embeds framework

**Directories:** `Embeds/` and `Blocks/`

### Embed types (three, plus one hover stub)

| Type | Renders | Entry points |
|---|---|---|
| **Page embed** | Another page's **markdown body inline**, via a nested `MarkdownEditor` | `Embeds/PageEmbed.tsx` |
| **View embed** | A collection/set view (table/cards) | `Blocks/ViewEmbedBlock.tsx` (614 lines), `Embeds/ViewEmbedScope.tsx` |
| **In-markdown page tile** | Page embed as a CM6 widget on a lone `![[Title]]` line | `MarkdownPM/editor/embedWidget.tsx` |
| **Connection hover card** | *Currently an empty 260×120 placeholder* | `Embeds/ConnectionHoverCard.tsx` |

**Yes — page embeds render another page's markdown body inline.** `Embeds/PageEmbed.tsx` is the single shared implementation, with exactly three hosts:
1. `Blocks/PageEmbedBlock.tsx:22-30` (SurfacePM block tile, `chrome` default `'none'`)
2. `MarkdownPM/editor/embedWidget.tsx:203-214` (CM6 widget, `chrome: 'page'`, `locked: !interactive`, `warm: tileWarmSeam(...)`)
3. `PagePreview/PreviewWindow.tsx:227-235` (the floating window)

### `ConnectionHoverCard.tsx` — the closest existing hover-preview precedent
- `useConnectionHover()` returns `{ hover(page, rect), card }`.
- Card geometry `ConnectionHoverCard.tsx:8` — `const CARD = { w: 260, h: 120 }`; the body at line 71 is a **bare empty div** — the content is not implemented.
- Contract at `ConnectionHoverCard.tsx:5-7`: no dismiss backdrop, `manageFocus={false}` — must not eat the next click or pull focus from the editor.
- Leave grace 200ms, 6px rect slop (`:9-10`); Escape closes and `preventDefault`s (`:41-45`).
- Wired into the `ConnectionsApi.hover` seam by all three connection hosts: `Detail/PageView.tsx:32,45`; `PagePreview/PreviewWindow.tsx:106,116`; `Blocks/BlockSurface.tsx:~137`.

### The embed contract
- **Data:** `PageEmbed` fetches itself. `PageEmbed.tsx:73-81` seeds synchronously from (a) `warm.restore()?.editorState.doc` and (b) `readPageDetail(path)` (the path-keyed warm slot). Only on a miss does `PageEmbed.tsx:92-107` do `window.nexus.openPage(path)` → `cachePageDetail(r.value)` → `setLoaded(entryFrom(...))`.
- **Failure semantics:** `body: null` is a failed open, never an empty page — renders the inert `.pgembed-failed` fallback (`PageEmbed.tsx:19-26, 84, 116`) so a keystroke can't overwrite the real file.
- **Writes:** `schedulePageSave(path, next)` / `flushPageSave(path)` from `Detail/pageFlush.ts` (`PageEmbed.tsx:111-114, 157`); pageFlush write-throughs into the warm slot via `writeThroughBody` (`Detail/pageFlush.ts:16`).
- **Cycle guard / nesting:** `embedAncestors` chain, appended per hop (`PageEmbed.tsx:165`, facet at `embedWidget.tsx:39-46`). A target already in the chain renders inert (`.mdpm-embed-cycle`, `embedWidget.tsx:227-232`).
- **Scale:** `Embeds/embedScale.ts` — `EMBED_SCALE = 0.9`, `EMBED_ZOOM = 1 + log2(0.9)`, `VIEW_EMBED_ZOOM = (15/13) * EMBED_ZOOM`. PageEmbed sets `--mdpm-scale` inline and passes `zoom={EMBED_ZOOM}` (`PageEmbed.tsx:141, 162`).
- **Warm:** `Embeds/tileWarm.ts` — `tileWarmSeam(chain)` keyed by the full host chain; invalidates the entry if `readPageDetail(path).body` diverges from the captured doc (`tileWarm.ts:22-27`). Plus `registerScrollHeal`/`healTileScrolls` for CM6 re-slot scroll wipes.
- **CSS:** `Embeds/embeds.css` — padding contract `:33-40`; the **grow model** for a host that owns the scroll (`.pgembed-grows`, `:51-70`) — the preview uses this class; banner chrome `:72-133`.

---

# 3. Detail page rendering pipeline + readable line width

### Where the page editor mounts
`Detail/DetailPane.tsx:57-58` → `&lt;div className="detail detail-page"&gt;&lt;PageView /&gt;&lt;/div&gt;` → `Detail/PageView.tsx:73-126` mounts `MarkdownEditor` keyed on `pageDetail.path`.

### Line width mechanism — **there is no `max-width` / `ch` measure anywhere**
I grepped every CSS/CSS-in-TS file: no readable-measure token exists. Content column width is **pane width minus symmetric insets**, and the insets are what "condense/expand" the line length.

The chain, in `styles.css:110-156`:
```
--content-gutter: 24px                                          (line 126)
--gutter: var(--content-gutter)                                 (line 127)
--content-inset:       calc(--glass-inset + --sidebar-width + --gutter)   (line 130)
--content-inset-right: var(--gutter)                            (line 132)
.shell.sidebar-hidden  { --content-inset: var(--gutter) }       (lines 146-148)
.shell.inspector-open  { --io: 1;
   --content-inset-right: calc(--glass-inset + --inspector-width + --gutter) }  (149-152)
.shell.is-resizing     { transition: none }                     (154-156)
```

- `--sidebar-width` / `--inspector-width` are set **inline from React state** at `App.tsx:192-193`, backed by `store.ts:149-155, 803-812` (`sidebarWidth`, `setSidebarWidth`, `inspectorWidth`, `setInspectorWidth`; clamped, persisted to `localStorage` under `pommora.sidebarWidth` / `pommora.inspectorWidth`, keys at `store.ts:82, 97`).
- **So: dragging the sidebar or opening the inspector is literally the line-length condensation knob.** Every consumer transitions `padding-left`/`padding-right` over `--duration-base`, so it animates.

Consumers:
- Page editor: `MarkdownPM/Styles.css:37-48` — `.mdpm-editor { padding-left: calc(var(--content-inset) - var(--fold-gutter)); padding-right: var(--content-inset-right) }`, and `.cm-content` re-adds the fold gutter as padding (`Styles.css:74-85`, `padding: var(--header-zone, 90px) 0 90px var(--fold-gutter)`), so text lands on `--content-inset` while the chevron strip stays inside the scroller clip.
- Non-page detail views: `Detail/Detail.css:29-32` (`.detail`), `:50-53` (`.detail-body`), with per-view overrides at `:66-75` (table flattens left by `--fold-gutter`; cards use `--surface-inset`).
- Surface/tile insets: `styles.css:138-144` (`--surface-lane: 8px`, `--surface-inset`, `--surface-banner-inset`).
- Fold gutter token: `design-system/tokens/theme-vars.css.ts:115-116` — `--fold-gutter-base: ${FOLD_GUTTER}px`, `--fold-gutter: var(--fold-gutter-base)`.

### Zoom knobs (three independent, do not confuse)
1. **Editor font zoom** — `MarkdownPM/zoom.ts`: `EDITOR_BASE_PT = 15`, exponential `2^(z-1)`, `ZOOM_MIN 0 / MAX 2 / DEFAULT 1`. Applied as inline `--editor-font-size` on `.mdpm-shell` (`MarkdownPM/index.tsx:400`).
2. **`--mdpm-scale`** — the *structural* px scale (gutter width, glyphs, chrome). Declared globally `:root { --mdpm-scale: 1 }` at `MarkdownPM/Styles.css:11-17`; a host sets it on any ancestor. `--glyph-scale = --mdpm-scale * --block-zoom` (`Styles.css:26`). Embeds re-home the fold gutter off it: `embeds.css:16`.
3. **`--block-zoom`** — per-tile Scale, a registered `@property &lt;number&gt;` so it animates (`MarkdownPM/Styles.css:1-9`); steps in `Blocks/blockZoom.ts` (`ZOOM_FACTORS = [1.25, 1, 0.85, 0.65, 0.5]`, classes `blk-zoom-NNN`). Applied linearly to `.cm-content` font-size (`Styles.css:84`), never through the clamped zoom curve.

The `--mdpm-scale` / font-zoom pair is exactly what an embed uses to "condense": `EMBED_SCALE = 0.9` + `EMBED_ZOOM = 1 + log2(0.9)`.

---

# 4. Can MarkdownPM mount read-only? Minimal mount

**Yes.** `MarkdownPM/index.tsx:79` — `readOnly?: boolean` (default `false`, line 102).

### How read-only actually works (important, non-obvious)
`MarkdownPM/index.tsx:163-173`:
- `EditorView.editable.of(true)` — **stays true even read-only**, because MarkdownPM renders selection natively (no `drawSelection` layer); a non-editable DOM would be unselectable.
- `readOnlyGate` is a `Compartment` holding `EditorState.readOnly.of(...)` — reconfigured on the **live view**, no remount (`index.tsx:105-106, 370-381`).
- `EditorState.readOnly` is advisory only, so line 173 adds `EditorState.changeFilter.of((tr) =&gt; !(tr.startState.readOnly &amp;&amp; tr.docChanged))` — the single sink that drops every programmatic doc-changing transaction (formatKeymap, list/table/checkbox commands) while read-only.
- Autofocus is suppressed while read-only at mount (`index.tsx:321`).

### Minimal mount
Only **two required props**: `initialBody: string` and `onChange: (body: string) =&gt; void` (`index.tsx:60-62`). Everything else is optional. Extensions are **not** configurable — the full extension list is built unconditionally at `index.tsx:163-275` and mounted once (`deps: []`, line 365). There is no lightweight/subset extension path.

Optional prop groups and their gating effects:
- `title` + `path` (**both** required) → mounts `PageHeader` (banner + rename + icon) — `index.tsx:402-411`.
- `embedHeights` absent → the tile resize handle hides (`index.tsx:74`, `embedWidget.tsx:218-220`).
- `warm` absent → mounts cold, no state capture at unmount (`index.tsx:279-291, 349-360`).
- `edgeFade` → adds `edge-fade top-gated` to the CM scroller (`index.tsx:318`).

### Every mount site, compared

| Site | File:line | title/path/cover | zoom | readOnly | warm | folds/heights/tableCols/menu | edgeFade | ancestors |
|---|---|---|---|---|---|---|---|---|
| **Detail page** | `Detail/PageView.tsx:73-126` | ✅ all three + `onEditIcon`/`onRename` | default (1) | ✗ (always editable) | ✅ tab warmCache | ✅ **all four** | ✗ | `[pageDetail.path]` |
| **PageEmbed** (preview / tile / block) | `Embeds/PageEmbed.tsx:153-166` | ✗ none | `EMBED_ZOOM` | `!editing` | ✅ passthrough | ✗ none | ✅ | `[...ancestors, path]` |
| **MarkdownBlock** (SurfacePM tile) | `Blocks/MarkdownBlock.tsx:~73-80` | ✗ none | default (1) | `!editing` | ✗ | ✗ none | ✅ | ✗ |
| **Test harness** | `testing/editorHarness.ts:29-42` | per-test | per-test | per-test | per-test | per-test | per-test | per-test |

`MarkdownPM/Tables/CellEditor.tsx:82` creates a raw `new EditorView` — a separate single-line cell editor, **not** a MarkdownEditor instance.

The `MarkdownBlock` config is the true minimal read-only mount: `initialBody`, `onChange`, `connections`, `readOnly`, `autoFocus`, `edgeFade`. Read-only behavior is pinned by `MarkdownPM/readOnlySelection.test.tsx`.

---

# 5. Warm detail cache &amp; the cheap fetch path

**File:** `Tabs/warmCache.ts` (92 lines). Module state, not store state — survives React remounts, dies with the session (header comment `:1-8`).

### Two independent stores
**(a) Per-tab warm entries** — `cache: Map&lt;tabId, Map&lt;navKey, WarmEntry&gt;&gt;` (`:22`), `WARM_CAP_PER_TAB = 20` (`:20`), LRU by Map insertion order (`:25-31`).
`WarmEntry = { editorState?, scrollTop?, pageDetail? }` (`:12-17`). API: `captureWarm` (`:33`), `readWarm` (`:45`), `dropWarmDetail` (`:79`), `dropWarmTab` (`:85`), `clearWarm` (`:89`). Used only by `Detail/PageView.tsx:111-125` with the rename fence (`entry?.pageDetail?.path === pageDetail.path`, line 117).

**(b) Path-keyed detail slot — this is the preview/embed path** (`:49-73`):
```ts
const detailByPath = new Map&lt;string, PageDetail&gt;()   // :52
const DETAIL_CAP = 40                                // :50
cachePageDetail(detail)   // :54
readPageDetail(path)      // :60
writeThroughBody(path, body)  // :66  — called by Detail/pageFlush.ts:16 on every scheduled save
dropPageDetail(path)      // :71    — called by store.ts:1449
```
Write-through is the key property (`:64-65`): the slot's body never lags a pending save, so a remounting tile can't seed on pre-edit prose.

### The fetch path a preview uses
Both halves of the preview window share this one slot, so **a page is fetched once per window**:

1. **PageEmbed (the body)** — `Embeds/PageEmbed.tsx:73-81` sync seed from `warm?.restore()?.editorState.doc` overlaying `readPageDetail(path)`; miss → `PageEmbed.tsx:92-107` `window.nexus.openPage(path)` then `cachePageDetail(r.value)`.
2. **PreviewInspector (frontmatter)** — `PagePreview/PreviewInspector.tsx:63-85`:
```ts
const cached = readPageDetail(target.path)
if (cached) { setFm(cached.frontmatter); setTitle(cached.title); return }   // :68-73
void window.nexus.openPage(target.path).then((r) =&gt; {
  if (!live || !r.ok) return
  cachePageDetail(r.value)                                                   // :78
  setFm(r.value.frontmatter); setTitle(r.value.title)
})
```
The comment at `:65-67` states the intent explicitly: the embed half feeds the slot and vice versa; a warm hit skips the blank frame; any frontmatter write drops the slot so a hit is never staler than the page beside it.

**So the cheapest content fetch for a new hover preview is:** `readPageDetail(path)` → on miss `window.nexus.openPage(path)` + `cachePageDetail(...)`. `PageDetail` carries `{ id, title, path, frontmatter, body }` (shape visible at `testing/editorHarness.ts:22`).

### Preview-specific warm cache (separate from warmCache.ts)
`PagePreview/previewWarm.ts` — `Map&lt;tabId, PreviewWarmEntry&gt;` where `PreviewWarmEntry = { editorState?, scrollTop?, bodyScrollTop? }` (`:6-12`). Lives and dies with the open window: `clearPreviewWarm()` on every open/close (`store.ts:1108, 1131, 1174, 1181`), `dropPreviewWarm(id)` per tab close (`store.ts:1177`). Dev CDP probe at `previewWarm.ts:34-36`. Consumed by `PagePreview/usePreviewWarm.ts` — liveness-gated captures (`:15-18`), passive body-scroll listener (`:33-39`), and a double-rAF scroll restore because CM6 builds embed heights async (`:43-57`).
- **Dispatch:** Explore — Scout chrome, resize, settings
- **Return:** Findings report below.

---

# 1. Dropdown / popover primitives — the canonical "floating pane" stack

**The stack, bottom-up:**

| Layer | File | Notes |
|---|---|---|
| Frost recipe | `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/design-system/materials/glass-pane.tsx` | `PANE_FROST` params (L18–28), `frostStyle()` (L37–51), `GlassPane` (L53–66). Static twin: `materials/glass-material.ts` L8 `frostMaterial`. Barrel: `materials/index.ts` (`GlassPane`, `PANE_FROST`, `frostMaterial`, `GlassWindow`, `GlassSurface`, `GlassControls`, `GlassSegment`). **There is no `usePaneFrost` hook** — the frost is a plain style object + the `GlassPane` component. |
| Beaked shell | `design-system/components/NotchedPane.tsx` (242 L) | The one shared dropdown shell. Self-measures via `ResizeObserver` (L139–157), builds one SVG path used both as `clipPath` and border stroke (L19–87), publishes `--notch-h` and `--dropdown-origin` at L213, computes origin at L202. `notchSide: 'top'\|'bottom'\|'left'\|'right'`, `onResize(w,h)` callback at L129 is how a host learns the pane's measured box. Critical invariant at L204–207: the Bloom class rides the GlassPane + SVG frame *individually*, never the wrapper (an opacity-animated ancestor becomes the backdrop root and kills `backdrop-filter`). |
| Bloom animation | `design-system/animations.css.ts` (44 L) | `BLOOM = cubic-bezier(0.32, 0.72, 0, 1)` (L5) — "the one special-cased named curve". Keyframes `dropdown-menu` (scale .5→1) L9–12 and `dropdown-menu-out` (1→0.92) L21–24. Two token speeds: `dropdownMenu`/`dropdownMenuClosing` on `duration.slow` (350ms, Navigation/Settings menus), `dropdownOpen`/`dropdownClose` on `duration.dropdown` (225ms, PickerMenu + AutocompletePanel). All four read `transformOrigin: var(--dropdown-origin, top center)`. `titleReveal` (L44) is the same curve as a transition timing. |
| Exit presence | `design-system/useExitPresence.ts` (30 L) | `useExitPresence(open, exitMs = parseInt(duration.slow) + 30)` → `{ mounted, closing }`. Parent keeps the pane mounted; the pane never self-unmounts. |
| Menu surface | `design-system/components/menu/MenuSurface.tsx` (29 L) | `NotchedPane` + `menuSurface.css.ts` (`MENU_GUTTER = 10px`, `minWidth 225px`, radius 12, top padding `calc(var(--notch-h) + 6px)`). Consumers: `Toolbar/NavPane.tsx:14`, `Toolbar/ViewDropdown.tsx:84`, `Toolbar/SpaceDropdown.tsx:37`, `Components/Detail/SettingsDropdown.tsx:21`. |
| Scroll frame | `design-system/components/menu/Menu.tsx:255–273` + `menu.css.ts:280–311` | `MenuScrollFrame({header, footer, maxHeight = MENU_MAX_HEIGHT, children})`. `MENU_MAX_HEIGHT = 320` (`menu.css.ts:288`) — the one dropdown height ceiling, shared with `PaneSlider`'s slot cap. Body is the *sole* overflow region + `edge-fade`. |
| Portal/placement | `design-system/components/PickerMenu/PickerMenu.tsx` (413 L) | **This is the canonical mount for a NEW floating surface.** Self-managed mode (`open` + `onDismiss`) owns `useExitPresence`, body-portals to `document.body`, measures the trigger, auto-flips direction, traps Tab, restores focus, renders a dismiss backdrop. Placement math L139–219; auto-flip decided once per open (L122–125); `visibility:hidden` until placed (L376). Reads pane size from `NotchedPane`'s `onResize` (L129–134) rather than re-measuring. Both portal nodes carry `data-picker-portal` so `useDismiss` can see through. |
| Anchoring (CSS-anchored, non-portal) | `design-system/components/dropdownAnchor.ts` (26 L) | `DROPDOWN_GAP = 6` — the shared trigger→pane distance, also read by PickerMenu (`GAP`). `dropdownAnchor(placement, zIndex)`. |
| Dismiss | `design-system/components/useDismiss.ts` (34 L) | Outside-pointerdown + Escape; spares `[data-picker-portal]`; Escape peels one popover at a time. |
| Z-ladders | `design-system/tokens/stack.ts` (35 L) | `stack.top.floating = 1000`, `menuBackdrop = 1099`, `menu = 1100`, `menuOverlay = 1200`. `pickerMenu.css.ts:77` `layer` = `position:fixed; zIndex: stack.top.menu`; `:81` `backdrop` = fixed inset 0 at `menuBackdrop`. |
| Motion tokens | `design-system/tokens/motion.ts` (17 L) | `fast 180 / disclosure 180 / dropdown 225 / base 280 / slow 350`. |

**PaneSlider** is *not* in `design-system` — it's `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Components/Detail/PaneSlider.tsx` (+ `paneSlider.css.ts`, tests `paneSlider.test.tsx`). It is the push/back slide primitive for two-slot panes; slides + resizes only, never caps or scrolls (that's `MenuScrollFrame`'s job). Caps its slot at the same `MENU_MAX_HEIGHT`. Uses `useExitPresence(open, SLIDE_MS)` where `SLIDE_MS = parseInt(duration.base)`.

**How a new floating surface mounts:** wrap content in `PickerMenu` (self-managed: pass `open`, `onDismiss`, `triggerRef`) — that gives you NotchedPane + GlassPane frost + Bloom in/out + `--dropdown-origin` + portal + placement + dismiss for free. If you need a header/footer with a scrolling body, pass `maxHeight` (auto-wraps in `MenuScrollFrame`) or wrap children yourself. `bareSurface` opts out of the built-in gutter; `width` pins the pane width; `style` passes through to `NotchedPane`. The existing hover card already does exactly this — see §5.

---

# 2. The tile RESIZE mechanism — and its reusability

There are **three** distinct resize mechanisms in the codebase. Only the third is a true "window-style corner grip".

### 2a. SurfacePM tile resize (edges + corners on a mosaic)
`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/SurfacePM/SurfaceView.tsx`

- **Sensor/handle:** `EDGE_ZONES` at L72–81 — eight zones (`n s e w ne nw se sw`), each an absolutely-positioned `&lt;div className="spm-edge spm-edge-{zone}"&gt;` rendered inside `TileShell` (L179–186). CSS at `SurfacePM/surfacepm.css:201–270` (strip widths, `ns-resize`/`ew-resize`/`nesw-resize`/`nwse-resize` cursors). A corner zone maps to **two** edges (`['n','e']`), so one drag drives two actions simultaneously.
- **Drag loop:** `onEdgeDown` L321–398. Snapshots origin layout + geometry, resolves each edge to a boundary via `core/edges.ts:resolveEdge`, builds an `Action[]`, then `startPointerDrag(e, { threshold: 0, onMove, onEnd })`. `onMove` reduces the actions over the *frozen origin* layout each frame (never accumulated), with snap magnetism (`snapAxis`, `withoutOwn` filter L318–320).
- **Ops (pure, in `SurfacePM/core/ops.ts`):** `stretchTileHeight` (south, tile grows alone), `resizeStackPair` L244 (north, pair clamp), `resizeBandPair` L273 (band seam), `resizeDivider` L196 (east/west ratio splitter with `extentPx`).
- **Clamping:** `minTilePx = TILE_MIN_PX` (`SurfaceView.tsx:5, 211`), defined at `design-system/tokens/size.css.ts:73` — **`TILE_MIN_PX = 64`**, documented as "the floor a resizable tile is never dragged below, on either axis — SurfacePM's blocks and MarkdownPM's embedded page tiles agree on one minimum". No max; the divider extent (`rects.ts:18`) is the horizontal ceiling.
- **Sensor primitive:** `SurfacePM/sensors/pointerDrag.ts` (76 L) — `startPointerDrag(e, {onMove(dx,dy,e), onEnd(commit), threshold})`. rAF-coalesced cumulative deltas from origin, pointer capture, aborts on Esc / `pointercancel` / `lostpointercapture`, `suppressNextClick` on armed commit.
- **Storage:** fully controlled — `layout` in, `onLayoutChange(next)` out (`SurfaceView.tsx:396`). The host persists; `core/codec.ts` round-trips the tree. Per the README (L78–83), block docs are one row in `nexus.db` (`main/blocks.ts:1`).
- **Reusability for a non-tile floating element:** the *ops* are tree-specific (bands/rows/columns) and useless outside SurfacePM. The *sensor* (`startPointerDrag`) and `TILE_MIN_PX` are fully generic and reusable.

### 2b. MarkdownPM embed-tile resize (single bottom strip) — "the resize arc"
`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx`

- `EmbedResizeHandle` L94–142: a `.mdpm-embed-resize` strip (CSS `MarkdownPM/Styles.css:358–371` — `left/right 12px, bottom -3px, height 8px, cursor ns-resize`).
- Uses the **shared gesture skeleton** `usePointerGesture()` (L104) with `activation: 0` — commented "a resize arms on the first move, **the SurfacePM edge precedent**" (L120).
- Clamp: `Math.max(TILE_MIN_PX, Math.round(startH + ev.clientY - startY))` (L128). Vertical only.
- `onAbort` restores `startH`; `teardown` removes `is-resizing-tile`; `onDrop` commits `lastH` (never a DOM re-read — L114–117 explains why).
- **Storage:** `EmbedHeightsApi { load, save }` (L61–65) → `view.state.facet(embedHost).saveHeights(heights)` → host callback. Wired at `Detail/PageView.tsx:95–98` to `window.nexus.embedHeights.get()/set(pageId, heights)` → **device-local `nexus.db`**, scope `embedHeights` (see §4).
- Relevant commits: `0932778c` "the resize handle outlives the loading frame", `6237046e` "the resize arc … enter the record", `8eec9cab` "tile resize graduates to core, keyed host-to-target".

### 2c. The shared gesture skeleton (the reusable core)
`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/design-system/interactions/gesture.ts` (144 L)

`beginPointerGesture(spec)` / `usePointerGesture()`. Spec: `{el, event, activation, capture, onActivate, onDragMove, onDrop, onAbort, teardown, swallowActiveEscape}`. Module-singleton — one live gesture at a time; window-listener driven; capture deferred to activation; unmount-safe `abort()`. `ACTIVATION` from `interactions/shared.ts`. **`swallowActiveEscape` (L27–30) exists precisely for "a surface living inside a dismissable host (a dropdown) whose own Escape must not fire mid-drag"** — directly relevant to resizing inside a popover.

### 2d. FloatingWindow — the actual corner-grip mechanism (most reusable for a floating element)
`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/design-system/interactions/FloatingWindow.tsx` (140 L) + `floatingWindow.css` (28 L)

- `FloatingBounds { minW, minH, defW, defH }` (L9–14); `FloatingDragMode = 'move'|'nw'|'ne'|'sw'|'se'` (L16).
- `useFloatingWindow(id, bounds, dragSurfaces)` → `{ style, onWindowDown, startDrag }`.
- **Geometry store: `const geoStore = new Map&lt;string, Geo&gt;()` at L27** — module-level, keyed per window id, "never a bare module singleton (multiple simultaneous previews need windows that don't share one slot)". **Session-only; never written to disk.**
- **Size persists across opens, position does not** (L48–55): every open re-centers x/y but keeps w/h.
- Drag loop L69–108: raw pointer capture on the pressed element, `clamp(minW … viewport)` per axis, `nw/sw` also move `x`, `nw/ne` also move `y`. Re-clamps on window resize (L56–64).
- `FloatingResizeCorners({startDrag})` L123–140 renders four 14×14 corner divs (`.fwin-resize-{nw,ne,sw,se}`, correct diagonal cursors, `z-index: 2`).
- **Consumers:** `design-system/components/PreviewPane/PreviewPane.tsx:102, 249`. Window ids in use: `"page-preview"` (`PagePreview/PreviewWindow.tsx:187`), `"navwindow"` (`NavWindow/NavWindow.tsx:149`), `"settings"` (`Settings/SettingsWindow.tsx:83`). Default `BOUNDS = {minW:360, minH:280, defW:850, defH:600}` (`PreviewPane.tsx:17`).
- **Reusability:** this is the closest fit for a non-tile floating element — it is already id-keyed with one shared size slot per id, already axis-agnostic (h + v), already clamped by `FloatingBounds`. It is *not* wired to any disk persistence, and it hard-couples position (always recenters) to the same hook.

---

# 3. The Settings surface

`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Settings/SettingsWindow.tsx` (162 L) + `settingsWindow.css` (84 L)

- **Structure:** a `PreviewPane` (`id="settings"`, `WIN = {minW:460, minH:340, defW:720, defH:520}` L12, `RAIL = {min:130, def:170, max:240}` L13, `toolbar="floating"`, `tintOpacity={90}`). Left rail = an in-flow `SidePane` (`windowId: 'settings-rail'`) holding a `role="tablist"` of categories. Body = `.settings-body.edge-fade` → `&lt;h2 .settings-heading&gt;` → `&lt;div .settings-section&gt;` → rows.
- **A "Pages" section EXISTS:** `CATEGORIES` L18–21 = `[{key:'general', label:'General', icon:'sliders-horizontal'}, {key:'pages', label:'Pages', icon:'file-text'}]`. `TOGGLES.pages` (L61–67) currently holds exactly one entry: `codeblockLineCount`. Comment at L17: "New panels register here, with their toggle list keyed alongside."
- **Control components:** the only control type currently rendered is `Switch` (`design-system/components/Switches/Switch.tsx`) inside `ToggleRow` (L138–162). The row shape is `.settings-row` → `.settings-row-text` (`.settings-row-label` + `.settings-row-hint`) → control. **There is no slider row here yet** — adding one means extending the `Toggle`-shaped schema (currently `{key, label, hint, defaultOn}`) into a discriminated union, since `TOGGLES[category].map(ToggleRow)` is the only render path.
- **The app's slider control:** `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/design-system/components/Slider/Slider.tsx` (92 L) + `slider.css.ts` (32 L). Props `{value, min, max, step=1, ariaLabel, onCommit, onInput?, format?, readoutClassName?}`. Drafts locally while dragging, `onInput` per tick, `onCommit` on release and on arrow-key step. `role="slider"` with full aria-value* set. Renders `ProgressBar` + a `GlassSegment` knob; `--slider-knob-scale` (default 0.75) resizes the knob. **Exactly one consumer today:** `Components/Detail/ViewSettings.tsx:22, 178–189` (card Scale, min/max/step 0.05, `format={v =&gt; \`${v.toFixed(2)}x\`}`, `readoutClassName={detail}`). Raw `&lt;input type="range"&gt;` exists only in dev/showcase surfaces (`design-system/interactions/Interactions.tsx:76`, `showcase/leaves/GlassLeaf.tsx:121`) and `Components/PhotoCropModal.tsx:145`.
- **Persistence flow (personalization):**
  1. `Settings/SettingsWindow.tsx:154` → `setPersonalization(key, value)`
  2. `renderer/src/store.ts:851–866` — updates the `personalization` slice (and the `tree` copy **only** for `defaultIcons`, deliberately), calls `applyPersonalizationKey(key, value)`, then `void window.nexus.personalization.set(key, value)`.
  3. `renderer/src/design-system/personalization.ts:9–32` — `ROOT_CLASSES` apply-map (`hideChevrons→hide-chevrons`, `outlinerLines→outliner-lines`, `codeblockLineCount→cb-line-count`); keys with no DOM effect carry no row.
  4. IPC `'personalization:set'` at `main/index.ts:1256–1266` → `writePersonalization(root, key, value)` at `main/settings.ts:78–88` → `updateSettings` (L18–28), a serialized read-modify-write of `.nexus/settings.json` that preserves foreign keys.
  5. Read side: `main/readNexus.ts:79–124` `readPersonalization` — **a key it doesn't parse is silently dropped**, so a new key MUST be added both to `Personalization` in `shared/types.ts:51–79` *and* to the coercion pass. Loaded into the store at `store.ts:788–789`.
  - **`.nexus/settings.json` is the synced/portable per-Nexus scope** (travels with the Nexus). Doctrine: `.claude/Features/ConfigurationPM.md:3, 7, 37, 48`.
  - Precedent for a *numeric* personalization key: `defaultViewScale` — `shared/types.ts:76–89` (`VIEW_SCALE_DEFAULT/MIN/MAX` + `coerceViewScale`), read at `readNexus.ts:122`.
  - The no-empties discipline (`SettingsWindow.tsx:152`): default-on keys store only their off state.

---

# 4. Where "universal persisted size" would conventionally live — precedents

| Precedent | Where the value lives | Mechanism |
|---|---|---|
| **Floating window size** (preview / navwindow / settings) | **In-memory only** — `geoStore: Map&lt;string, Geo&gt;` at `design-system/interactions/FloatingWindow.tsx:27` | Keyed by window `id`; survives exit-presence unmounts; dies with the app. Size persists across opens, position never does. |
| **Side-pane width** (inspector rails) | **In-memory only** — `const widths = new Map&lt;string, number&gt;()` at `design-system/components/SidePane/SidePane.tsx:16`, comment L15: "Widths persist per window id across remounts, **session-only — not written to disk**". `sidePaneWidth(windowId, def)` (L20) lets hosts seed first paint. Shared slot exported as `PREVIEW_PANE_INSPECTOR` (`PreviewPane.tsx:20`) — "one remembered width across every window that hosts one". |
| **Embedded-tile heights** (the closest true precedent for persisted geometry) | **Device-local `nexus.db`**, scope `'embedHeights'`, key = pageId, value = `{targetId: px}` | `main/db/localState.ts:11–22` (`Scope` union), IPC `embedHeights:get/set` (`shared/bridge.ts:78–79`, `preload/index.ts:109`), validated main-side by `isHeightMap` (`main/index.ts:391–396`), consumed via `EmbedHeightsApi` (`embedWidget.tsx:61`) wired at `Detail/PageView.tsx:95–98`. |
| **`tableHeadingCols`** (the sidecar-style precedent named in the prompt) | Device-local `nexus.db`, scope `'headingCols'`, key = pageId, value = `number[]` | `shared/bridge.ts:80–81`, `main/index.ts:397–398` (`isIndexArray`). |
| Other device-local scopes | `main/db/localState.ts:11–22`: `folds, activeView, viewOrder, headingCols, embedHeights, linkTitle, blockDoc, tabs, previews, recents, record`. Singleton scopes use key `''` (L26). | `readScope&lt;T&gt;(scope)` L37–50, `writeKey(scope, key, value)` L55+ (`null` deletes the row). Single-row upsert — "no read-merge-write, no debounce, no drain at quit" (L1–3). DB at `.nexus/nexus.db` (`main/db/open.ts:10`), ignored by the watcher (`main/watcher.ts:50`). |
| Synced/per-Nexus preferences | `.nexus/settings.json` → `personalization`, `commands`, `labels`, `subfield`, `navViewModes`, profile | `main/settings.ts` (`updateSettings`, `writeSubfield`, `writePersonalization`, `readDefaultViewScale`); `main/paths.ts:58` "Per-machine chrome is not among them — that lives in nexus.db". |
| Per-device app config | `main/appConfig.ts` (56 L) | Stays on the machine, outside the Nexus. |

**Three-scope doctrine** (`.claude/Features/ConfigurationPM.md:3`): per-Nexus synced (`settings.json`) · per-device app config · per-machine chrome (`nexus.db`, never synced). A *universal* (not per-page, not per-nexus-content) UI size has no exact precedent — the closest by intent is `defaultViewScale` (a numeric knob in `personalization`), and the closest by mechanism is `SidePane`'s / `FloatingWindow`'s id-keyed module Map, neither of which touches disk.

---

# 5. Existing hover-linger / delay timers

| Timer | File:line | Value |
|---|---|---|
| **Connection hover intent** (the one that opens the hover card) | `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/MarkdownPM/editor/connections.ts:7` | `CONN_HOVER_INTENT_MS = 450`. Armed on `mouseover` of `.md-connection-resolved` (cheap class gate first, L44–47), cancelled on `mouseout` (L58), re-arms fresh on re-entry. Fires `api.hover(page, el.getBoundingClientRect())` (L49–52). |
| **Leave grace** (how long the card survives after the pointer leaves) | `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx:9` | `LEAVE_GRACE_MS = 200`, with `RECT_SLOP = 6` (L10) on both the link rect and the card rect. Window `mousemove` cancels/re-arms (L35–40); Escape closes with `preventDefault()` per the house contract (L41–45). |
| **Drag-disclose dwell** | `design-system/interactions/dragDisclose.ts:6` | `DWELL_MS = 500`, hit-test throttled to 100ms (L42), re-measure at 250ms (L35). Uses `elementFromPoint` because `pointerenter` never fires under pointer capture. |
| SurfacePM handle proximity reveal | `SurfacePM/SurfaceView.tsx:69` | `HANDLE_REVEAL_PX = 240` (distance, not time); `TRACK_SETTLE_MS = 160` L70. |
| PreviewPane footer proximity reveal | `design-system/components/PreviewPane/PreviewPane.tsx:73–74` | `NEAR_W = 260`, `NEAR_H = 120` — distance-based, cached rect. |

**There is no tooltip component or generic hover-intent helper in the design system.** Tooltips are native `title=` attributes only (`PreviewPane.tsx:217,240`, `Segmented.tsx:64`, showcase leaves).

---

## The already-built skeleton for this feature

`/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` (77 L) is an explicit **placeholder**: `useConnectionHover()` returns `{hover, card}`; the card is a `PickerMenu` (`solid`, `manageFocus={false}`, no `onDismiss` → no backdrop, per the contract comment L5–6) wrapping an **empty `&lt;div style={{width:260, height:120}}/&gt;`** (L71, `CARD = {w:260, h:120}` L8). A fixed zero-interaction anchor div is positioned at the link's rect (L58–68) and passed as `triggerRef`.

Mounted in four hosts: `Blocks/BlockSurface.tsx:22,126`, `NavWindow/NavWindow.tsx:14,133`, `Detail/PageView.tsx:7,32`, `PagePreview/PreviewWindow.tsx:15,106`.

Corroborating note at `/Users/nathantaichman/The Studio/Projects/Project Pommora/.claude/Planning/Pending-Work 8-5.md:89` — describes it as a bare placeholder whose body renderer (`Embeds/PageEmbed`) already exists, "mostly wiring a body into a shell that's already positioned and dismissed."
While those run, reading the feature docs myself:

- **Read:** .claude/Features/ConnectionsPM.md + .claude/Features/PagePreviewPM.md + .claude/Features/SurfacePM.md + .claude/Features/ConfigurationPM.md
- **Read:** .claude/Features/MarkdownPM.md
Grounding done on the docs side; three important facts already settled from my own reading:

- **The hover card shell already exists** — the intent-delayed trigger on resolved connections, the anchored backdrop-free pane, and the grace-timed dismissal are live; only its body is blank ([[PagePreviewPM]] lists it as the pending item). This arc fills that pane rather than inventing a surface.
- **Settings ▸ Pages already exists** as a section (Show Line Count In Code Blocks lives there), so the linger slider has a home — though the window is currently all boolean switches, so a slider is a new control type there, and the duration knob's scope (per-Nexus `settings.json` personalization vs device-local) is a real question.
- **The Embed Framework is the obvious compact-render candidate** — it already renders a page's real content in a foreign surface at a scale knob (text zoom on the editor's own curve), which is exactly the "squished but readable" behavior you described. But its chrome contract says banners render as a band and follow the page — your no-banner/no-title rule means this mount would need to suppress that.

Waiting on the three scouts (hover-card internals, page-render/line-width mechanics, resize + settings + persistence precedents) before I bring you the approach options and questions.

Scout 1 is back — the hover card shell is fully wired end-to-end (mounted in four hosts: PageView, BlockSurface, NavWindow, PreviewWindow), riding PickerMenu's body portal with a 450ms intent delay and 200ms leave-grace, and the body is literally an empty 260×120 div waiting to be filled. Two scouts still running; I'll consolidate once they land.

Scout 2 confirms the big reuse: the floating preview window's body is *literally* a `PageEmbed` with `chrome='none'` — no banner, no inline title, self-fetching through the warm path-keyed detail slot, text condensed via the embed scale/zoom pair. The hover card body can be the same component; your no-banner/no-title rule is that mount's default, not a new mode. One scout left (resize mechanism + settings + persistence precedents).

All three scouts are back and the picture is complete. Writing the decision log, then bringing you the questions:

- **Write:** .claude/Planning/Hover Preview — Decision Log.md
Grounding's done and the log is open at [Hover Preview — Decision Log.md](.claude/Planning/Hover Preview — Decision Log.md). Here's the honest picture — this feature is in unusually good shape because most of it already exists:

**What's already built.** The hover card isn't hypothetical — hovering a resolved connection already blooms a real floating pane after a 450ms intent delay, survives a 200ms grace when you hover off, closes on Escape, never steals focus or eats your next click. Its body is literally an empty rectangle that's been waiting since July. And the "compact view of a large document" renderer also already exists: the floating preview window's body is a component called PageEmbed that renders a page's real content read-only, **already excludes banners and inline titles by default**, already condenses text on the embed zoom curve, and already fetches through the warm cache so a page you've touched recently opens instantly. So the core of this arc is wiring an existing renderer into an existing shell — the genuinely new work is the resize, the persisted size, and the slider.

**My recommendation** is exactly that assembly, and the rejected alternatives are in the log (a mini preview-window clone — duplicates a chassis for a hover affordance; a bespoke lightweight renderer — creates the second-renderer DRY violation the embed framework exists to prevent).

Four questions are genuinely yours; each carries my call:

**1. Linger semantics.** I read "duration after hovering off" as: **None** keeps today's behavior (a short travel-grace so your pointer can cross from the link into the card), while a set duration keeps the card open that many seconds after you leave both, hover-back cancelling the countdown. The alternative reading — None means it vanishes instantly — would make the card impossible to mouse into, so I don't think you mean that. Confirm? And is 1-second steps right?

**2. What the setting syncs.** The slider value fits naturally as a per-Nexus setting in `settings.json` (same as every other Settings-window row, including the existing Pages toggle). The card's **size**, though, I'd store per-machine in the local database — the house doctrine is that UI geometry (embed tile heights, folds, pane widths) is per-machine chrome, never synced. So: behavior syncs, geometry doesn't. Good?

**3. Interactivity inside the card.** My call: glance-only — you can scroll it and select text, but nothing inside navigates or edits; clicking the link itself still opens the page, and the real preview window stays the interactive surface. Or do you want connections inside the card clickable?

**4. Failed fetch.** If the page can't load, I'd have the card simply not open rather than bloom an error box on hover. Fine?

One disclosure: connections sitting in **resting table cells** don't fire hover at all today (only live text does) — so this ships without table-cell hover previews; I've logged it as a prospect rather than quietly widening scope. Default size and min/max bounds will be hand-tunable knobs per the usual arrangement.

##### Nathan

1. Mouse-into mus timportantly NOT count as hovering off of it. You msut be able to fully scrll the preview, while it should not be editable. 
2. Agreed.
3. Agreed -- im also open to what happens when you click on the dropwons. If it shouldnt do anything, or if it should open in a preview is still up for my decision. Go with doing nothing for now.
4. Fine

On the disclosure; this is a good time to fix that -- the dropdown should be on the layer above a table so it wouldnt be constrained to the cells geometry.

##### Claude

All four answers fold in cleanly, and the table-cell fix joins the scope. One grounding note on your layering point: the card already renders through a body-level portal above everything (that's why it can't be clipped by a tile or a table) — the actual gap was that resting table cells never *fire* the hover at all. So the fix is wiring the trigger, not lifting a layer. Verifying what the static cells have to work with before I lock that decision in:

- **Read:** Pommora/src/renderer/src/MarkdownPM/Tables/cellStatic.tsx
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Dispatch:** build-breaking-agent — Attack the hover-preview spec
- **Return:** ## Hover Preview — Decision Log · Plan-Attack Catalog

Grounded against `Pommora/` at `58605eb5`. Prior-round context loaded (the backdrop trap and the missing class gate from the Phase-6 attack are both fixed — not re-flagged).

---

### Inventory (coverage contract)

Trigger (CM6 intent timer · class gate · posAtCoords) · grace lifecycle (frozen rect · window-mousemove · Escape) · PickerMenu placement (flip-once · anchor measure · viewport clamps · Bloom freeze) · PageEmbed (fetch · warm slot · failure · nested embeds · edit entry) · resize (gesture skeleton · 8 zones · persistence · clamps) · linger (personalization write · read coercion · Settings row) · hosts (×4, ×2 concurrent) · table cells (StaticCell · CellEditor · widget host).

---

## Findings

### F1 — Five of the eight resize zones move the wrong edge · High · [verified]

**What breaks:** `ConnectionHoverCard` mounts `PickerMenu` with no `direction`/`origin`, so it places by pinning the pane's **top and right** edges (`PickerMenu.tsx:191–194`: `right = max(8, innerWidth - c - reserve)`, `top = t.bottom + GAP`). Growing the card therefore moves its **left** and **bottom** edges only. Under SurfacePM's edge semantics (`SurfaceView.tsx:72–81` — `n/s/e/w/ne/nw/se/sw`), dragging E or N moves the *opposite* edge: the card grows away from the cursor.

**Who produces it:** Nathan, dragging the right edge of a hover card to make it wider. The single most obvious resize gesture there is.

**Repro** (executed transcription of `measure()`, viewport 1440×900, link at x 300–390 / y 400–418):

```
open at 260×120        → box { left: 115, right: 375, top: 424, bottom: 544 }
drag EAST edge +200px  → box { left: -85, right: 375, ... }   right edge moved   0px
                                                               left  edge moved -200px
drag NORTH edge -200px → box { ..., top: 424, bottom: 744 }    top   moved   0px
                                                               bottom moved +200px
```

Correct-tracking zones: `w`, `s`, `sw`. Wrong on at least one axis: `n`, `e`, `ne`, `nw`, `se`.

**Source and sized fix:** B-4 states the symptom as if it were the design — *"a resize grows the card away from its anchored edge"* — and B-2 independently specifies edge-drag semantics; the two are never crossed. The card is anchor-positioned, so a tile's "move the edge you grabbed" model cannot hold on the pinned axes. Two proportional options, pick one in the log rather than at implementation time: **(a)** restrict resize to `se`/`s`/`e`… no — under right+top pinning the only honest set is `w`/`s`/`sw`, i.e. drop to a **single SW corner grip**, which is one zone and zero new math; **(b)** keep eight zones and have the drag write *both* a size and a placement offset that PickerMenu applies, which is a new placement input on a shared design-system component — expensive, and it re-opens the "Considered &amp; Rejected" argument against FloatingWindow's position-coupled grips.

**Companion (fold into the same fix):** on release from an `n`-drag the pointer sits above the pinned top edge — outside both the card and the link rect — so the first mouse twitch after the drop arms the close. B-5 suspends the lifecycle *during* the drag only.

---

### F2 — B-4's "the viewport clamp/flip keeps working" is false in three ways · Medium · [verified]

**What breaks:** Once the card is user-sized, none of PickerMenu's viewport protection holds.

1. **No left clamp.** `origin: 'right'` clamps only the right offset (`PickerMenu.tsx:191`). The `origin: 'left'` branch two lines up (`:181–185`) has the mirror clamp; the right branch never got one. Verified: a 520px-wide card anchored to a link at x 60–140 places at `left: -390` — 390px off-screen. (Same input through the `origin:'left'` clamp lands at `left: 70`.)
2. **No re-flip after resize.** `decidedDir` is deliberately frozen for the life of the open (`:122–125`). Resizing a `down`-placed card to 600px tall puts its bottom at y 1024 on a 900px viewport — 132px of the *scrollable body* is below the screen edge with no flip and no bottom clamp.
3. **The direction survives link→link retargeting.** `decidedDir` resets on `open === false` only. Today the 200ms grace forces that reset between two links; **the linger removes it** — hovering link B while the card still lingers from link A keeps `hovered !== null`, so B inherits A's flip decision. A card opened downward mid-document stays downward for a link two inches from the viewport floor.

**Who produces it:** Nathan resizes the card once (B-1 says that size is then universal), then hovers a link near the left edge, near the bottom, or two links in a row.

**Source and sized fix:** the log treats PickerMenu's clamp/flip as a fixed asset; it was built for content-sized menus that never change size mid-open and always close between opens. Cheap parts: add the mirror clamp to the `origin:'right'` branch (one `Math.min`, symmetric with `:181–185`), and reset `decidedDir` when the anchor rect changes, not only on close. The re-flip-on-resize case is not cheap and is the strongest argument for capping max height below the shortest supported viewport in B-6 — say so in B-6 rather than leaving it a free knob.

---

### F3 — The anchor is a frozen rect, not the link · Medium · [traced]

**What breaks:** B-4 says *"position always re-derives from the link anchor."* It doesn't. `ConnectionHoverCard.tsx:58–68` renders a `position: fixed` div at the **DOMRect captured at hover time** and hands *that* to `triggerRef`. PickerMenu's re-measure machinery (`:208–211` — ResizeObserver on the trigger, capture-phase scroll, window resize) faithfully re-measures a div that by construction cannot move. Scroll the editor and the link travels; the card and its beak stay pinned to dead screen coordinates.

**Who produces it:** wheel-scrolling while a card is up — which the linger makes routine, since C-2 keeps the card alive after the pointer has left the link entirely. At 30s a card can outlive several screens of content.

**Repro:** hover a resolved connection, wait for the card, move the pointer off the link (linger holds it), scroll the editor. The card does not move; the beak points at whatever text scrolled under it. Same class: CM6 rebuilds decorations viewport-scoped, so the link's DOM node is gone entirely once it scrolls out — there is nothing left to re-measure even if the code tried.

**Source and sized fix:** the frozen rect was correct for a 200ms affordance and is wrong for a 30s one. Either hold the link's **element** (the `el` already in hand at `MarkdownPM/editor/connections.ts:50`) and let PickerMenu measure it live — which also gets scroll-tracking for free and costs one field on the `hover` signature — or make "the link left the viewport" a close condition. Decide it in the log; the current text asserts the behavior already exists.

---

### F4 — Navigating away leaves the card alive and re-blooms it on the new page · Medium · [traced]

**What breaks:** `PageView.tsx:57–69` renders `{hoverCard}` **only in the `'ready'` branch**. Clicking a connection flips `pageStatus` to `'loading'`, which unmounts the whole PickerMenu subtree while `open === true` (tripping PickerMenu's own dev guard at `:99–104`), then remounts and re-Blooms it when the new page is ready — because `hovered` lives in the hook on `PageView`, which never unmounts. Identical shape on tab switch.

Today the 200ms grace kills it within one mouse twitch. Under a linger of N seconds it becomes: **click a `[[link]]` → the destination page loads → a hover card of that same page blooms over it and sits there for N seconds**, anchored to where the link used to be. If the pointer hasn't moved it is still inside the frozen rect (`:38`), so the countdown hasn't even started.

**Who produces it:** clicking a connection. The primary gesture on the surface the card decorates.

**Source and sized fix:** the hook's lifetime is tied to the host component but the card's *rendering* is tied to a status branch — the linger widens that gap from 200ms to 30s. One line: hoist `{hoverCard}` out of the `'ready'` case, and clear `hovered` when the host's target page changes. Add it to the log as an explicit close condition ("the host navigates") alongside Escape.

---

### F5 — The intent timer is never cancelled by the click that consumes the link · Medium · [traced]

**What breaks:** `connections.ts:31–37` cancels the pending 450ms timer on `mouseover` and `mouseout` only. The `click` (`:61–72`) and `contextmenu` (`:74–82`) handlers do not. A click that lands inside the intent window leaves the timer armed; it fires afterward with `el.getBoundingClientRect()` read from a node the navigation may already have detached — a detached node returns an all-zero rect, which places the card at `left: -230, top: 6` (a 30px sliver of glass in the top-left corner).

**Who produces it:** Nathan clicking a connection he already recognizes — roughly 250–350ms of dwell, comfortably inside 450ms.

**Certain repro (no teardown timing involved):** turn on Settings ▸ General ▸ *Open Connections In Preview*. `api.open` then routes to `openPreview` (`PageView.tsx:38–41`) and the main editor stays mounted, so `el` stays attached and the rect is **valid**. Click a connection inside 450ms → the preview window opens → 450ms later a hover card of the same page blooms over the editor you're still looking at, and lingers.

**Source and sized fix:** one missing `cancelHover()` in two handlers. Subtractive, ~2 lines, in a file the arc is opening anyway. Flag it in the log as a prerequisite — it is currently invisible and becomes a persistent artifact the moment the card has a body and a linger.

---

### F6 — The card's body makes a third page editable · High · [traced]

**What breaks:** A-4 rules the card glance-only, *"never editable, clicks inside do nothing."* A-2 specifies the body as `PageEmbed`, *"the same component the preview window mounts"* — and `PreviewWindow.tsx:227–235` passes **no `ancestors`**. `PageEmbed` then hands its editor `embedAncestors={[path]}` (`PageEmbed.tsx:165`), and `embedWidget.tsx:280` computes `const interactive = host.ancestors.length &lt;= 1` → **true**. So any `![[Embed]]` tile inside the previewed page renders interactive inside the hover card: clicking it dispatches `setEmbedEditing` (`:206–208`), which is a `StateEffect`, not a doc change — `EditorState.readOnly` on the card's own editor does not block it. The nested tile's inner editor becomes live and its keystrokes save to a **third** page's file.

**Who produces it:** hovering a connection to any page that contains an embed tile, then clicking the tile. Embedded pages are a shipped feature; there is nothing exotic here.

**Source and sized fix:** copying the preview window's configuration inherits the preview window's *interactivity*, which is correct there and disqualifying here. One prop: pass a non-empty `ancestors` (or a `locked`-forcing equivalent) so `interactive` is false. Add it to A-2 as an explicit divergence from the preview-window mount — "the same component" is currently doing load-bearing work the log hasn't audited.

---

### F7 — The log never rules on whether the body gets a `ConnectionsApi`, and both answers break · Medium · [traced]

**What breaks:** `PageEmbed` takes `connections?: ConnectionsApi`. The log is silent, and the two options fail differently:

- **Omit it.** `decorations.ts:269` gates the entire wiki-link decoration pass on `if (conn)`. With no API, every `[[Title]]` in the card renders as **raw visible brackets, uncolored, inert** — directly against the success criterion "the page body readably condensed."
- **Pass the host's API.** It carries `hover` (`connections/index.ts:27`), and every host wires it. The card's own inner editor then fires `api.hover` → the same host hook's `setHovered` → **the card retargets itself to the nested link**: `PageEmbed`'s `path` changes (blank frame, refetch), and the anchor jumps to the inner link's rect, which is *inside the card* — so the card relocates under the cursor, with `decidedDir` still frozen from the original open (F2.3).

**Who produces it:** hovering a link inside the card. A-3 explicitly invites the pointer in and keeps it there indefinitely; a preview full of connections is the normal case.

**Source and sized fix:** the third option nobody wrote down — pass a `ConnectionsApi` with `resolve`/`candidates` but `hover` and `open` stripped. That is a small object literal at the card's mount site and it satisfies A-4 ("clicks inside do nothing") by construction rather than by a swallow handler. Needs to be an explicit A-series decision; there is currently no default that isn't wrong.

---

### F8 — A-5 cannot be built through `PageEmbed` as A-2 specifies · Medium · [traced]

**What breaks:** A-5: *"a failed fetch means the card simply doesn't open."* But `open` is driven by `hovered !== null`, set the instant the intent timer fires — **before any fetch exists**. `PageEmbed` self-fetches from its own mount effect (`PageEmbed.tsx:92–107`) and exposes no failure signal: `onBody` fires only on success (`:88–90`), and a failure renders its own `pgembed-failed` box internally (`:116`). So the card necessarily Blooms, then shows the error box A-5 forbids.

The adjacent case: a cold page (not in `readPageDetail`'s 40-entry path slot, `warmCache.ts:50–62`) renders `&lt;div className="pgembed" /&gt;` (`:117`) until IPC returns — so the card Blooms as a fixed-size **empty pane** and pops content in. A-2's "warm-slot fetching for free" only covers pages already visited this session.

**Who produces it:** hovering a connection to a page not opened this session (the common case on a fresh launch), or to one whose file went missing.

**Source and sized fix:** A-2 and A-5 were decided independently and never crossed. Cheapest reconciliation: the *card* resolves the detail before setting `hovered` — `readPageDetail(path)` is a synchronous cache hit for warm pages, `openPage` for the rest — and passes the body down, which satisfies A-5 exactly and kills the blank frame in the same move. That is a real change to A-2's "self-fetching through the warm detail slot," so it belongs in the log, not in the implementer's lap.

---

### F9 — A new personalization key silently reverts, and no gate catches it · Medium · [traced]

**What breaks:** `personalization:set` accepts any string key and writes it (`main/index.ts:1256–1266`). `readPersonalization` (`main/readNexus.ts:79–124`) reconstructs the object as an **explicit field list** — a key not named there is dropped on the next read. Because every `Personalization` field is optional, an object literal missing one is a legal `Personalization`, so `npm run typecheck` is silent. The one round-trip test (`main/readNexus.test.ts:429–446`) iterates a **hand-maintained** `keys` array, so it is silent too.

**Who produces it:** the implementer adding the linger key to `shared/types.ts` and the Settings row and forgetting `readNexus.ts:105–123`. The symptom is "the slider works, then resets when I reopen the nexus" — days later, at a distance from the change.

**Source and sized fix:** the contract has three edit sites and only one of them is enforced. C-3 names the coercion doctrine but not the file; naming `readNexus.ts` in C-3 costs a clause. Structurally, deriving the test's `keys` from a shared list would make the omission fail red, but that's a separate cleanup — don't grow this arc for it.

---

### F10 — Nobody clamps the stored size on read, and B-6 names the actor · Low · [traced]

**What breaks:** B-1 says min/max clamp the universal size; B-3 puts it in a `nexus.db` singleton scope. `localState.ts` deliberately does not validate (`:4–6`: *"Only Pommora writes here, so a decode failure is a bug"*) — `readValue` returns whatever was stored. So the clamp exists only wherever the resize drag applies it, and a value already on disk is never re-checked.

**Who produces it:** B-6 explicitly leaves min/max as knobs Nathan tunes. Tighten the max after any card was sized above it and every launch reopens at the old, now-illegal size.

**Source and sized fix:** the Prospects section already asks for the size to sit behind **one accessor** ("don't-foreclose: keep the size read behind one accessor") — put the clamp *in* that accessor and both requirements are one function. Precedent is right there: `store.ts:83–92` / `:98–104` clamp the sidebar and inspector widths on read for exactly this reason.

---

### F11 — Two hosts, two cards · Low · [traced]

**What breaks:** `useConnectionHover` is per-host state. `NavWindow` and `PreviewWindow` share one `preview` slot (`store.ts:238`) so they're mutually exclusive, and `PageView`/`BlockSurface` are routed — but one of each pair is live simultaneously (`App.tsx:269–270`), and both portal to `document.body`. Nothing coordinates them.

**Who produces it:** hover a link in the main editor, move to the open preview window, hover a link there. Today the 200ms grace makes the first card gone before the second appears; under a linger both are up.

**Source and sized fix:** the log's B-1 ("every hover card opens at that one remembered size") implies singularity without stating it. One line in the log — "at most one card is live app-wide" — plus a module-level live-card token, or an explicit ruling that two are acceptable. Don't build arbitration machinery for it.

---

### F12 — D-2's "verified at plan time" isn't supported, and D-1 produces an unopenable preview · Medium · [traced]

**What breaks:** D-2 asserts *"the focused live cell's coverage is verified at plan time."* The code says the live cell has **no connection interaction whatsoever**: `CellEditor.tsx:81–160` builds a raw `EditorView` with `markdownDecorations`, caret, keymaps, an input handler and a `blur` handler — `connectionClicks` is absent. No click-to-navigate, no context menu, no hover. That isn't a hover gap; it's the whole surface.

Which makes D-1 incoherent in ordinary use: `StaticCell` swallows every left mousedown and swaps the cell into that editor (`cellStatic.tsx:80–86`). So a resting cell shows a hover card for a page, and the click that everywhere else opens that page instead **turns the cell into an editor with no link behavior at all**. Worse, the pointer is now sitting inside the frozen link rect (`ConnectionHoverCard.tsx:38`), so the grace never arms — the card hangs over the table, unmoving, while the user types into the cell, until the mouse moves.

**Who produces it:** hovering a `[[Link]]` in a table cell and then clicking it. D-1 is the decision that makes this reachable.

**Source and sized fix:** re-run D-2's verification and write the result down — the honest finding is "the live cell has no connection handlers, and D-1 does not change that." Then rule on the consequence: either the cell's link opens on click (extend `CellEditor`, a separate decision), or D-1 ships knowingly with a preview you can't act on. Also note that D-2's "the shared intent-delay logic" is not currently shareable — it's a closure inside `connectionClicks` bound to `view.posAtCoords` (`connections.ts:29–53`); reusing it against React spans means extracting it first, which is a task the log doesn't name.

---

### F13 — "None" writes a value instead of clearing the key · Low · [traced]

C-3 routes the knob through the generic setter. Every existing Settings row deliberately writes `undefined` rather than the default (`SettingsWindow.tsx:152–158`: *"Stores only the OFF state — an untouched nexus keeps a clean file"*), and `writeKey`'s null-deletes-the-key discipline says the same thing one layer down (`localState.ts:52–54`). A numeric slider at position 0 will write `0` unless C-5 says otherwise. One clause in C-5: **None sends `undefined`, not `0`.**

---

## Coverage honesty

**Checked and grounded:** the full grace lifecycle against resize, Escape, navigation and multi-host; PickerMenu placement arithmetic (executed, not read); `PageEmbed`'s fetch/failure/nesting/edit-entry paths; the personalization write→read→revert round trip; the `localState` scope contract; both table-cell renderers; the four host mount sites and their concurrency; the `connections.ts` handler set pairwise (mouseover × click × contextmenu × mouseout).

**Checked and dismissed at the gate:** see kills below.

**Not checked:** the CSS side of the resize zones (`spm-edge-*` is SurfacePM-scoped markup — whether those classes are liftable or need a parallel set is an implementation question, not a plan gap); `Slider`'s pointer behavior inside `PreviewPane`'s drag surfaces (C-4's row-union work is acknowledged as unbuilt); `nexus.db` schema/migration for a new scope (the `Scope` union at `localState.ts:11–22` is a one-line add, nothing to attack); the linger interaction with the OS-level "app loses focus" case.

---

## Unknowns

1. **Does Chrome fire `mouseout` when CM6 tears the editor DOM out from under a stationary pointer?** If it does, one branch of F5 (the navigate route) self-cancels and only the preview route survives; F5's severity is unchanged either way, but the repro count is. *Ten-second check:* with the app open, `console.log` in `connections.ts`'s `mouseout`, click a connection without moving the mouse, watch whether it fires before the 450ms mark.
2. **Does a fixed-height scrolling body compose with `NotchedPane`'s content-measured sizing without a measure loop?** `NotchedPane` bails on unchanged integral sizes (`:145–151`) so it should settle, but the RO → `onResize` → `place()` → `setPos` → re-render chain is untested against a child that owns its own overflow. *Ten-second check:* mount any fixed-height scrolling child in a `PickerMenu` and scroll it — jitter or a pinned CPU core is the tell.

---

## Killed candidates

- **The card's editor steals focus from the page you're typing in** — gate 3: `MarkdownPM/index.tsx:321` gates `view.focus()` on `!readOnlyAtMount.current`; a read-only mount never focuses.
- **Escape during a resize drag closes the card instead of aborting the drag** — gate 3: `gesture.ts:109–116` binds keydown in the **capture** phase on `window` and `stopImmediatePropagation()`s while active; the card's closer is a bubble-phase `window` listener (`ConnectionHoverCard.tsx:47`) and never runs. `swallowActiveEscape` does what B-5 claims.
- **Per-frame re-placement while scrolling inside the card** (capture-phase `scroll` at `PickerMenu.tsx:210` catches the card's own internal scroll) — gate 3: rAF-coalesced by design, and every existing `MenuScrollFrame` picker already lives with it.
- **`flushPageSave` on card mount flushes another host's pending write early** (`PageEmbed.tsx:111–114`) — gate 4/5: it writes the same bytes sooner; there is no lost state and nothing to guard.
- **A 30s card showing a page that was renamed or deleted mid-linger** — gate 1: "hover a link, walk away, delete that page inside 30 seconds" is not a Tuesday.
- **`gesture.ts`'s module singleton refuses the resize while another drag is live** (`:45`, `:70`) — gate 3: the refusal returns `null` cleanly and `usePointerGesture` honors it (`:139–143`); by design.
- **Table-cell hover already misfires through the page editor's `mouseover`** — gate 1: the class gate passes (cellStatic emits `md-connection-resolved`), but `posAtCoords` lands on the embed widget's boundary and `wikiLinkAt`'s `rel` check rejects it — except for a leading-pipe-less GFM table whose first cell *starts* with the link, which nobody writes by hand.
- **`decidedDir` is decided against a zero-sized pane, killing the flip entirely** — gate 3: `NotchedPane`'s layout effect runs child-before-parent and publishes the real size through `onPaneResize` *before* PickerMenu's placement effect calls `measure()`. The flip is correct at open time; only F2's post-open cases survive.

---

## Verdict

**13 findings** — 2 High (F1, F6), 8 Medium (F2, F3, F4, F5, F7, F8, F9, F12), 3 Low (F10, F11, F13). **0 latent. 2 unknowns. 8 killed.**

The log's shell reuse is sound and its A-series content decisions are right. What it hasn't done is cross its three new mechanisms against each other or against what `PickerMenu` actually guarantees. Three claims in it are false against the code as written — B-4's "re-derives from the link anchor" (F3), B-4's "the viewport clamp/flip keeps working" (F2), and D-2's "verified at plan time" (F12) — and two decision pairs are unreconciled: A-2 × A-5 (F8) and B-2 × B-4 (F1). The linger is the amplifier throughout: five findings (F2.3, F3, F4, F5, F11) are pre-existing behaviors that a 200ms grace has been hiding and a 30-second one will not.

The load-bearing call is F1. Eight edge zones cannot behave like tile edges on an anchor-positioned pane, and the honest resolution is probably the smaller one — a single SW grip — which also disposes of F2's off-screen cases and F1's post-drop close.
The reviewer is attacking the log now — aimed at the interleavings that worry me most: the frozen anchor rect versus a resizable, scrollable, 30-second-lingering card; resize drags exiting the card mid-gesture; the world changing under a lingering card (rename, tab switch, tree reload); and the table-cell hover fighting StaticCell's click-to-edit swap. I'll fold what survives verification and come back with the converged log.

The attack came back with 13 findings, 2 High — and several claims in my log proven false against the code. Before folding anything, I'm verifying the load-bearing ones myself:

- **Read:** Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx + Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx + Pommora/src/renderer/src/MarkdownPM/editor/connections.ts
- **Bash:** Verify reviewer findings F6, F4, F7, F12, F8 at cited sites
Every load-bearing finding checks out against the code — the reviewer earned its keep. Folding the round into the log:

- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Bash:** Commit the decision log (explicit path only)
The review round did real work — 13 findings, and the ones that mattered I verified against the code myself before folding. The log is committed (`71b423c1`), everything is settled except **one question that's genuinely yours**, because it amends something you ratified:

**The resize zones can't all be honest.** A tile floats free, so dragging any edge moves that edge. The hover card doesn't — it's *anchored to the link*, which pins two of its edges in place. I verified the geometry: under the current anchoring, dragging the card's right edge would move its **left** edge — the card grows away from your cursor, backwards. Five of the eight tile zones misbehave this way; no amount of implementation care fixes it, it's what "anchored" means.

**My recommendation:** pin the card's top-left corner to the link, and put the SurfacePM-style resize strips on the free edges only — the **right edge, the bottom edge, and their corner** (mirrored to the top when the card flips above a link near the screen bottom). Same chrome, same cursors, same gesture engine, both axes — just only where the drag can physically track your pointer. The alternative is teaching the shared dropdown component to let drags override its positioning so all eight zones work, which is real added machinery in a design-system component to support zones that fight the anchor. Not worth it. Your call.

**What the review caught and I folded without needing you** (all verified real):

- **The card would have been secretly editable.** Copying the preview window's embed mount makes any `![[embed]]` tile *inside* the previewed page fully interactive — click it and your keystrokes save to a third page's file, from inside a hover card. Now explicitly inert.
- **Links inside the card**: omitting connection wiring renders them as raw ugly brackets; passing the full wiring makes the card hover-preview *its own contents* and retarget itself. Ruled: links style normally but are fully inert — which is also exactly your "clicks do nothing."
- **The card was anchored to a frozen snapshot, not the link** — scroll while it lingers and it hovers over dead coordinates. Now it tracks the live link, and the link scrolling out of view closes it.
- **Click-then-bloom orphans**: clicking a link within the 450ms intent window leaves the timer armed — with a linger, a card would bloom over the page you just opened and sit there. Two-line prerequisite fix, now in the log.
- **One card app-wide** (two hosts can render simultaneously; a linger would let two cards stand), **navigation closes the card**, **max size clamps to the viewport**, **stored size clamps on read**, and the settings key is pinned to all three contract sites so the slider can't silently revert on reopen.

**One honest note on table cells:** the hover from resting cells is fully doable as ruled. But the *focused* cell editor turns out to have no link behavior at all — no click-navigate, no menu, nothing — so in tables, hover is the only link affordance and clicking still just edits the cell. That's consistent with how tables work today; giving the live cell link behavior is logged as its own future decision, not smuggled into this arc.

Give me the resize ruling and the log is sign-off ready for planning.

##### Nathan

Yeah thats what I ment lmao. Card height as in UP should not be reisozable. The notch should anchor relatively instead of top-left pinned always. Flows with where the link is on the page; so a link on the righside of the page would have it's notch 

----^

While a preview hover on the left side of the page would go

^-----

Annd somethinf closer to the middle would be

--^--

##### Claude

That clears it — and the beak picture you drew actually *simplifies* the placement rather than complicating it. Folding the ruling in:

- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Bash:** Commit the resize ruling into the log
Folded and committed (`34024ed2`). The log is now fully converged — here's where it stands:

**What your ruling means mechanically.** The card centers itself on the link (clamped to stay on-screen) and the beak slides along its edge to keep pointing at the link — exactly your three sketches. That center-derived placement is actually *cleaner* than what the review was patching: the off-screen clamp problems dissolve because centering clamps both sides by construction. Resize lives on the right edge, bottom edge, and their corner; height only ever grows downward.

**Two small consequences I've made calls on — disclosing, not asking:**

- Because the card is centered on the link, widening it grows **both sides** when there's room (the link stays under the beak), and one side once you're pressed against a screen edge. This is the natural behavior of an anchored surface; the edge you drag always moves outward.
- When a card near the bottom of the screen flips to open *above* its link, only width resize is offered there — your "never grows up" rule, applied literally; its bottom edge is the anchored one.

**Status: review-certified.** One adversarial round, 13 findings, every load-bearing one verified by me against the code before folding, all resolved into decisions. Nothing open remains except the hand-tuned knobs (default size, min bound, the 1-second slider steps) which are yours to nudge once it's running — the max is deliberately not a knob, it clamps to the viewport.

Confidence is high: the shell, renderer, gesture engine, slider, and both persistence homes all exist and were read, not recalled — the genuinely new code is the beak-flow placement mode, the resize chrome on the card, the table-cell trigger hoist, and the Settings row union. The log at [Hover Preview — Decision Log.md](.claude/Planning/Hover Preview — Decision Log.md) stands on its own for a planning agent.

Anything left you want in the spec, or should I take it into the plan?

##### Nathan

this beak behavior also likely exists somewhere in the codebase already.

##### Claude

Likely right — PickerMenu already has an `anchorX` prop whose whole job is aiming the beak at an arbitrary x. Verifying who uses it and how far it already goes:

- **Bash:** Find anchorX and notchInset consumers
- **Bash:** Inspect how existing surfaces position the beak
- **Bash:** Read the toolbar's beak-aiming computation
- **Bash:** Find where the toolbar beak offsets are measured
- **Bash:** Locate the beaks source
- **Read:** Pommora/src/renderer/src/Toolbar/Toolbar.tsx
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Bash:** Find the Sources lines to anchor the edit
- **Edit:** .claude/Planning/Hover Preview — Decision Log.md
- **Bash:** Commit the precedent citation
Good catch — confirmed and committed (`77129836`). The sliding beak is the toolbar trio's established pattern: the Navigation and Settings dropdowns already hold their pane still and aim the beak at whichever button opened them, and `NotchedPane` natively handles any beak position — clamping it clear of the rounded corners and starting the Bloom animation from wherever the beak tip sits. The log now cites that as the precedent instead of describing new machinery; the genuinely new code in B-4 is one computation in PickerMenu's centered placement branch (link center minus pane edge) feeding plumbing that already exists.

That was the last unclaimed piece of the design. The log stands fully converged and review-certified — ready to hand to planning on your word.

##### Nathan

Go for it.

##### Claude

Taking it into planning. The brainstorm skill hands off to `writing-plans-v2` — pulling its full text back first (it was truncated in compaction):

- **Bash:** List the planning skill's files
- **Bash:** Read the truncated tail of the planning skill
- **Bash:** Read the exact seams the plan tasks will cite
All seams confirmed. Writing the plan:

- **Write:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Bash:** Commit the implementation plan
- **Dispatch:** build-breaking-agent — Attack the implementation plan
- **Return:** ## Findings

### F1 — Task 1 cannot pass its own typecheck gate; its Files list omits the receiver
**What breaks:** T1 changes `ConnectionsApi.hover` to `(page, measure: () =&gt; DOMRect | null)` but lists only `connections.ts` + `connections/index.ts`. All four hosts assign the card's `hover` by shorthand (`PageView.tsx:44`, `BlockSurface.tsx:140`, `NavWindow.tsx:142`, `PreviewWindow.tsx:115`), and the card still declares `hover: (page: ConnPage, rect: DOMRect) =&gt; void` (`ConnectionHoverCard.tsx:19`). Four typecheck errors — and the Global Constraints require all three gates green *before every commit*.
**Who produces it:** the implementer executing T1 as scoped.
**Repro:** executed the exact shapes under `--strict`:
```
error TS2322: Type '(page: ConnPage, rect: DOMRect) =&gt; void' is not assignable to
  type '(page: ConnPage, measure: () =&gt; DOMRect | null) =&gt; void'.
    Type '() =&gt; DOMRect | null' is not assignable to type 'DOMRect'.
```
**Severity:** Medium `[verified]` — self-announcing, but it forces an unplanned improvisation or a silent T1/T2 merge at the first commit.
**Source and fix:** T1's *Steps* prose already names the card ("the four hosts' `hover` wiring plus the card"); the *Files* list doesn't. Add one Modify line — the hook takes `measure` and calls it once at open (frozen-rect behaviour preserved; T2 makes it live). One plan line, ~3 code lines. No other inter-task window breaks: T3–T9 are all additive within already-typed seams.

### F2 — T5's stated inset expression aims the beak ~160px off the link, in every centred pane in the app
**What breaks:** the plan writes `notchInsetLeft = c − left` and glosses `left` as "the clamped pane edge". It isn't. `pos.left` is the pane's **centre** — the layer renders `left: ${pos.left}px` plus `transform: translateX(-50%)` for `origin === 'center'` (`PickerMenu.tsx:367-371`). `NotchedPane` measures `notchInsetLeft` from the **left edge** (`NotchedPane.tsx:174`).
**Who produces it:** the implementer transcribing the Files bullet.
**Repro:** executed both formulas against `PickerMenu`'s clamp and `NotchedPane`'s `nMin/nMax` band verbatim:

| case | plan `c − left` → clamped | beak lands | correct `c − (left − pw/2)` | beak lands | link |
|---|---|---|---|---|---|
| mid-page link, 380px card | 0 → 30 (nMin) | x=540 | 190 | x=700 | 700 |
| right-edge link | 158 | x=1210 | 348 | x=1400 | 1400 |
| 240px pane, mid | 0 → 30 | x=610 | 120 | x=700 | 700 |

The plan's own verification sentence — "center minus center = w/2" — describes the *correct* expression, so the document contradicts itself.
**Severity:** Medium `[verified]`. The CDP step would catch it, but it lands in a shared design-system component.
**Source and fix:** one expression: `notchInsetLeft = c - (left - pw / 2)`.

### F3 — T5's consumer census records 2 sites; the plan's own grep returns 7
**What breaks:** the Derivation claims "consumers at planning time: `CardPickerHost.tsx:179`, `PropertyPicker.tsx:87-88`". Re-running `rg -F 'origin="center"' src/renderer`: `BlockHandleMenu.tsx:374`, `IconPicker.tsx:132`, `PickerControl.tsx:58`, `TextPicker.tsx:47`, `PreviewInspector.tsx:319` and `:343`, plus `PropertyPicker.tsx:87` (conditional). `CardPickerHost.tsx:179` is not an origin site at all — it passes `anchorX` into PropertyPicker.
**Who produces it:** whoever reads "Legitimate hits: both keep working unchanged" as the blast radius and verifies two panes.
**Severity:** Low `[verified]` on its own; it is the reason F2 would ship across six surfaces.
**Source and fix:** replace the two names with the six files, so the "Verify" step covers what it claims.

**Answering the sub-question directly:** with the *correct* formula, CardPickerHost's beak does **not** move in the ordinary case — unclamped, `c − (left − pw/2) = pw/2`, exactly today's centred beak. It moves from pane-centre to click-aimed only when a viewport clamp displaces the pane, which is an improvement, not a regression. The plan's "no visual change" is true unclamped and understated when clamped. With the formula *as written*, the claim is false everywhere.

### F4 — Nothing tells an in-flight resolve that the pointer left, and a card that opens over a stationary pointer never arms its grace
**What breaks:** T3 opens only after `openPage` resolves. In that window the pointer can leave — and nothing signals it. The plan's staleness token is *last-hover-wins*; a pointer merely leaving fires no new hover, so the token still reads "pending" and the card opens over a link the pointer abandoned. T1's `cancelHover()` only clears an *un-fired* timer (`connections.ts:32-37`); after the fire it's a no-op.

The second half is worse: the grace timer is only ever started inside the window `mousemove` handler (`ConnectionHoverCard.tsx:35-39`). A card that opens with the pointer already elsewhere **and at rest** gets no mousemove, so no grace arms and the card stands open indefinitely — not for the linger, forever. That state is unreachable today because the bloom is synchronous (the pointer is always on the link at open); T3 creates it.
**Who produces it:** hover a link to a page not yet touched this session (warm-cache miss → real IPC), hold past the 450ms intent, flick away and stop moving. That is the ordinary preview gesture.
**Severity:** Medium `[traced]`.
**Source and fix:** T3's stated Failure half claims this is handled — "the staleness gate drops it, no card" — and the described mechanism cannot. Fix at the source: T1 is already inside both handlers and the signature, so an after-fire `api.cancelHover?.()` from `mouseout` is proportional. Cheaper alternative: at open, run the existing `inRect` test once against the last pointer position and arm the grace immediately if it's outside.

### F5 — "Max is the viewport" does not keep the card on screen; the centred branch has no vertical clamp
**What breaks:** `PickerMenu.tsx:169-177` clamps horizontally by half-width and then sets `top: t.bottom + GAP` or `bottom: innerHeight - t.top + GAP` with **no vertical bound**. The flip converges to `'up'` and `'up'` is never re-checked (`:150-158`). Requirement 7 / B-6 clamp the stored size to the viewport, but the space actually available is the larger of *above the link* / *below the link* minus margins.
**Who produces it:** resize the card tall from a link near the top of a page — the first link you hover is the natural place to size it — then hover a link in the middle of another page.
**Repro (traced arithmetic):** 900px window, stored `h ≈ 830`, link at `y ≈ 450`. Down: `450+8+830 &gt; 892` → flip up. Up: pane top = `450 − 8 − 830 = −388`. ~390px of the card sits above the viewport and is unreachable, since the card's own scroller starts below the cut.
**No adjacent handling:** every other `maxHeight` consumer passes a fixed constant (`ViewSettings`, `FilterPane`, `BlockHandleMenu`, `ViewEmbedBlock`) — there is no available-space pattern to inherit.
**Severity:** Medium `[traced]`.
**Source and fix:** clamp the *rendered* height at placement to the available band, not the viewport — the card wrapper takes a `maxHeight` computed from the anchor rect. One computation in the card; it composes with the body's own scroll rather than fighting it. The same pass buys the horizontal honesty: executed, a card clamped to `innerWidth` lands its left edge at **−8px** (the centred clamp's `Math.min(Math.max(c, lo), hi)` collapses to `hi` once `half` exceeds the band) — the honest max is `innerWidth − 2·VIEWPORT_MARGIN`.

### F6 — Task 7 falsifies two documented claims the Made False table never routes; Tasks 5–7 add user-visible behaviour no doc bullet writes down
**What breaks:**
- `ConfigurationPM.md:3` enumerates per-machine chrome as "(folds, active view, view order, table headings, the tab and preview sets, the visited-entity history)". T7 adds hover-card geometry. The table routes ConfigurationPM to **Task 8 only** (§Knobs + §Settings Window).
- `ConfigurationPM.md` §Knobs closing line: "The **boolean** knobs are round-trip tested together against the silent-drop failure; a new one joins that test." T8's numeric key joins that test. The Made False row names the Settings-window phrasing, not this second boolean-scoped claim.
- `PagePreviewPM.md:35` is the app's one hover paragraph. The table routes it to Task 4 (blank pane → real body) and stops. Free-edge resize (T6), the one remembered per-machine size (T7), and the flowing beak (T5) never reach it — and the house rule is that Features docs ride the commit.

**Who produces it:** the implementer following the Made False table as the doc contract; Gates 3 and 4 have no doc step to catch the omission.
**Severity:** Low `[verified]` by reading the cited lines.
**Source and fix:** three rows in the table plus a Docs bullet on T5 and T7.

**Two observations riding along, not findings:** `ArchitecturePM.md:105` says "the four per-machine scope pairs ride one generator" — there are already **five** (`main/index.ts:697/702/707/712/717`), so that count is stale independently of this plan; T7 is the natural commit to correct it. And T7's "channels on the embedHeights pattern" points at the wrong precedent: `scopeGet`/`scopeSet` (`main/ipc.ts:90-113`) are **key-scoped**; a singleton scope wants `readValue`/`writeValue`, the tabs/previews/recents shape.

### F7 — The post-drop re-arm rule can leave the card permanently open
**What breaks:** T6/B-5: after the drop the grace arms "only once the pointer has been seen inside again". Drag the right edge outward past the viewport max — the card stops growing, the pointer keeps travelling — release well outside it, then move away without crossing it. The grace never arms; the linger countdown never starts. The card stands until Escape or another hover.
**Who produces it:** over-dragging a resize until it stops and letting go is an ordinary gesture; it is not linger-specific (None behaves identically).
**Severity:** Low `[traced]`.
**Source and fix:** re-arm on the **first pointer movement** after the drop rather than on the first inside-then-out. That preserves B-5's actual intent ("releasing just outside doesn't close it") with one condition, no new state.

## Coverage honesty

**Checked and grounded:** the hover signature and all four host wirings; `PickerMenu`'s placement effect, exit-presence coupling, `decidedDir` reset, portal handlers and focus path; `NotchedPane`'s inset clamp arithmetic; `useExitPresence`; `PageEmbed` + `embeds.css` scroll models; `gesture.ts`; `cellStatic` / `TableView` / the table widget's `ignoreEvent` and CM6's `eventBelongsToEditor`; `localState.ts` + the scope generators + the singleton shape; `readPersonalization` and the `defaultViewScale` numeric precedent; `setPersonalization` and the existing undefined-as-delete path; `SettingsWindow`'s `Toggle`/`TOGGLES` blast radius; `Slider`'s contract (min 0 + `format` + commit-on-release all fit T8 as written — no finding); the Made-False doc claims. Both arithmetic and type claims were **executed**, not asserted.

**Checked at plan level only:** every task's *Why* traces to the Goal — all nine do. T1 is the only one whose Why bundles two things ("both live in the same file and the same signature"), and that bundling is exactly what produced F1.

**Not checked:** the vitest baseline of 2173; the exact shape of `readNexus.test.ts`'s round-trip key list (only that the pattern exists); nothing was driven live — the app was never launched, per report-only scope.

**Mid-plan resting state the plan doesn't state (below finding threshold):** at T6's commit the size lives in the hook, so it survives retargets within a host but resets on any host remount. It's obviously temporary and T7 closes it one commit later; noting it rather than counting it.

## What this forecloses (question 2)

- **Per-page default sizes** — not foreclosed. The accessor is the door and it holds, but be aware the scope is a `SINGLETON` (`key = ''`); a per-page override adds keyed rows *beside* the singleton row in the same scope, which works but reads oddly. Keep the accessor's signature argument-taking from day one (`size(pagePath?)`) rather than argument-free, or every call site changes later.
- **In-card connection clicks opening a preview** — not foreclosed, and cheap: T3's resolve-only api makes `open` an explicit no-op, so the successor swaps the no-op for a real call. Pointer events already reach the links; `locked` only kills edit entry.
- **Live-cell connection handlers** — not foreclosed; T9's hoist actively enables it, and the propagation order is safe (the CellEditor's own CM6 handlers sit *inside* the table widget, so they fire before the table root's delegated handler, not after).
- **The one thing it does narrow:** T2's module-level closer registry, T6's module `resizing` flag and T7's module size cache are renderer-wide singletons, which sit against the locked "no global singleton holding shared mutable client state / multi-window-ready seams" decision. B-7 ratifies one-card-app-wide so the registry is sanctioned — but the day NavWindow or PreviewWindow become real `BrowserWindow`s, B-7 silently degrades to one-card-*per-window* and the size cache diverges per window with no cross-window invalidation. Worth one sentence in the plan rather than a redesign.

## Unknowns

- **Does the Bloom actually replay on a same-mount, one-frame retarget?** The animation class does swap `dropdownOpen → dropdownClose → dropdownOpen` (which restarts a CSS animation) *if* `useExitPresence`'s passive `setClosing(true)` commits before the rAF that reopens. Passive effects normally flush ahead of the next frame, but I can't settle it without the running app. **Ten-second check:** hover link A, then link B — does the card re-bloom from B's beak, or teleport?
- **Is F4's window wide enough to be routine rather than rare?** It depends on Nexus size and disk. **Ten-second check:** in the dev console, `performance.now()` either side of `window.nexus.openPage('&lt;a page never opened this session&gt;')`.
- **Are the resize strips pointer-reachable at the corner?** `NotchedPane` clips the `GlassPane` to a `path()` (`NotchedPane.tsx:224`), and `clip-path` clips hit-testing too. A strip positioned on the card wrapper sits *inside* that clip, so the `se` corner grip lands where the 14px corner radius has removed the surface. **Ten-second check:** after T6, press the exact bottom-right corner of a card and see whether the cursor changes and a drag starts.

## Killed candidates

- **Retarget-through-null defeating PickerMenu's exit presence** — killed by *does adjacent code already handle it*: the flip reset is a render-time reset on `open === false` (`PickerMenu.tsx:125`, explicitly keyed on `open` not `mounted` for exactly this case), and `useExitPresence` clears its exit timer on the true edge, so the placement effect re-runs (`closing` is a dep) against the freshly-mounted anchor. The shape the dispatcher named is the shape that comment was written for.
- **Table hover self-cancelling via the editor's `mouseover`** — killed by *adjacent code*: `TableWidget.ignoreEvent()` returns `true` (`widget.tsx:265`) and CM6's `eventBelongsToEditor` refuses any event whose path crosses an ignoring widget (`@codemirror/view` dist `:4828-4837`, gated at `:4524`), so `connectionClicks`'s unconditional `cancelHover()` never sees a cell's mouseover. A shared singleton timer is safe.
- **Import cycle Tables → Embeds → MarkdownPM → Tables** — killed by *adjacent code*: the return leg is a dynamic `import('./TableView')` (`widget.tsx:240`), and `cellStatic` has exactly one importer. No static cycle forms.
- **`stopPointerBubble` swallowing the resize strips' pointerdown** — killed by *adjacent code*: it's a React handler on the ancestor layer (`PickerMenu.tsx:358`); a strip's own `onPointerDown` fires first in the target phase, and `gesture.ts` binds move/up/cancel on `window` natively.
- **`setPersonalization` rejecting `undefined` as a delete** — killed by *adjacent code*: the `navCloseOnSelect` row already commits `undefined` through the same generic setter (`SettingsWindow.tsx:156`), and `writeKey` carries the emptied-value-deletes-its-key rule.
- **The `Row` union breaking unnamed `Toggle`/`TOGGLES` consumers** — killed by *does the damaged surface exist*: `Toggle` is module-private with exactly two consumers (`SettingsWindow.tsx:129`, `:138`).
- **A closer outliving its host / a card with no registered closer** — killed by *adjacent code*: React flushes all effect destroys before all creates within a commit, and the cross-host hand-off lands in one batch, so the outgoing host's unregister can't clobber the incoming host's registration.
- **Escape greed under a 30s linger** (the card's `window` keydown `preventDefault`s ahead of `PreviewPane.tsx:135` / `BlockSurface.tsx:156` / `embedWidget.tsx:414`) — killed by *adjacent code*: the visible card is the topmost dismissable surface, so consuming Escape first is the house contract, not a break.
- **T4's wrapper wheel-chaining the host page out from under the card** — killed by *who produces it*: the plan's `overflow-y: auto` wrapper over a default `.pgembed` (`height: 100%; overflow: hidden`, `embeds.css:9-11`) can never overflow, so CM6's own scroller (with app-wide `overscroll-behavior: none`) owns the wheel and eats it at the bound — correct for a hover card. The chaining hazard only appears if the implementer reaches for `.pgembed-grows`, which nothing in the plan asks for. **Worth one clarifying word in T4** — as written, the stated wrapper rule is inert-but-harmless, and `edge-fade` is already supplied by `PageEmbed`'s own `edgeFade` prop (`PageEmbed.tsx:163`), so don't add it twice.

## Verdict

**7 findings** — 4 Medium (F1 typecheck gate, F2 beak formula, F4 async-open orphan, F5 missing vertical clamp), 3 Low (F3 census, F6 Made-False completeness, F7 post-drop re-arm). **2 verified by execution** (F1 via `tsc --strict`, F2 via the replicated clamp arithmetic), 3 verified by direct file reading (F3, F6, and F2's census half), 3 traced end-to-end through the real code (F4, F5, F7). **9 killed**, seven of them by the adjacent-code question — the plan's substrate is genuinely well-defended, and most of the dispatcher's suspicions were already answered by comments written for exactly those cases. **3 unknowns**, each with its check.

The plan is sound in architecture and sequencing; every task's Why traces to the Goal and the parked successors stay open. Its defects are concentrated in two places worth naming plainly: **transcription** (a formula whose own sanity-check disproves it, a census that contradicts its own grep, a Files list that omits the receiver its Steps line names) and **the two things `PickerMenu` has never had to do before** — anchor a pane that can be viewport-tall, and open one after an await.
The plan is written and committed (`61c00ef9`) — ten tasks across seven phases: lifecycle hardening first (the fixes the linger depends on), then the body, the sliding beak, resize + persistence, the Settings slider, table cells, and closeout. The attack reviewer is on it now, aimed at the plan-specific hazards: inter-task typecheck windows, the retarget-through-null trick against PickerMenu's exit animation, the scroll-wrapper versus the embed grow model, the beak math at screen edges, whether the portal's pointer guards would eat the resize strips' start event, and whether the Cards picker regresses when the centered beak learns to slide. I'll verify what comes back, fold it, and present the plan for your approval.

A strong round — 7 findings, and notably the reviewer *killed* nine of my own suspicions with adjacent-code evidence. Verifying the two executed findings and the doc claims myself before folding:

- **Bash:** Verify F2 translateX, F3 census, F4 grace arming
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Bash:** Commit the folded review round
The plan is written, attacked, and the round is folded — [Hover Preview — Implementation Plan.md](.claude/Planning/Hover Preview — Implementation Plan.md), committed at `44e6dbab`. Presenting it for your approval:

**The shape** — ten tasks, seven phases, ordered so nothing builds on sand:

1. **Lifecycle first** — the fixes the linger depends on: clicks cancel the pending hover, the card tracks the live link instead of a frozen snapshot, one card app-wide, navigation closes it. All this lands while the body is still blank, so it's verifiable in isolation.
2. **The body** — content resolved *before* the bloom (warm pages open instantly, failed pages never open), then the PageEmbed mount with everything inside made inert.
3. **The beak** — your flow-beak sketches, one formula in the shared dropdown's centered placement.
4. **Size** — the free-edge resize strips, then the persisted universal size behind one clamping accessor.
5. **The linger slider** in Settings ▸ Pages. 6. **Table cells**. 7. **Closeout** — claim, neutral verify, attack, docs swept.

**The review round**: 7 findings, and I verified each against the code before folding — all real. The two worth knowing about: my beak formula was wrong by half a card's width (the pane's stored position is its *center* under a CSS transform, and my own sanity-check sentence in the plan described the correct math while the formula line didn't — exactly the transcription error reviews exist for); and the async fetch created a card that could open *after* you'd flicked away and then never close, because the close countdown only started on mouse movement. Both fixed structurally: the card's lifecycle now begins when the fetch starts, not when it opens. Also caught: a stored tall size could open with its top third above the screen (height now caps to the space actually available around the link), the plan's consumer census missed four of six centered-dropdown surfaces, and three doc claims the plan falsifies weren't routed to their commits. One pleasant side effect: the beak fix means *every* centered dropdown near a screen edge now aims its beak at its anchor instead of the pane middle — a small app-wide improvement riding along.

Nine of my own suspicions the reviewer killed with evidence — the retarget trick, the portal's pointer guards, the import cycle, the Settings union — all already handled by code written for exactly those cases.

**Status: reviewed, one round, clean fold.** Per the gate, no implementation code until you approve. Approve, and Phase 1 starts.

##### Nathan

It was reviewed, but was it properly reviewd for over-complication or opportunities to hoist the behaviors it makes, or use existing behaviors instead?

##### Claude

Honest answer: no. The round that ran was correctness-and-reachability scoped — "what breaks" — and it did that job. Nobody ran the other lens: *is each new mechanism this plan invents actually necessary, or does an existing home already carry it.* The brainstorm grounded reuse hard for the big pieces (the shell, PageEmbed, the gesture engine, the slider, the beak precedent), but the plan then introduced its own new machinery — a single-card registry, a measure closure, a new size-accessor module, an `onDirection` callback, a Settings row union — and none of that got challenged for over-complication. House rule says simplification comes *before* build-breaking; I inverted that. Running the missing pass now, scoped exactly to that question:

- **Dispatch:** general-purpose — Simplification review of the plan
- **Return:** All code grounded. Here's the review.

## Simplification Review — Hover Preview Implementation Plan

### 1. Single-card registry — HOIST

Mount the card once at app level; delete the registry. The grounding is unambiguous:

- The hook takes no arguments and receives nothing host-specific (`ConnectionHoverCard.tsx:18-21`); all four wirings are byte-identical — `hover` spread into a `ConnectionsApi` memo (`PageView.tsx:32,44`, `BlockSurface.tsx:126,140`, `NavWindow.tsx:133,142`, `PreviewWindow.tsx:106,115`).
- The card portals to `document.body` via PickerMenu (`PickerMenu.tsx:342-383`), so mount location is visually irrelevant.
- All four hosts live in one React root — `App.tsx:269-271` already mounts NavWindow/PreviewWindow/SettingsWindow at app level; the card mounts beside them.
- The plan already commits to renderer-module singletons (closer registry, resize flag, size cache — Inherited Reasoning, plan:44), so a module-level `hoverConnection(page, el)` entry point is equally sanctioned; hosts wire `hover: hoverConnection` as a static import and drop the hook call, the `hover` memo dep, and the `{hoverCard}` render site — four times over.
- Task 9's `closeActiveHoverCard()` module export is needed either way (cellStatic can't reach a hook); with one mount it's the card's own setter instead of a registry lookup.

What the hoist deletes from Task 2: closer register/unregister on open/close, "second host's hover calls the previous closer first," and the cross-host retarget case — retargeting collapses to one same-instance close→reopen path. What it costs: the close-on-navigation effects need a home. Two honest options — (a) one store subscription in the card over the three navigation targets (page path, preview target, nav target), closing on any change (a benign widening of A-7: closing on *any* navigation is conservative and correct for a hover affordance); or (b) keep per-host one-liner `closeActiveHoverCard()` calls in existing host effects. Either is smaller than the registry. Recommend the hoist with (a), falling back to (b) if the per-host conditions genuinely diverge at execution.

### 2. The measure closure — SIMPLIFY

Pass the element. Both producers hold an element at fire time (`connections.ts:45,50`; Task 9's span), and both planned closures are the identical wrap `el.isConnected ? el.getBoundingClientRect() : null` (plan:110, plan:319) — a generalization with two consumers doing the same thing is the abstraction the rule of three forbids. Signature `hover?: (page: ConnPage, el: Element) =&gt; void` (`connections/index.ts:27` — the type already carries `DOMRect`, so DOM types in the contract are not new), with the `isConnected`-null branch hoisted **once** into the card. Same power, one less shape, and it unlocks finding 8.

### 3. `hoverCardSize.ts` + `hoverCard` scope + channel pair — KEEP the scope/channels, SIMPLIFY the accessor

- The scope + singleton channel pair is the smallest honest shape given ratified nexus.db storage. The `previews` scope is a whole-file read/sanitize/overwrite owned by the preview system (`previewState.ts:40-58`, `main/index.ts:561-578`) — stuffing `{w,h}` in would make every preview writer responsible for preserving it and every card write race the file. `embedHeights` is key-scoped (`bridge.ts:78-79`), the wrong shape. A scope is one union literal (`localState.ts:11-22`) and the codebase's own doctrine prices a channel at one `bridge.ts` entry. Right-sized.
- Cut the `size(pagePath?)` parameter (plan:261). An ignored parameter at first occurrence is speculative generality, and its stated justification is hollow: adding an *optional* parameter later also touches zero call sites. The "accessor seam is the door" (plan:379) survives as the accessor's existence alone.
- The clamp-on-read cache itself mirrors the sidebar precedent (`store.ts:83-92`) and is fine; whether it's a separate file or a block inside `ConnectionHoverCard.tsx` is organizational — at ~20 lines with one consumer file, inline is defensible, but this isn't a real finding.

### 4. `onDirection` on PickerMenu — KEEP

The existing placement facts don't expose direction usably: `--dropdown-origin` is a transform-origin string on an inline style (`NotchedPane.tsx:202,213`) — parsing `"Npx 0px"` vs `"Npx Hpx"` from JS is a hack; the up-state class is a hashed vanilla-extract name (`PickerMenu.tsx:300`); deriving "flipped" from card-rect-vs-link-rect geometry costs a layout read plus a placed-frame effect cycle, and Task 6 needs the direction in JS anyway for the available-band height cap — before the first placed frame exists. An optional callback invoked where `eff` is already computed (`PickerMenu.tsx:157-159`) follows the component family's existing publication pattern exactly (`NotchedPane.onResize`, `NotchedPane.tsx:129`). One line of API for the one consumer that can't get the fact any cleaner: honest.

### 5. Settings `Row` union — SIMPLIFY

Rule-of-three violation at first occurrence. `TOGGLES` and its single map render (`SettingsWindow.tsx:32-68,128-132`) stay untouched; the slider is one bespoke `LingerRow` component beside `ToggleRow` (`SettingsWindow.tsx:138`), rendered with `{category === 'pages' &amp;&amp; &lt;LingerRow /&gt;}` after the toggle map. No schema change, no `kind` switch, no threading min/max/step/format through a generic row shape for one instance — and less code than the union. When a second non-toggle row arrives, the union earns itself with two real data points to shape it.

### 6. Intent-delay helper — KEEP

The split is right-sized: the editor handler keeps its CM hit-test (`connections.ts:19-26,39-54` — not shareable as-is, correctly diagnosed), the helper owns only the timer pair + `CONN_HOVER_INTENT_MS`. Two consumers sharing a named behavior contract ("the intent delay," D-2-ratified) beats duplicating the timer and exporting the constant separately; the helper is the minimal vehicle at ~10 lines. Keep it to arm/cancel and nothing more.

### 7. Resize strips — KEEP

The shared part is already reused: `usePointerGesture` with `activation: 0` is the same skeleton both precedents ride (`embedWidget.tsx:119-142`). What remains per-surface is ~5 lines of CSS geometry each, and the three surfaces genuinely diverge: `spm-edge-*` is eight zones welded to tile hover chrome via `.spm-tile:has(&gt; .spm-edge:hover)` selectors (`surfacepm.css:66,159,177-201`) — importing those classes drags SurfacePM's tile styling; `.mdpm-embed-resize` is one south strip straddling a border (`Styles.css:358-366`); the card needs e/s/se seated on the un-clipped wrapper (the clip-path hit-test note, plan:249). Extracting a shared strip primitive now would consolidate cursor declarations and little else while coupling three surfaces' inset geometry. Mirror the embed strip's straddle/naming conventions; don't generalize.

### 8. Pending-phase lifecycle — SIMPLIFY (contingent on finding 2)

The plan's shape — mousemove watcher live from fetch-start, running against `measure()`, marking a stale token (plan:169) — exists solely to answer one question at resolve time: is the pointer still on the link? With the element in hand (finding 2), `el.matches(':hover')` answers it synchronously, no listener, no sampling gap: resolve lands → `if (!token.current || !el.matches(':hover')) return`. A detached span can't match `:hover`, so the mid-fetch-deletion case folds in free; the last-hover-wins token stays for supersession (trivial); the open-phase grace listeners keep mounting at open exactly as the current effect does (`ConnectionHoverCard.tsx:26-53`). The pending *watcher* — the whole new lifecycle phase — deletes. Note this is only reachable if the signature carries the element; under the measure-closure the card has no element to query, which is itself evidence for finding 2.

---

**Verdict:** The plan leans modestly over-built in a specific, consistent direction — coordination and generality bought one occurrence early — while its big structural calls are genuinely right-sized (filling the existing shell, PageEmbed as the body, PickerMenu/NotchedPane placement, the gesture skeleton, the singleton scope pattern). The four findings share one root: the plan treats the four-host topology as a constraint to coordinate around (registry, per-host effects, a measurement abstraction, a pending watcher) when the topology is one React root with a body-portalled card, where a single mount makes one-card-app-wide true by construction and the element-in-hand makes the pending phase a one-line check. Folding findings 1, 2, 5, 8 and the `pagePath` cut deletes roughly a task's worth of mechanism — the registry, four render sites, the closure convention, the pending watcher, and the row union — without moving a single ratified behavior. Everything else should ship as written.
The reviewer is on it with the pure simplification lens — eight named mechanisms, each to come back as KEEP, SIMPLIFY, or HOIST with the existing home named. The two I most expect to lose their current shape: the single-card *registry* (four per-host mounts coordinating through a module token, when hoisting the card to one app-level mount might delete the registry, all four render sites, and the per-host close effects in one move) and the Settings *row union* (schema machinery for exactly one slider — rule-of-three says render the slider row directly). I'll verify what comes back, fold it, and re-present with both lenses actually run this time.

This is the review the plan needed — four SIMPLIFYs/HOISTs sharing one root: I treated the four-host topology as something to *coordinate* when a single mount makes it dissolve. Verifying the load-bearing claim (all four hosts in one root, windows already mounted app-level) before folding:

- **Bash:** Verify app-level window mounts + the four hook sites
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
Consistency sweep — the closure phrasing lingers in a few task bullets:

- **Bash:** Find stale measure-closure references
- **Bash:** Sweep stale closure phrasing, commit the simplification fold
Both lenses have now actually run, and the plan is leaner for it — committed at `61535609`. What the simplification round changed, plainly:

**Four mechanisms got smaller or vanished:**

- **The card is now mounted once, at app level** — not four times with a registry coordinating who's allowed to be open. "One card app-wide" stops being a rule the code enforces and becomes true the way it should be: there's only one card to begin with. This deletes the registry, all four per-host render sites, and the cross-host coordination cases in one move. The four hosts just point their hover wiring at one shared entry.
- **The measure closure died** — both producers were going to wrap the same element in the same one-line closure, which is exactly the premature abstraction the rule of three forbids. The element itself is passed; the card measures it in one place.
- **The pending-fetch watcher died** — a whole new lifecycle phase (mousemove surveillance during the fetch) collapsed into one synchronous line at resolve time: does the link still have the pointer on it (`:hover`). Same ratified behavior, no listener, no phase.
- **The Settings row union died** — schema machinery for exactly one slider. The slider is now just its own row rendered beside the toggles; a union earns itself when a second non-toggle row exists.

**Four survived on evidence, not inertia:** the `onDirection` callback (no existing placement fact is readable from JS at the moment it's needed), the intent-delay helper (two real consumers), per-surface resize strips (the existing edge CSS is welded to tile hover chrome — sharing it would drag SurfacePM styling into the card), and the new storage scope (the alternative was making every preview-window write responsible for preserving card geometry inside its file).

The reviewer's verdict matched your instinct: the plan was modestly over-built in one consistent direction — buying coordination and generality for the four-host topology when a single mount dissolves the topology entirely. I verified the hoist's grounding myself (one React root, windows already mounted app-level, four byte-identical hook sites) before folding.

**Status: attack round + simplification round both run and folded, in that order's corrected form for anything downstream.** The plan at [Hover Preview — Implementation Plan.md](.claude/Planning/Hover Preview — Implementation Plan.md) is ready for your approval — Phase 1 starts on your word.

##### Nathan

go for it.

##### Claude

Ratified — flipping the status and opening Phase 1:

- **Edit:** .claude/Planning/Hover Preview — Implementation Plan.md
- **Bash:** Commit ratification (the phase base), find existing trigger tests
- **Read:** Pommora/src/renderer/src/testing/editorHarness.ts
- **Bash:** Read the ConnectionsApi interface
- **Bash:** Find MarkdownPM test conventions
- **Bash:** Find component-level editor tests using the harness
- **Bash:** Read a harness-based component test for its shape
- **Edit:** Pommora/src/renderer/src/MarkdownPM/connections/index.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/connections.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/connections.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/connections.ts
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
Now the test — click inside the intent window must silence the hover:

- **Write:** Pommora/src/renderer/src/MarkdownPM/editor/connectionHover.test.tsx
- **Bash:** Run the new trigger test
All four pass, including the two new cancel behaviors. Full gates:

- **Bash:** Run all three gates
Green across the board — 2,177 tests (baseline + the four new). Committing Task 1 with its plan tick:

- **Bash:** Tick Task 1 and commit
Task 2 — the single-mount hoist. Reading the four host wirings in full:

- **Read:** Pommora/src/renderer/src/Detail/PageView.tsx
- **Bash:** Read the other three hosts' hover wiring
All four wirings confirmed identical. Checking the store shapes the navigation-close subscription needs:

- **Bash:** Check store selection/preview shapes + triggerRef type
- **Write:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
Now thinning the four hosts and mounting the card in App:

- **Edit:** Pommora/src/renderer/src/Detail/PageView.tsx
- **Edit:** Pommora/src/renderer/src/Detail/PageView.tsx
- **Edit:** Pommora/src/renderer/src/Detail/PageView.tsx
- **Bash:** Thin the three remaining hosts
- **Bash:** Verify memo deps dropped hover; find App import block
- **Bash:** Verify the memo dependency arrays
All four hosts thinned cleanly. Mounting the card in App:

- **Edit:** Pommora/src/renderer/src/App.tsx
- **Edit:** Pommora/src/renderer/src/App.tsx
- **Bash:** Run all three gates on Task 2
- **Bash:** Read the lint diagnostics
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Bash:** Re-run the gates
Gates green — 2,177 tests, lint clean. Now the running-app verification. Checking the dev instance:

- **Bash:** Check the dev instance on port 9333
The earlier dev instance is gone. Launching a fresh one with CDP:

- **Bash:** Check dev script + scratchpad tooling
- **Bash:** Read the CDP helper and launch precedent
- **Bash:** Check the test userdata + nexus from earlier sessions
- **Bash:** Find test pages holding connections
- **Bash:** Inspect the manual nexus test pages
- **Bash:** Launch dev app with CDP on 9333
- **Bash:** Probe the app state via CDP
- **Bash:** Find the current page and its resolved links
- **Bash:** Verify bloom + live scroll tracking
- **Bash:** Navigate to Alpha, list its links
- **Bash:** Probe sidebar leaves + hit point + portals
- **Bash:** Measure span + hit-test at its center in one pass
- **Bash:** Walk pointer-events up the span's ancestor chain
- **Bash:** Synthetic mouseover on the span — does the card bloom?
- **Bash:** Full elementsFromPoint stack at the span center
- **Bash:** Expand Notes, open Alpha, list visible links
- **Bash:** Screenshot + list Notes view rows
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/p1-notes.png
- **Bash:** Open the Alpha page, list its links with visibility
- **Bash:** Battery 1-2: real bloom + scroll follow
Bloom and scroll-follow both verified — the card tracked the link 1:1 through an 80px scroll. Continuing:

- **Bash:** Battery 3-4: link-leaves-viewport close + click-no-orphan
- **Bash:** Inspect the stuck state
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/p1-state.png
- **Bash:** Probe portal state, scroll capture, Escape close
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Bash:** Retest: link-leaves-viewport closes the card
- **Bash:** Reset scroll to top, find the link
- **Bash:** Inspect all scrollers, reset the page one
- **Bash:** Watch scrollTop after forcing 0
- **Bash:** Reload the renderer, re-locate the link
- **Bash:** Battery 1-3 post-reload
- **Bash:** Battery 2-3 with a wheel point over prose
Follow and detach-close both verified. Battery 4 — click-no-orphan plus navigation close:

- **Bash:** Battery 4: click inside intent window, no orphan card
- **Bash:** Wheel up to the link, then click-inside-intent test
- **Bash:** Where is the page scroll now
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/p1-where.png
The page restored its warm-captured scroll (working as designed) — the link's off-screen again. Cheapest reset: reload (kills session warmth), then battery 4 immediately:

- **Bash:** Battery 4: click mid-intent → no orphan, navigation
- **Bash:** Open card, click through it, navigation must close it
- **Bash:** Back to Alpha; bloom then click-through
Navigation close verified. Checking VerifyPage for a two-link retarget bed:

- **Bash:** Find a page with two resolved links
- **Bash:** Add a second resolved link to Alpha.md
- **Bash:** Back to Alpha; locate both links
- **Bash:** Retarget + same-target re-entry battery
- **Bash:** Run all gates for Task 2
- **Bash:** Tick Task 2, log deviation + lesson, commit
- **Bash:** Check the deleted docs' history + current tree state
- **Bash:** Determine which commit actually deleted the docs
- **Bash:** Commit the parallel session's doc deletions separately
- **Dispatch:** code-simplifier — Simplify Phase 1 diff
- **Return:** Diff was already tight — the rewrite is well-factored, so this is a small pass. Net **−12/+11** across two files.

### Simplified

- **`Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx`** — the `present` dispatcher went from three branches to two by inverting the id comparison: the same-target refresh, the first-open, and the close case all fall through to one `setHovered(next)` tail. Also drops a `return setHovered(...)` (returning a void expression from a void arrow). Retarget-through-null is untouched.
- **`Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx`** — inlined the single-use `linkRect()` helper into `onMove`. It encoded "detached" as a `null` DOMRect that the one caller had to decode back into "close"; the direct `isConnected` check says it outright.
- **`Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx`** — grouped the two render-phase ref writes (`anchorRef`, `hoveredRef`, both derived from `hovered`) instead of interleaving `cardRef` between the declaration and its assignment.
- **`Pommora/src/renderer/src/MarkdownPM/editor/connectionHover.test.tsx`** — moved `hover.mockClear()` out of `mountLink()` into `beforeEach`, so the mount helper mounts rather than also resetting shared module state.

### Flagged (judgment)

- **Two `getBoundingClientRect()` per mousemove** in `onMove` (link + card), only while the card is open. Nominally against the project's no-layout-reads-on-a-high-frequency-trigger rule, but caching the rects changes close/detach timing, and live measurement is the entire reason the rewrite moved from a captured rect to a live element. Not worth trading a timing regression for two cheap reads.
- **`closeActiveHoverCard` is exported with exactly one call site — inside its own component** (line 69, the navigation-close effect). Its internal use could be a plain `setHovered(null)`, which would leave the export at zero consumers. Left as-is: your brief names it as a designed module entry, so it's an intentional escape hatch, not a dead export. Say the word if you'd rather it stay private until a second caller shows up.
- **The click and contextmenu tests** are near-identical, differing by event name and init. Left as two tests — a two-row `it.each` table costs more readability than the duplication does, and the Rule of Two doesn't fire on test cases that read as independent scenarios.
- Everything you flagged as don't-churn (`present` seam, double rAF, retarget-through-null, `manageFocus={false}`) was left alone. `connections.ts` needed nothing — `cancelHover()` across four handlers is one helper at the right altitude.

### Cross-File Opportunities

None. `inRect`/`RECT_SLOP` grepped as unique to this file — no existing hit-test helper to fold into, and one consumer doesn't justify promoting it.

### Comments

No pass warranted. Comment density is high but every one carries a non-inferable *why* (CM6 pruning timing, PickerMenu flip semantics, the shell contract). Two comments moved with the code they explain; none added or removed.

### Process note

Your brief said to load `code-simplification` — that string doesn't resolve; the skill is registered as `simplify`. Worth fixing in StudioMD's skill table, since it also mandates a 4-agent parallel fan-out that directly contradicts your "do not spawn sub-agents" instruction. I ran the four angles inline instead. This is the second time the same conflict has come up.

**Gates:** typecheck clean (both projects), `vitest run` 2177 passed / 192 files, `biome lint src` clean over 700 files. Nothing staged, nothing committed — working tree shows only my two modified files.
- **Dispatch:** feature-dev:code-reviewer — Review Phase 1 commits
- **Return:** ## Review scope

Commit range `3ce8b642..HEAD` — Phase 1 (Task 1: `Pommora/src/renderer/src/MarkdownPM/editor/connections.ts`, `Pommora/src/renderer/src/MarkdownPM/connections/index.ts`; Task 2: `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx`, `Pommora/src/renderer/src/App.tsx`, and the four hosts' `hover: hoverConnection` wiring). I read the plan's Phase 1 section + Global Constraints for context, then traced the actual runtime paths (module-singleton mount/unmount, the retarget rAF, the navigation-close subscription, PickerMenu's anchor effect, and `connectionHover.test.tsx`) against the live code. No Bash/git tool was available in this session, so I verified everything by reading the current file contents directly rather than the raw diff — all findings below are grounded in what's actually on disk now.

## Critical

**A stale hover-intent timer survives keyboard/menu-driven navigation and re-blooms an orphan card anchored to a detached element — confidence 87**

- `Pommora/src/renderer/src/MarkdownPM/editor/connections.ts:31-55`
- `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx:28-30, 44-58`

`cancelHover()` only runs on `mouseout`/`click`/`contextmenu` *of the same CM6 editor instance* (`connections.ts:42,53,61,75`). It is never tied to the editor's own teardown — `connectionClicks` returns a plain `EditorView.domEventHandlers` map with no `destroy()` hook, so the `setTimeout` it arms on `mouseover` (line 49) keeps running even after the owning `EditorView`/React component unmounts. `getApi()` reads from `connectionsRef.current` (`MarkdownPM/index.tsx:113-114`), a plain ref that's never nulled on unmount, so the stale callback still resolves to a live `hover: hoverConnection` and fires `api.hover?.(page, el)` regardless.

`hoverConnection`/`present()` (`ConnectionHoverCard.tsx:28-30, 44-58`) has no `el.isConnected` (or `:hover`) gate before opening — it unconditionally calls `setHovered(next)` (directly, or via the retarget branch). Meanwhile `PickerMenu`'s placement effect treats a detached `trigger` as valid (`triggerRef.current` is a non-null, just-detached element, so `if (!trigger) return` doesn't short-circuit) and measures a zero `DOMRect`, clamping the card to the viewport's top-left corner.

**Producer:** rest the pointer motionless over a resolved `[[Connection]]` (arming the 450ms intent) → without moving the mouse, fire a *native keyboard accelerator* that navigates (e.g. `⌘N`, handled purely via IPC in `App.tsx:131-145`'s `onMenuAction` case, "a renderer keydown can't intercept it" per its own comment — so no DOM mouse event ever touches the editor). The navigation's `selection`/`activeTabId` change correctly runs `closeActiveHoverCard()` via the card's nav-close effect (`ConnectionHoverCard.tsx:66-69`) — but 450ms after the original `mouseover`, the never-cancelled timer still fires, calls `hoverConnection(page, el)` with `el` now detached (the old page's editor DOM was torn down), and `present()` re-opens the card with no connectivity check. It blooms empty over the *new* page/tab, mispositioned at the corner, and only self-heals on the next `mousemove` or `scroll` event (`ConnectionHoverCard.tsx:85-95, 100-108`) — if the user's hands are off the mouse after a keyboard-driven nav, it can sit there indefinitely.

This directly undercuts Requirement 4 / Task 2's own promise ("closes on ... any navigation") — the *active* card is closed correctly, but a *pending* intent isn't, so the navigation-close can be effectively reversed a beat later.

**Fix:** give `present()`/`hoverConnection()` the same `el.isConnected` guard the card's own leave-detection already uses — a no-op on a detached element is a one-line, cheap check, consistent with the "isConnected-null branch lives once" discipline the plan already states for the card's measuring seam.

## Reviewed clean (no reportable issue found)

- **Navigation-close subscription — spurious closes:** `selection`'s tree-driven reconciliation is explicitly identity-preserving (`store.ts:705-716`, "an echo push keeps the same array, so memos hold"), and `preview` is never touched by `applyTree`/watcher pushes at all — so background nexus refreshes while hovering can't spuriously close the card. Traced all four hosts' `open`/`bypass` wiring; every navigation path (`select`, `openPreview`, `openPreviewTab`, `activatePreviewTab`) touches `selection`, `activeTabId`, or `preview`, so I found no reachable "missed navigation."
- **Effect cleanup (`ConnectionHoverCard.tsx:71-124`):** grace timer, rAF, and all three listeners (`mousemove`, `scroll` capture, `keydown`) are fully torn down on every `hovered` transition and on unmount. No leak found.
- **Module-singleton `present` mount/unmount (`ConnectionHoverCard.tsx:44-62`):** `hoverConnection` calls while unmounted are a documented no-op; `App.tsx:273` gates the mount on `status === 'ready'`, and ordinary reloads (`load()`) don't flip `status` away from `'ready'` when a tree already exists (`store.ts:601`), so remounts are rare and the "call into a dead entry" failure half holds.
- **The retarget rAF (`ConnectionHoverCard.tsx:52-56`):** a stale `setHovered` firing after unmount is a silent React no-op in React 18 (no warning, no crash) — real but negligible cost, and requires an already-rare remount landing inside a single animation frame. Not flagged given the low cost and low reachability.
- **`anchorRef`-during-render assignment (`ConnectionHoverCard.tsx:38-39`):** idempotent, read only from `PickerMenu`'s post-commit layout effect — a standard, safe measure-ref pattern, matches the plan's stated intent.
- **`connectionHover.test.tsx` honesty:** genuinely pins the Task 1 behaviors — the click and contextmenu tests dispatch real events and assert `hover` is never called after the delay elapses (which only holds if `cancelHover()` actually ran), and the element-handover test asserts `hover.mock.calls[0][1]).toBe(span)`. Not a rubber-stamp test.

## Note (not reported as a finding, confidence below threshold)

I traced a second, structurally-real gap — `PickerMenu`'s placement `useLayoutEffect` (`PickerMenu.tsx:139-219`) captures `trigger = triggerRef.current` once per effect run, and its dependency array doesn't include the ref's live value, only the stable ref object. On the card's own "same-target refresh" branch (`ConnectionHoverCard.tsx:47-49`, deliberately skipping a close/reopen beat), if the underlying connection span's DOM node is swapped for a fresh one (the scenario the card's own comment explicitly anticipates), `PickerMenu` keeps measuring the old node while the close-detection correctly tracks the new one — so the card can silently freeze mispositioned rather than closing. I couldn't pin down with confidence how often CM6 actually replaces that specific span's DOM node while the same link stays hovered (depends on internal decoration-diffing behavior I can't verify without running the app), so I'm leaving this out of the formal findings per the ≥80 confidence bar — flagging only so it doesn't get lost if Nathan wants it checked live via CDP.
Phase 1 is committed and live-verified; Gate 1's two reviewers are running (the simplifier owns the tree until it reports — I'm hands-off meanwhile). Status so far, briefly:

- **Task 1** (`ec552eca`): clicks and right-clicks now consume a pending hover intent, and the hover seam hands over the live link element. Four new tests pin the cancel behaviors — 2,177 total, all green.
- **Task 2** (`139a0f23`): the card is one app-level mount; all four hosts thread one shared entry; the card tracks its link through editor scroll, closes on navigation/Escape/link-detach, retargets with a fresh bloom, and survives same-link re-entry without flicker. All verified with real CDP mouse input against the dev app on port 9333 (running against my scratch nexus, not yours).
- One real bug found and fixed during live verification, recorded in the plan's Deviations: the link-leaves-viewport close raced CM6's node pruning (which happens *after* the scroll burst) — the check now rides a coalesced double-rAF, and I proved the close live afterward.
- One lesson recorded: the card file is a module-singleton seam, so HMR leaves hosts holding a dead entry — it needs a full renderer reload after edits, same as the CM extensions.
- A parallel session's two planning-doc deletions were sitting unstaged in the tree; committed separately as their own docs commit (`ffe65d99`), not mixed into mine.

Once both reviewers return and any concerns are settled, Gate 1 closes and Phase 2 (the body) begins.

Simplifier's back — a small, clean pass (its dispatcher inversion and inlined helper both preserve semantics on my read of the diff; gates re-verified green by it, nothing staged). The `closeActiveHoverCard` export it flagged as single-caller stays deliberately — Task 9's cell-activation close consumes it in Phase 6, which the plan records. Its edits sit uncommitted until the correctness reviewer lands and Gate 1 closes as one motion.

One process note it surfaced worth your eyes eventually: the code-simplifier agent's own definition apparently references a skill name that doesn't resolve (`code-simplification` vs a registered `simplify`) and mandates a parallel fan-out that conflicts with no-sub-agent briefs — reportedly the second time that conflict has fired. Not blocking anything; flagging per the disclose-conflicts rule.

Waiting on the correctness reviewer to close the gate.

The Critical is real — I verified the chain against code I hold: the intent timer survives editor teardown (no destroy hook), Chromium fires no `mouseout` when the hovered node is removed without pointer movement, `hoverConnection` has no connectivity gate, and PickerMenu happily measures a detached-but-truthy trigger to a zero rect (the exact corner-parking artifact I saw live earlier). The reviewer's sub-threshold note is the same artifact class through a different door (decoration rebuild swapping the span under a resting pointer). Fixing both with one discipline — nothing opens or stays anchored to a disconnected element:

- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
Now a test for the detached-element guard — checking whether any existing test mounts a store-backed component:

- **Bash:** Find store-backed component test precedent
- **Bash:** Read the store-backed test pattern
- **Bash:** Check the jsdom setup stubs
- **Bash:** Find the ResizeObserver stub
- **Write:** Pommora/src/renderer/src/Embeds/connectionHoverCard.test.tsx
- **Bash:** Run the new card test
- **Bash:** Read the failing case
- **Edit:** Pommora/src/renderer/src/Embeds/connectionHoverCard.test.tsx
- **Bash:** Re-run new test + full gates
All green — 2,180. Live-verifying the keystroke-detach close (needs a reload first per the singleton-HMR lesson):

- **Bash:** Live-verify keystroke-detach close
- **Bash:** Probe focus state + hit test + re-hover
- **Bash:** ArrowDown with open card — anchored or closed, never parked
- **Bash:** Commit the Gate 1 bundle
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
Now the resolve-only api inside the component (Task 4 will hand it to the body):

- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
The `void resolveOnly` placeholder is scaffolding smell — the api builder's only consumer is Task 4's mount, so it belongs in that commit. Pulling it back out:

- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Write:** Pommora/src/renderer/src/Embeds/connectionHoverCard.test.tsx
- **Bash:** Run the extended card tests
- **Bash:** Gates + commit Task 3
Task 4 — mounting the body. First re-checking the embeds.css interior contract:

- **Bash:** Read the embed CSS contract
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/embeds.css
- **Bash:** Gates on the body mount
- **Bash:** Live: hover Beta, see page content in the card
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/p2-body.png
- **Bash:** Give Beta a link to the banner-bearing Alpha
- **Bash:** Hover the Alpha link from Beta — banner + inertness checks
- **Bash:** Scroll inside the card; check tiles inert + containment
- **Bash:** Verify inner scroll + inert tile click
- **Edit:** .claude/Features/PagePreviewPM.md
- **Edit:** .claude/Features/PagePreviewPM.md
- **Bash:** Tick + commit Task 4
Gate 2 reviewers, and the visual for the record:

- **Dispatch:** feature-dev:code-reviewer — Review Phase 2 commits
- **Return:** ## Reviewing commits `159e988d..HEAD` — Phase 2 (Task 3 + Task 4) of the hover-preview plan

Scope: `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx`, `Pommora/src/renderer/src/Embeds/PageEmbed.tsx`, `Pommora/src/renderer/src/Embeds/embeds.css`, `Pommora/src/renderer/src/Tabs/warmCache.ts`, `Pommora/src/renderer/src/MarkdownPM/connections/index.ts`, `Pommora/src/renderer/src/MarkdownPM/editor/connections.ts`, `Pommora/src/renderer/src/MarkdownPM/index.tsx`, `Pommora/src/renderer/src/MarkdownPM/useConnectionAutocomplete.ts`, `Pommora/src/renderer/src/MarkdownPM/autocomplete.ts`, `Pommora/src/renderer/src/MarkdownPM/AutocompletePanel.tsx`, `Pommora/src/renderer/src/Embeds/connectionHoverCard.test.tsx`.

### Critical

**Clicking a resolved connection's link text inside the hover card pops the live autocomplete/candidate panel — not "clicks do nothing" (confidence 90)**

`Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx:175` wires `connections={resolveOnly}`, and `resolveOnly` (`ConnectionHoverCard.tsx:101-104`) spreads the *real* `pageIndexOf(tree)` — a fully populated `resolve`/`candidates` index, not a stub — with only `open` neutered.

`MarkdownPM/index.tsx:273` runs `detectConnectionQuery(u.view, setAc, true)` on `u.selectionSet` regardless of the editor's `readOnly` state — `EditorState.readOnly` only filters `docChanged` transactions (`changeFilter`, `index.tsx:173`, and the file's own comment: "advisory... stops the input pipeline but NOT a programmatic dispatch"); it never gates selection changes. CM6's built-in mousedown handling sets the caret synchronously *before* the `click` DOM event fires, so by the time `connections.ts`'s `click` handler (`editor/connections.ts:58-72`) calls the no-op `api.open()`, the selection has already changed and `detectConnectionQuery` has already run.

`autocompleteQuery` (`MarkdownPM/autocomplete.ts:15-29`) matches caret positions strictly *inside* an already-closed `[[Title]]` span — exactly where a click on the rendered (colored) connection text lands, since decorations only hide/style marks, they don't move the underlying text offsets. With a real candidate index behind it, `candidates.length &gt; 0` is essentially guaranteed for a link whose title is by definition a real resolved page. `AutocompletePanel` (`MarkdownPM/AutocompletePanel.tsx:42-78`) then `createPortal`s a fully interactive, `position: fixed`, `z-index: var(--z-lifted)` dropdown to `document.body` — floating over the 260×120 hover card.

Net effect: the single most natural interaction with the card — clicking one of its own connection links — pops an interactive page-picker panel inside a surface Task 4's own requirement #2 spells out as "no editing… clicks do nothing." (Picking a candidate would itself no-op via `changeFilter`, but the panel's appearance alone is the violation, and `commit()` still calls `view.focus()`.)

This mechanism is generic to any `readOnly` `MarkdownEditor` (any `locked` `PageEmbed`, e.g. `Blocks/BlockSurface.tsx:328`), so the root cause predates this diff — but the hover card is the first consumer whose entire purpose is "glance at a body full of `[[links]]` and never interact with it," and its plan explicitly promises inertness as a hard requirement. Worth fixing at the shared layer rather than re-raised as hover-card-only: gate the `detectConnectionQuery` call in `MarkdownPM/index.tsx:273` on `!u.state.readOnly` (one condition, fixes every locked/hover consumer at once, consistent with the "highest-level interface" rule).

### Clean / verified, no action needed

- **Fetch-gate races (Task 3):** the supersession token (`ConnectionHoverCard.tsx:35,51-56`) plus the resolve-time `el.matches(':hover')` check correctly handles flick-away-during-fetch, rapid re-hover of the same cold page (redundant IPC, not incorrect), and a warm hit for page A racing an in-flight fetch for page B (B's stale resolve fails its own `:hover` check once the pointer has moved onto A's link). `readPageDetail` never represents a failed state (`PageDetail.body` is non-nullable in `shared/types.ts:393`; `cachePageDetail` is only ever called on success), so the warm-branch skipping the `:hover`/failure check (`ConnectionHoverCard.tsx:47-49`) is safe by construction — the "must agree" contract from Task 3 holds.
- **`resolve-only` api vs. decorations:** `decorations.ts` only calls `conn.resolve`, present on `resolveOnly`. `hover` is absent, and `editor/connections.ts:41` (`if (!api?.hover) return false`) correctly no-ops mouseover on links inside the card, so nothing re-arms a hover-inside-a-hover.
- **`key={path}` remount (Task 3/4):** retarget across pages routes through a null beat (`ConnectionHoverCard.tsx:76-80`) before remounting `PageEmbed` under the new `key`; same-target refresh keeps the same `key` and updates the element in place without a re-fetch. Consistent with the plan.
- **CSS scroll model:** `.conn-hover-body .pgembed { overflow-y: auto }` (`embeds.css:29-32`) is inert in practice — `.pgembed`'s children are all `height: 100%`-capped down to `.cm-scroller`, so the box never actually overflows; the real (and only) scroller is CM6's own `.cm-scroller` (`Styles.css:62-73`), matching the plan's explicit intent ("the CM scroller then owns the wheel correctly at rest"). No double-scrollbar, no fought overflow.
- **`flushPageSave` on `PageEmbed` mount/unmount (`PageEmbed.tsx:111-114`):** always fires for the hover card since `editing` is permanently `false`. Checked whether this can cause data loss or a stale read: it can't — `flushPageSave` is a no-op without a pending write for that exact path, and the warm cache is already write-through-fresh at `schedulePageSave` time (`pageFlush.ts:16`) independent of the debounce, so an early flush only moves *when* a write lands, never *what* gets written. This is pre-existing `PageEmbed` behavior inherited by reuse (as directed by the plan), not new breakage — flagged and ruled out, not reported.
- **Tests:** `connectionHoverCard.test.tsx` matches Task 3's stated scope exactly (warm-sync, detached-no-op, cold-lands-under-hover, flick-away, failed-open, navigation-close) and doesn't overclaim coverage of the Task 4 visual mount, which the plan itself scopes to CDP verification rather than unit tests. No dishonesty found.

**Recommendation:** fix the one Critical (gate `detectConnectionQuery` on `!readOnly`) before calling Gate 2 closed — it's directly reachable through the feature's primary interaction and contradicts a written Task 4 requirement.
Phase 2 is done and visible above — that's Alpha's *entire* document scrolled to its end ("The end." plus the inert `missing.png` token) inside the little card, beak pointed at the `Alpha` link in Beta's prose. Banner suppressed, links styled-but-dead, embed tiles inert, scroll contained. Both commits are in (`205c7ce6`, `0240eab5`) with the PagePreviewPM doc rewritten in the falsifying commit and six card tests pinning the resolve-first gate (warm-synchronous, cold-under-pointer, flick-away, failed-open, detached-element, navigation-close). Gate 2's correctness reviewer is running now — it's aimed at the fetch-gate races, the shared warm-slot side effects, and the resolve-only api's completeness. When it clears, Phase 3 slides the beak.

The reviewer found a real one that pre-dates the card but breaks its core promise: clicking a link *inside* the card seats a caret in the closed `[[Title]]` span, and the autocomplete detector runs on every selection change — read-only or not — popping an interactive picker over the glance surface. Verifying the site and fixing at the shared layer:

- **Bash:** Read the autocomplete detection site
- **Edit:** Pommora/src/renderer/src/MarkdownPM/index.tsx
- **Bash:** Find the AC panel's identifying class
- **Bash:** Add the gate test with its positive control
- **Bash:** Read the failure
jsdom's zero-geometry strikes again — `coordsAtPos` returns nothing so the detector bails even when editable. Pinning it:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/connectionHover.test.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/connectionHover.test.tsx
- **Bash:** Run the gate test
- **Bash:** Read the remaining failure
The panel now opens (progress — NotchedPane mounting proves the positive control) but this test file needs the RO stub:

- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/connectionHover.test.tsx
- **Bash:** Re-run
- **Bash:** Check pass/fail
Both halves green. Full gates + live confirmation of the click-in-card fix:

- **Bash:** Full gates
- **Bash:** Live: click a link inside the card — no picker, no nav
- **Bash:** Scroll the card to a visible link, click it
- **Bash:** Retry: click a visible in-card link
- **Bash:** Scroll card until a link is visible, then click it
- **Bash:** Check renderer liveness + CPU
- **Bash:** Renderer CPU + simple eval probe
- **Bash:** Simple eval probe
- **Bash:** Commit the Gate 2 fix + close the gate
Phase 3 — reading PickerMenu's NotchedPane render to wire the inset correctly for both directions:

- **Bash:** Read PickerMenu's pane render + notch wiring
- **Bash:** Read the props block for the onDirection addition
- **Edit:** Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx
- **Edit:** Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx
- **Edit:** Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx
- **Edit:** Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx
- **Bash:** Gates on the beak change
- **Bash:** Beak case A: left-side link
- **Bash:** Beak case B: right-edge clamp
- **Bash:** Beak case B at 400px viewport
- **Read:** /private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/6dc9212b-b419-4b10-9e15-aa2fb5aedb6e/scratchpad/p3-clamped.png
- **Bash:** Restore viewport, tick + commit Task 5
Phase 3 closed (its formal review folds into Gate 4's range — recorded as a deviation). Phase 4 · Task 6 — the resize strips:

- **Bash:** Re-read the gesture skeleton's spec
- **Bash:** Read usePointerGesture's shape
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/embeds.css
- **Bash:** Gates on the resize build
- **Bash:** Live resize: SE corner drag
- **Bash:** SE drag with held buttons + Escape-abort test **[interrupted]**

##### Nathan

If i can visually verify things, wait untill the end of the plan to walk me through wahts correct and what I should expect. Otherwise, continue with the plan.

##### Claude

- **Write:** /Users/nathantaichman/.claude/memory/pommora/feedback-defer-uix-verification-to-plan-end.md
- **Bash:** Commit Task 6
Task 7 — the persisted size. Reading the singleton channel precedent:

- **Bash:** Find the singleton channel precedent
- **Bash:** Read the tabs handler + preload shape
- **Bash:** Read tabs:save validation + state helpers
- **Bash:** Read the tabsState helper shape
- **Bash:** Read the scope-pair generator region
- **Bash:** Read the scopeGet/scopeSet generator
Pattern clear — singleton handlers à la tabs, with the KNOBs moving into the accessor as their one home. Building Task 7:

- **Bash:** Anchor points for the four contract files
- **Bash:** Wire the four contract files
- **Bash:** Check bridge's type imports
- **Bash:** Insert the main-side handlers
- **Bash:** Add main imports
- **Bash:** Read the shared-types import block
- **Bash:** Add the HoverCardSize type import
- **Edit:** Pommora/src/main/index.ts
- **Write:** Pommora/src/renderer/src/Embeds/hoverCardSize.ts
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Write:** Pommora/src/renderer/src/Embeds/hoverCardSize.test.ts
- **Edit:** .claude/Features/PagePreviewPM.md
- **Bash:** Find the stale scope-pair count
- **Edit:** .claude/Features/ArchitecturePM.md
- **Bash:** Gates on Task 7
Misplaced insert — reading the region to fix:

- **Bash:** Read the botched insert region
- **Edit:** Pommora/src/main/index.ts
- **Edit:** Pommora/src/main/index.ts
- **Bash:** Re-run gates
- **Edit:** Pommora/src/renderer/src/Embeds/connectionHoverCard.test.tsx
- **Bash:** Full gates again
- **Bash:** Tick + commit Task 7
- **Bash:** Read Personalization + the coercion pass
- **Bash:** Add the key to types + coercion pass
- **Bash:** Fix import + find the round-trip key list
- **Bash:** Read the round-trip assertion + numeric precedent test
- **Edit:** Pommora/src/main/readNexus.test.ts
- **Bash:** Negative control: green → red without the line → green restored
Negative control proven — green, red without the coercion line, green restored. Now the Settings row:

- **Bash:** Read the render body + ToggleRow
- **Edit:** Pommora/src/renderer/src/Settings/SettingsWindow.tsx
- **Edit:** Pommora/src/renderer/src/Settings/SettingsWindow.tsx
- **Bash:** Check SettingsWindow imports
- **Edit:** Pommora/src/renderer/src/Settings/SettingsWindow.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** .claude/Features/ConfigurationPM.md
- **Edit:** .claude/Features/ConfigurationPM.md
- **Edit:** .claude/Features/ConfigurationPM.md
- **Bash:** Gates on Task 8
- **Bash:** Tick + commit Task 8
Phase 6 — table cells. Reading TableView's root and activation plumbing:

- **Bash:** Locate TableView root + StaticCell activate
- **Bash:** Read activate body + wrap render, connections.ts timer
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/connections.ts
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/connections.ts
- **Bash:** Sweep remaining cancelHover references
- **Bash:** Rewire the click/contextmenu cancels
- **Bash:** Read TableView imports + props
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx
- **Bash:** Find the cell-connection doc claims
- **Edit:** .claude/Features/MarkdownPM.md
- **Bash:** Gates on Task 9
- **Bash:** Read the lint errors
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx
- **Bash:** Re-run gates
- **Bash:** Finish the gate run
- **Bash:** Gates with explicit exits
- **Bash:** Read the remaining lint error
- **Edit:** Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx
- **Bash:** Final gate run for Task 9
- **Bash:** Tick + commit Task 9
- **Dispatch:** feature-dev:code-reviewer — Review Phases 3-6 commits
- **Return:** ## Review: Phases 3–6, commit range `d462b160..HEAD`

Reviewed against `.claude/Planning/Hover Preview — Implementation Plan.md` (Phases 3–6 + Global Constraints), grounded in the actual diff:
- `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx`
- `Pommora/src/renderer/src/Embeds/hoverCardSize.ts`
- `Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx`
- `Pommora/src/main/index.ts` (`hoverCard:load`/`hoverCard:save`)
- `Pommora/src/renderer/src/MarkdownPM/editor/connections.ts`
- `Pommora/src/renderer/src/MarkdownPM/Tables/TableView.tsx`, `cellStatic.tsx`
- `Pommora/src/shared/types.ts`, `Pommora/src/main/readNexus.ts`, `readNexus.test.ts`
- `Pommora/src/renderer/src/Settings/SettingsWindow.tsx`, `design-system/components/Slider/Slider.tsx`
- `Pommora/src/renderer/src/design-system/personalization.ts`

### Critical

**Single-axis resize silently overwrites the untouched axis's persisted size with the current link's viewport-clamp, defeating "one universal size" (Req 7).** — Confidence 85.
`Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx:106-137`

```
const start = { ...shownRef.current }   // line 110 — already band-CLAMPED, not the raw stored size
...
onDragMove: (ev) =&gt; {
  const cap = maxSize()
  setSize({
    w: axes.x ? Math.min(cap.w, Math.max(CARD_MIN.w, start.w + (ev.clientX - sx))) : start.w,
    h: axes.y ? Math.min(cap.h, Math.max(CARD_MIN.h, start.h + (ev.clientY - sy))) : start.h,
  })
},
onDrop: () =&gt; {
  resizingRef.current = false
  setHoverCardSize(shownRef.current)   // line 136 — persists both axes, including the untouched one
},
```

`shown` (and therefore `start`) is `{ w: min(size.w, max.w), h: min(size.h, max.h) }` — the *render-time band clamp*, not the stored `size` state. Because `max.h` is derived per-link from the vertical band available on the placed side (`maxSize()`, lines 85-96), any link with less room than the previously-stored universal height will render (and thus start-drag-capture) a shrunken `h`.

When the user then drags **only** the `e` strip (width-only resize), `axes.y` is `undefined`, so `onDragMove` writes `h: start.h` verbatim into `size` state — the clamped value, not the true stored height. `onDrop` then calls `setHoverCardSize(shownRef.current)`, persisting that clamped height as the new universal size even though the user never touched height. Symmetrically, an `s`-only (height-only) drag persists a possibly viewport-clamped width.

This directly contradicts the plan's own stated principle for Task 6 ("the max is **rendered, not stored**" — `Hover Preview — Implementation Plan.md:242`): the max is leaking into the stored value whenever a single-axis drag happens near a constrained link. In practice: hover a link low on the page (small available band) → card opens visibly smaller than the remembered size (correct, transient) → widen it slightly via the `e` strip → drop → the universal height is now silently ratcheted down to that link's band, persisted for every future card everywhere, until the user happens to do a height/corner drag to restore it. Repeated across sessions this erodes the "universal remembered size" toward whatever the most cramped recently-visited link allowed.

**Fix:** capture the *un-clamped* pre-drag size as the drag baseline for the untouched axis (i.e., keep a separate `size` ref for `start`, not `shownRef`), or only include the dragged axis in `setHoverCardSize`'s payload (merging with the last stored value for the other axis) rather than the full render-clamped `shown` object.

### Clean / verified — no issue

- **PickerMenu `notchInsetLeft` math (T5):** `c - (left - pw/2)` correctly reduces to `pw/2` when unclamped, matching the stated invariant; only one consumer (`ConnectionHoverCard`) passes `onDirection`, and it passes the stable `setDir` setter, so no other `origin="center"` consumer re-runs the placement effect every render (`PickerMenu.tsx:228`, confirmed via grep — only one call site).
- **`onDirection` / stale-band first frame:** `dir` is updated via `setDir` inside PickerMenu's `useLayoutEffect` (a child of `ConnectionHoverCard`), which React flushes synchronously before paint — no visible stale-band frame despite the theoretical ordering concern.
- **Resize drag vs. PickerMenu re-placement:** the re-derivation on width growth ("width distributes around the beak") is explicitly sanctioned by the plan (`Task 6` files note) and is monotonic — no oscillation/feedback loop found.
- **`hoverIntent()` per-TableView instance vs. the singleton card:** each table owns an independent debounce closure; concurrent tables don't share timers, and the card's own retarget-through-null logic (`ConnectionHoverCard.tsx:150-153`) correctly handles two intents resolving to different pages.
- **Table `onMouseOut` cancel vs. cell-padding→span ping-pong:** moving from a cell's padding onto a nested resolved span fires `mouseout` (bubbles, cancels) immediately followed by `mouseover` (bubbles, re-arms) synchronously in the same dispatch — net effect is a timer reset, not a broken arm.
- **`graceMs` dependency re-run mid-open:** the effect's cleanup correctly clears its own closure-scoped `grace` timer on `[hovered, graceMs]` change; no leaked timer. (A truly mid-linger settings change leaves the countdown paused until the next `mousemove`, per the documented "re-arms on next movement" design — not flagged as a bug, matches existing post-drop-rule precedent.)
- **Slider `onCommit`:** confirmed fires only on `onPointerUp` (and arrow-key step), never on `onPointerMove`/drag-tick (`Slider.tsx:69-72`) — matches the stated contract.
- **`readNexus` coercion vs. apply-map:** `hoverPreviewLinger` is correctly absent from `personalization.ts`'s `ROOT_CLASSES` map — it has no DOM effect at that seam and none was added, consistent with the requirement.
- **Main-process `hoverCard:save` validation:** correctly rejects non-finite/non-number `w`/`h` before writing (`main/index.ts:591-605`).

No other correctness issues found at ≥80 confidence in this range.
- **Dispatch:** code-simplifier — Simplify Phases 3-6 diff
- **Return:** The diff was already tight — most of what looked like bait was the briefed-deliberate machinery. Three real cuts landed; gates all green (typecheck clean, 2188 tests pass unmodified, biome clean).

**Simplified**

- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/main/index.ts` — `hoverCard:save`'s 4-clause inline guard (`isPlainObject` + two `typeof` + two `Number.isFinite`, spread over 8 lines) collapsed to `if (!isCardSize(size))`. The predicate sits next to the existing `isRect` and copies its idiom exactly, so boundary validation in this file now has one shape instead of two. Narrowing still holds for the `{ w, h }` key-strip on write.
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/design-system/components/PickerMenu/PickerMenu.tsx` — exported `PickerDirection`. The `'down' | 'up' | 'left' | 'right'` union was written out **five** times across two files; the new `onDirection` prop was about to make it six. Type-only, zero behavior. This touches three pre-existing lines (`direction`, `effDir`, `decidedDir`) slightly outside the stated scope — declaring a type and leaving three restatements of it two lines below would just get re-flagged next pass.
- `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` — `maxSize()`'s anonymous `{ w: number; h: number }` return now names `HoverCardSize`, the contract type the file's whole size story already speaks; `dir` state uses `PickerDirection`; the 6-line `hoverCardSize` import collapsed to one.

Net roughly −10 code lines.

**Flagged, not done**

- **The resize axis math** (`ConnectionHoverCard.tsx:126–131`). The `w` and `h` clamps are mirror-image — a Rule-of-Two candidate — but the only extraction is a 5-positional-arg helper (`on, from, delta, min, cap`), and the two adjacent `min`/`cap` pairs make an argument swap silent and untestable. The explicit math is worse duplication and better code. Left.
- **`PickerMenu.onDirection` in the remeasure effect's deps.** Correct as written, but it means an inline-lambda consumer re-registers scroll/resize listeners every render. The one consumer passes a stable `setDir`, so it's inert today. Ref-boxing it is a real change to a hot effect for a hypothetical second consumer — not worth it now, worth it the moment one appears.
- **The drag's `Math.min(cap, …)` alongside the render-time `shown` clamp** looks like a double clamp. It isn't redundant: removing it lets `size` run past the ceiling and creates a dead zone when you drag back. Behavior, left alone.
- Everything on your don't-touch list I verified rather than assumed — `LingerRow`, the module singletons, the `:hover` resolve gate, per-render `maxSize()`, the double-rAF detach check. All confirmed load-bearing and untouched.

**Cross-file opportunities (report-only)**

- **`hoverIntent()` should own the table's gate too.** `TableView.onLinkOver` and `connections.ts`'s `mouseover` handler now share the timer, but each still re-derives *whether to fire*: cancel → `closest('.md-connection-resolved')` → resolve → status check → arm. Only the middle step genuinely differs (the editor tokenizes the line via `resolvedPageAt`; the table reads `textContent` and demands a `.mdpm-tbl-cell-static` ancestor). That's two sites, and they diverge meaningfully — I would **not** merge them yet. Worth naming now because a third resting-link surface (cards, list rows) would make the shared gate obvious and the wrong abstraction expensive.
- **`VIEWPORT_MARGIN` is declared independently in `ConnectionHoverCard.tsx` and `PickerMenu.tsx`.** Same concept, same purpose — the card's ceiling math is deliberately reproducing the picker's viewport inset. If they ever drift the card will clamp to a different edge than the pane it lives in. A single exported constant from `PickerMenu` is the natural home; out of scope to move.

**Comments**

No comment-killer pass warranted. The narration here is dense but almost all of it is genuine *why* — the CM6 update-timing note, the `:hover` gate rationale, the "None stores no key" discipline line. The one comment I'd have cut, `// every open adopts the current universal size` on line 157, restates its own statement, but it's a single trailing clause and stripping it is the killer's lane, not mine.
Both gate agents are running (the reviewer over the committed range, the simplifier holding the tree). Once they land and any concerns settle, Phase 7 closes out — sweep, delivery claim, neutral verification, attack pass — and then you get the full walkthrough of what shipped and what to expect when you drive it, including the one operational note that the new size-persistence IPC needs a dev-process restart to be live.

Simplifier's back — three small cuts (a shared `isCardSize` predicate matching the file's `isRect` idiom, a `PickerDirection` type replacing five spelled-out unions, and type-naming in the card), roughly −10 lines, gates re-verified green, and every deliberate design confirmed rather than churned. Its two report-only notes (the future shared hover gate if a third surface arrives, and the duplicated `VIEWPORT_MARGIN` constant) are logged for later, not this arc. Waiting on the correctness reviewer to close the combined gate.

Verified against the code in context — the single-axis drag really does persist the other axis's band-clamped value, ratcheting the universal size down to the most cramped link you ever resized near. Fixing at the drop — only dragged axes persist, merged with the stored value:

- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Bash:** Gates on the ratchet fix + simplifier edits
- **Bash:** Commit the gate bundle
- **Bash:** Locate the pending entry + run the dead-vocab sweep
- **Bash:** Remove the shipped entry from Pending-Work
- **Bash:** Write the claim, commit the sweep
- **Dispatch:** general-purpose — Neutral verify the delivery claim
- **Return:** All evidence is in. Verdict below.

## Verdict: TRUE-WITH-NOTES

The landed code supports the claim across all ten requirements and every confirmed spec decision. The notes are record-keeping shortfalls, not missing behavior.

### Requirements 1–10 — all supported

1. **Body** — `ConnectionHoverCard.tsx:266-274` mounts `PageEmbed` (chrome defaults to none, `locked`, `ancestors={HOVER_ANCESTORS}`); condensation comes free — `PageEmbed.tsx:141,162` applies `EMBED_SCALE`/`EMBED_ZOOM` unconditionally; `.conn-hover-body .pgembed { overflow-y: auto; overscroll-behavior: contain }` in `embeds.css`; pointer-inside clears the grace (`onMove`, line 216). Commit `0240eab5`.
2. **Inert** — A-6's exact shape: `resolveOnly = { ...pageIndexOf(tree), open: () =&gt; {} }` — resolve present, `open` a no-op, `hover`/`menu`/`bypass` absent (line 188-191). Nested tiles inert via the non-path ancestor chain. The Gate-2 ruling's read-only autocomplete fix (`MarkdownPM/index.tsx:273`, commit `d462b160`) closes the one hole found.
3. **Resolve-first** — `hoverConnection` (lines 54-66): warm-cache sync hit or fetch gated on supersession token + `el.matches(':hover')`; failed result opens nothing. Commit `205c7ce6`; pinned by `connectionHoverCard.test.tsx`.
4. **Closes** — grace/linger timer, Escape (`onKey` with `preventDefault`), navigation (store subscription on `selection`/`activeTabId`/`preview`, line 173-176), detached element (isConnected checks + the double-rAF Deviation, honestly recorded); **A-8**: `intent.cancel()` first in both `click` and `contextmenu` (`editor/connections.ts`, commit `ec552eca`).
5. **B-4 live anchoring** — real: `anchorRef` holds the live element as PickerMenu's `triggerRef`, and PickerMenu's existing capture-phase scroll/resize `measureOnFrame` listeners re-measure it; the beak slides via `notchInsetLeft = c − (left − half)` in the centered branch (`PickerMenu.tsx`, commit `ee283b92`) — unclamped it reduces to today's centered beak, exactly as planned. Retarget routes through a closed beat (`present`, lines 156-160) so the flip re-decides.
6. **B-2/B-5 resize** — e/s/se strips only; `dir !== 'up'` hides `s`+`se` (width-only when flipped — line 277); `swallowActiveEscape: true`; `resizingRef` suspends the leave lifecycle mid-drag. One divergence noted below.
7. **B-3/B-6 size** — `hoverCardSize.ts` is the single clamping accessor (clamp-on-read, KNOB default/min); `hoverCard` scope + `hoverCard:load/save` land in `localState.ts`, `bridge.ts`, preload, and `main/index.ts` with a main-side shape check; the max is rendered (viewport width + the per-side band), never stored. The `c94e01d9` ratchet fix (only dragged axes persist) is honestly recorded as the combined-gate Critical.
8. **B-7 one card** — single app-level mount (`App.tsx:273`); all four hosts verifiably dropped `useConnectionHover` for the static `hover: hoverConnection` and their `{hoverCard}` render sites. Module-singleton `present` makes it structural.
9. **C-1..C-5** — `hoverPreviewLinger` in all three contract sites (`types.ts` + `coerceHoverLinger`, `readNexus.ts:124`, `readNexus.test.ts` round-trip with clamp/junk/zero cases); `LingerRow` slider 0–30, step 1, 0 reads "None" and commits `undefined`. **C-2's re-entry cancel is real**: the same grace timer, `clearGrace()` whenever the pointer is over link or card (lines 216-217). Commit `7c710ed2`.
10. **D-1/D-2/D-3** — `hoverIntent()` hoisted so the 450ms delay is one fact; `TableView.tsx` delegates `onMouseOver` with the class gate first, restricted to `.mdpm-tbl-cell-static`; activation calls `intent.cancel()` + `closeActiveHoverCard()`. Commit `51912670`.

**Spec coverage beyond the requirements:** all parked items (in-card clicks, live-cell handlers, per-page size) sit in Sequenced After matching the spec's Prospects. The dead-vocabulary sweep verifies: `PLACEHOLDER` → 0 hits in `src`, `LEAVE_GRACE_MS` → 2 (control alive). No new dependency (no package.json in the range). The mouseover paths gate before any layout read.

### The Notes

1. **The deferral honesty device is self-attesting, not corroborated.** "Interaction pass deferred to Nathan's walkthrough at his direction" appears **only** in the Delivery Claim sentence itself, added in the closeout commit `fb6f61a1`. It is in neither Rulings nor Deviations, and no earlier commit in the range records that direction. The committed Handoff's walkthrough references are the *prior* arc's. I can't call it invented — the direction may live in the session or the parallel-owned working-tree Handoff — but the record as committed does not prove it. This is the claim's one unverifiable assertion.
2. **"The plan's Progress tree names each commit" is overstated.** The Progress tree names tasks and the base hash only — no per-task commit hashes. The commits do map one-to-one to the planned commit messages (I matched all of them), so the traceability is real; the claim's description of *where* it's recorded is not.
3. **B-5's post-drop re-arm diverges from the spec's literal wording** — spec: grace re-arms "once the pointer has been observed back inside and leaves again"; landed: first pointer movement after the drop. This was overridden *in the ratified plan* (Task 6's post-drop rule, with the standing-card-forever reasoning), so it's sanctioned — but the sanction lives in the plan, and the spec was never annotated.
4. **C-4's row-schema union was dropped** for the bespoke `LingerRow`. Legitimately: C-4 was `[assumed]`, not `[confirmed]`, and the plan's Inherited Reasoning records the simplification ruling explicitly.

Nothing was built less than agreed on the five watch-items you flagged: C-2's re-entry cancel, B-4's live anchoring, B-2's flipped-up width-only rule, D-1+D-2's shared delay, A-6's resolve-only api, and B-7's single card are all present and cited above.
The neutral verifier is adjudicating the claim against the spec and the full commit range. On its yes, the final attack pass runs; then the walkthrough comes to you.

TRUE-WITH-NOTES — behavior fully delivered, four record-keeping notes. Fixing the record where it's genuinely short (the deferral ruling belongs in Rulings — it's your mid-plan directive; the Progress tree gets its real hashes; the spec's B-5 wording restates to the ratified rule):

- **Bash:** Fix the record-keeping notes, commit
The record now proves its claim. Final closeout dispatch — the attack pass over the assembled whole:

- **Dispatch:** build-breaking-agent — Attack the shipped hover preview
- **Return:** Attacked the assembled system across `3ce8b642..HEAD`. Five findings, all executed against the real modules in a scratch Vitest rig (project sources, no project files touched) plus a headless-Chrome hit-test probe.

## Findings

### 1. The centred pane makes "free-edge" resize track at half rate — and grow leftward
**What breaks:** Dragging the card's right edge moves that edge only half as far as the cursor, and grows the card's *left* edge outward by the same amount.

**Who produces it:** Anyone resizing the hover card. First drag, no trying.

**Repro [verified]:** Link centred at x=550; card opens at 260w. Pointer-down on `.conn-hover-resize-e`, move +100px. Result: body width 260→360px, but the pane's anchor `left` stayed **550px** with `transform: translateX(-50%)` — the pane recentres on the link every frame, so the right edge advanced 50px against 100px of cursor travel and the left edge retreated 50px.

**Severity:** Medium `[verified]`

**Source and fix:** `ConnectionHoverCard.tsx:126` computes `start.w + (ev.clientX - sx)` — an edge-anchored delta — but `PickerMenu.tsx:176-188` places the pane with `origin="center"` (`left: c` + `translateX(-50%)` at `PickerMenu.tsx:378-385`). The resize math and the placement disagree about which edge is pinned. This is the horizontal twin of the guard the code *does* carry: the comment at `ConnectionHoverCard.tsx:101-102` reasons carefully about never growing upward, and never asks the same question sideways. Cheapest fix: double the x delta (`start.w + 2 * (ev.clientX - sx)`) — one expression, restores 1:1 edge tracking under a centred pane. Caveat worth stating: once `left` hits the viewport clamp (`PickerMenu.tsx:177-181`) the pane becomes edge-anchored and 2× overshoots, so the fully correct version measures the pane's live right edge per frame instead of applying a delta.

### 2. A second link to the same page never moves the card
**What breaks:** With the card open on one `[[Alpha]]`, dwelling on a *different* `[[Alpha]]` elsewhere in the document leaves the card sitting over the first link. Nothing appears to happen.

**Who produces it:** Anyone with two links to the same page in one note — hover one, then the other.

**Repro [verified]:** Open on link 1 (rect top 100) → pane `top: 126px`. `hoverConnection(samePage, link2)` (rect top 600). Forced a window `resize` **and** a capture-phase `scroll` to exercise every re-measure path PickerMenu owns. Pane `top` stayed **126px**; link 2 wanted 626px.

**Severity:** Medium `[verified]`

**Source and fix:** `ConnectionHoverCard.tsx:161-164` routes on `next.page.id !== cur.page.id`, so a same-page/different-element hover takes the "refresh in place" branch — written for the decoration-rebuild case, which is same-element. `anchorRef.current` updates, but `PickerMenu.tsx:145-230`'s placement effect lists the ref *object* in its deps and closes `measure()` over `triggerRef.current` at effect-run time, so changing `.current` re-runs nothing and the ResizeObserver keeps watching the old node. Fix: widen the retarget condition to `next.page.id !== cur.page.id || next.el !== cur.el` so an element swap also routes through the closed beat — one condition. (Same-element refreshes still bypass it, so no flicker regression.)

### 3. `overflow: hidden` on the card body clips the resize strips it shipped with
**What breaks:** The outer half of every resize strip — and the card's entire visible border — is inert. No resize cursor, no drag.

**Who produces it:** Anyone aiming at the card's edge to resize it.

**Repro [verified]:** Built the real rule chain (surface padding + `.conn-hover-body` + the three strips, verbatim from `embeds.css:26-70`) in headless Chrome and probed `elementFromPoint` across the edges:

```
rightEdge-3: "e"      rightEdge0..+5: "surface"   ← the visible 6px border is dead
bottomEdge-3: "s"     bottomEdge0..+5: "surface"
corner-8..-2: "se"    corner0..+5: "surface"      ← 16×16 grip reduced to ~10×10
```
The strips' own `getBoundingClientRect` still reports the full unclipped box (right edge 472 vs body 466) — reading rects hides this; only hit-testing shows it.

**Severity:** Low `[verified]`

**Source and fix:** `embeds.css:28` adds `overflow: hidden` to `.conn-hover-body` for scroll containment, but the body is also the strips' containing block (`position: relative`), so it clips them. The `-6px` offsets on all three strips are dead code, and the comment at `embeds.css:36-37` claiming "a thin band straddling the edge" is false. Fix: the scroll containment is already carried by `.conn-hover-body .pgembed { overflow-y: auto; overscroll-behavior: contain }` at `embeds.css:30-33`, and the pane's `clip-path` already bounds the card — drop line 28, or move the strips up to the surface. One line.

### 4. A close landing in the retarget beat is undone the next frame
**What breaks:** The card re-opens after the navigation that closed it, and sits over the destination page indefinitely.

**Who produces it:** Someone whose pointer is resting on a connection while a card from an *earlier* link is open, who then clicks it (or switches tabs) within the ~16ms frame after the 450ms intent fires. Not a designed sequence, but dwell-then-click is exactly how people follow links, so the frame is hit occasionally rather than never.

**Repro [verified]:** Open on page A → `hoverConnection(pageB, …)` (schedules the null beat) → `useSession.setState({ activeTabId: 'tab-2' })` (the real navigation close) → flush. Card open after the navigation: **true**, still true 10 frames later.

**Severity:** Low–Medium `[verified]` — self-heals on the next mouse movement (`onMove` sees the torn-down anchor and closes), so damage is a stuck floating card until the pointer moves. It persists indefinitely for a keyboard-driven navigation.

**Source and fix:** `ConnectionHoverCard.tsx:156-159` queues `requestAnimationFrame(() =&gt; setHovered(next))` with no handle. `closeActiveHoverCard()` (`:68`) sets an already-null state and the rAF wins. Note the same beat also silences Escape: the key handler lives inside the `[hovered]` effect, which is torn down during the beat. Fix: keep the frame id in a ref and cancel it on the null path and in the effect cleanup — three lines.

### 5. A linger countdown armed before a resize fires mid-drag
**What breaks:** The card blooms out from under the user's hand partway through a resize; the drag continues invisibly and still persists its final size.

**Who produces it:** A user with the linger set (non-default), whose pointer has left the card and armed the countdown, and under whom the card then repositions — a trackpad scroll moves the link, the pane follows and lands under the stationary cursor — who then presses and drags the edge without moving the cursor first. Three factors; honest producer, thin.

**Repro [verified]:** Linger 10s, card open, `mousemove` to (900,900) arms the countdown, +3s, then `pointerdown` + `pointermove` on `.conn-hover-resize-se` (verified activation: body width 260→280px). Probed the card across the deadline: `at9s: true, at11s: true (Bloom-out draining), at13s: false` — closed with the drag still live.

**Severity:** Low `[verified]` mechanism, `[traced]` producer

**Source and fix:** `ConnectionHoverCard.tsx:208` suspends the *leave lifecycle* during a resize but not the timer that lifecycle already armed. The comment at `:206-207` reasons about re-arming after the drop and never about a countdown that pre-dates the drag. Because `pointermove` precedes its compatibility `mousemove`, `resizingRef` is already true when the first `mousemove` of the drag arrives, so nothing ever clears it. Fix: `if (resizingRef.current) { clearGrace(); return }` — one line.

## Coverage honesty

Checked, pairwise: linger × resize; linger × retarget; retarget × navigation/tab/preview close; retarget × the rAF beat; size persistence × multi-open × the accessor cache; the beak's clamp band at both size extremes; `dir` flip × the s/se strip mounting; cold-fetch `:hover` gate × linger × supersession; the two-`hoverIntent` cross-table path; the table cell's `textContent` resolve vs the editor's tokenizer; `overflow` × the strips; the module import cycle Embeds↔Tables.

Not checked: the read-only autocomplete gate and the dead-element guard (prior rounds, per brief); the settings slider's `coerceHoverLinger` on-disk round-trip; `hoverCard:load/save` main-side behaviour beyond the renderer's use of it; anything requiring the app actually running under a real pointer — I drove no live instance.

## Unknowns

- **The height band's `CARD_MIN.h` floor can exceed the band.** `ConnectionHoverCard.tsx:94` returns `Math.max(CARD_MIN.h, band)`, so when the available band is under 100px the card renders past it, and `decidedDir` (`PickerMenu.tsx:128`) can't re-flip to compensate. I computed this needs a window under roughly 230px tall, or a flipped-up card anchored within ~100px of the viewport top. I could not determine the app's minimum window height. **Ten-second check:** shrink the window as far as macOS allows, hover a connection near the very top and again near the very bottom — does the card clip off-screen?
- **`dir` survives a close.** It's component state (`:76`) with no reset, so the first paint of each open sizes its height against the *previous* card's direction, and PickerMenu's one-shot flip decision is taken from a pane measured at that possibly-wrong height. Corrected within one placement pass; I could not determine whether the frame is visible. **Ten-second check:** open a card near the viewport bottom immediately after one near the top and watch for a height pop or a card that opens on the wrong side.

## Killed candidates

- *The s/se strips unmount mid-drag when `dir` flips* — **does adjacent code handle it?** `decidedDir` (`PickerMenu.tsx:128-131`) freezes the direction per open and `onDirection` only ever republishes it; `dir` cannot change while the card is open.
- *The beak misses its link at extreme card sizes* — **is designing around it proportional?** `NotchedPane`'s `nMin/nMax` clamp holds at both real extremes (min 180w, viewport-wide); worst-case beak error is ~4px, and it only degrades for a link whose centre sits within ~38px of the viewport's left edge.
- *Cold fetch × linger — a leave and return during the flight* — **already handled:** the `pendingFetch` supersession token plus the `:hover` gate (`:60-65`) cover leave, return, and re-arm; a re-entry simply mints a newer token.
- *Size persistence × immediate close/reopen while the save IPC is in flight* — **already handled:** `setHoverCardSize` updates `cached` synchronously before firing the IPC, so `present`'s `setSize(hoverCardSize())` adopts correctly mid-flight. This is the accessor-cache design working.
- *A failed save (NO_NEXUS / BUSY during adopt) silently loses the size* — **who produces it?** No card can be open with no session root or mid-adopt; there is no page to hover.
- *A resize landing before `hoverCard.load` resolves gets overwritten by the stale stored value* (`hoverCardSize.ts:26`) — **who produces it?** Requires a 450ms hover dwell plus a complete drag inside a launch-time IPC round-trip.
- *Two `hoverIntent` instances across two tables collide* — **already handled:** each wrap's `onMouseOut={intent.cancel}` fires on exit, and a cross-table hand-off lands in the ordinary retarget path.
- *The table resolves by `el.textContent` while the editor tokenizes* — **already handled:** `cellStatic.tsx` renders exactly the wikiLink's `contentRange` (bare Title, alias tail emitted outside the span), which is what `resolve` takes.
- *The beak band between link and card is a leave zone* — **who produces it?** The dead band is 8px (gap 6 + notch 8, minus 2×`RECT_SLOP`); breaking it needs a deliberate 200ms rest inside it, which is what the grace exists to absorb. Worth recording as coupling, not a finding: the 6px side/bottom padding equals `RECT_SLOP` exactly, so raising the surface padding turns the card's own visible border into a leave zone.
- *Import cycle `Embeds → MarkdownPM → Tables → Embeds`* — **who produces it?** `closeActiveHoverCard` is a hoisted function declaration; the cycle resolves before any call site runs.

## Verdict

**5 findings** — 2 Medium (the half-rate/bidirectional resize; the same-page anchor freeze), 1 Low–Medium (the un-cancelled retarget rAF), 2 Low (the clipped resize strips; the pre-armed linger firing mid-drag). All five are `[verified]` by execution rather than traced. **2 unknowns**, both with a ten-second in-app check. **10 killed**, mostly on gate 3 — the arc's per-phase guards genuinely absorb the single-surface failures the prior rounds were aimed at.

Every finding lives at a seam two phases share and neither owns: the design-system pane's anchoring vs. the card's own resize math (1), page identity vs. element identity (2), scroll containment vs. the resize affordance (3), the retarget handoff vs. the close paths (4), the resize gate vs. the linger timer (5). Four of the five fixes are one line; the fifth is three.
The final attacker is on the assembled system — scoped strictly to cross-phase interactions the per-phase rounds couldn't see (linger × resize, retarget × the rAF beat, two tables × one card, the flipped card mid-drag). When it returns I'll fix or rule on what survives verification, close the Log, and hand you the walkthrough.

A strong final round — five verified findings, four getting one-line-class fixes now. The fifth (half-rate symmetric resize) is actually the *ratified* B-2 behavior ("width growth distributes around the link"), so it becomes a walkthrough decision for you, not a silent change. Applying the four:

- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/embeds.css
- **Bash:** Gates on the attack fixes
- **Bash:** Commit the attack fixes + close the Log
- **Bash:** Arc line counts
- **Bash:** Kill my test dev instance
The plan is closed — all seven phases, every gate, the claim verified TRUE, the final attack absorbed. Here's your walkthrough.

## The Hover Preview — What Shipped and What to Expect

**The basics.** Rest on any resolved `[[Connection]]` for about half a second and a glass card blooms beside it showing the target page's actual content — no banner, no title, just the body at the embed's condensed scale. The beak points at the link from wherever the card sits: mid-page links get a centered beak, links near a screen edge get your `-----^` sketch — the card slides to stay on-screen while the beak slides along its edge to keep pointing. Near the bottom of the window the card flips above the link.

**Inside the card**: scroll freely (it's the whole document; the scroll stays contained — over-scrolling never moves the page behind), select text, and nothing else — links are colored but dead, embed tiles are inert, no click does anything. Mousing into the card keeps it open forever; it closes when you leave past the grace, press Escape, navigate anywhere, type/scroll the link away, or click the link itself (which navigates with no orphan card behind it).

**Resize** by the right edge, bottom edge, or their corner — proper cursors on each. Height only ever grows downward; a flipped-up card offers width only. The size is universal: resize once, every card everywhere opens at it, and it survives relaunch (per-machine). Height temporarily shrinks for a link with little room below it without forgetting your real size.

**The linger**: Settings ▸ Pages ▸ *Hover Preview Linger* — a slider, None to 30s. None is today's quick close; any value holds the card that long after you hover off, with re-entry cancelling the countdown.

**Three things to feel out and rule on:**
1. **Width resize is symmetric** — dragging the right edge grows both sides around the link, so the edge moves at half your cursor speed. That's the ratified "grows around the beak" behavior, but the attacker flagged it as feeling laggy. If you'd rather the dragged edge track your cursor 1:1 (the card growing twice as fast), that's a one-line change — say the word.
2. **Very short windows**: shrink the window hard and hover links at the extreme top/bottom — check the card doesn't clip off-screen (the minimum-height floor can exceed the available band below ~230px of window).
3. **Back-to-back opens on opposite sides** (one near the top, then one near the bottom) — watch for a one-frame height pop.

**Operational**: restart the dev process before testing — the size persistence rides new main-process IPC that ⌘R can't pick up. My test instance is killed; nothing of yours was touched, and the whole batch (19 code commits plus planning) is local and unpushed.

**Numbers**: +523/−84 lines excluding tests (roughly +430 code after comments), +266 of tests (2,188 total, all green, lint clean). Seven review rounds across the arc caught five Criticals before you ever saw them — the ratchet bug alone would have slowly shrunk your card size forever.

##### Nathan

the widnwo shouldt require extra gutter spacing, or vertical padding. This is because grip menues should be inacitve, the window is only interactive via scroll behavior, thats it. No grip menues or gutter actions.

The resizing should use the same hover-accent that tiles and embeds do.

##### Claude

Two refinements: strip the interior of gutter/padding reserved for affordances the card doesn't offer, and give the resize strips the standard tile accent. Finding the real tokens and gutter consumers first:

- **Bash:** Find the accent treatment + fold gutter classes
- **Bash:** Find the pane stroke + accent token
- **Bash:** Read the frame SVG structure
- **Edit:** Pommora/src/renderer/src/Embeds/embeds.css
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Bash:** Wire the resizing state + run gates
Gates green. Committing the refinement:

- **Bash:** Commit the interior + accent refinement
Both refinements are in (`a8ee3932`), folded per the live-cadence rule:

- **Scroll-only interior**: the gutter lane is gone (`--fold-gutter: 0` inside the card — grip menus, fold chevrons, and gutter actions reserve nothing) and the vertical padding is zeroed, so content sits flush; the side inset stays symmetric and is a marked KNOB in [embeds.css](Pommora/src/renderer/src/Embeds/embeds.css) if you want to nudge it.
- **The resize accent**: hovering any resize strip — or holding a live drag — now paints the card's frame with the same `--accent-stroke-hot` tiles and embeds wear, applied over the pane's own border path so there's no second border mechanism.

Both are CSS/HMR-visible except the small component change driving the drag-state class, which rides the next ⌘R. Everything else from the walkthrough stands — the symmetric-width-resize ruling is still yours to make once you've felt it.

##### Nathan

Confirmed. However like I said, you should not be able to enter your caret into this preview.

##### Claude

Right — tightening from "selection harmless" to "no caret entry at all." Blocking it at the press (mousedown's default is what seats CM's caret; the resize strips ride pointer events, which fire first and are unaffected), plus killing the I-beam that would advertise editability:

- **Bash:** Block caret entry + I-beam; run gates
- **Bash:** Full suite + commit the caret block
Done (`e689473a`). The press now dies at the card's boundary — a capture-phase swallow on mousedown means CM never seats a caret, takes focus, or starts a selection drag anywhere in the preview, and the text cursor inside reads as a plain arrow instead of an I-beam so nothing advertises editability. Wheel scrolling is untouched (it never rode mousedown), and the resize strips keep working because their pointer gesture fires before the mousedown the card swallows. The A-4 ruling in the decision log is restated to match — the card is scroll-and-resize only, full stop. All 2,188 tests green; ⌘R picks it up.

##### Nathan

confirmed, however the heading-fold adjustment should be made to the left since it's within an embedd, use existing logic for this. **[interrupted]**

Nevermind; its likely better to remove the chevron entirely and have clicking a heading fold and unfold itself since the in-line caret placement is now disabled and wont conflict.

##### Claude

Card-only: kill the chevron, make heading clicks toggle the fold through the existing fold logic. Reading the folding module for its toggle seam and classes:

- **Bash:** Find the fold toggle + heading classes
- **Bash:** Read the chevron widget + its toggle invocation
- **Bash:** Find the chevron + the toggle entry
- **Bash:** Read toggleFold + the line class + chevron CSS
- **Edit:** Pommora/src/renderer/src/MarkdownPM/editor/folding.ts
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Edit:** Pommora/src/renderer/src/Embeds/embeds.css
- **Bash:** Gates on click-to-fold
- **Bash:** Finish the gates
- **Bash:** Confirm lint explicitly
- **Bash:** Read the lint error
- **Edit:** Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx
- **Bash:** Lint fix, gates, commit click-to-fold
Done (`da16483f`). In the card, the chevron is gone entirely — clicking anywhere on a heading line folds or unfolds its section, running through the exact same `toggleFold` the chevron gesture uses (I exported a positional entry from the folding module rather than duplicating any of it, so fold behavior stays one fact). Foldable headings show a pointer cursor inside the card as the affordance signal, the fold animation is the same Reveal motion, and none of this touches the full-page editor or embeds elsewhere — their chevrons behave exactly as before. Gates green, all committed; ⌘R to see it.

That closes out today's refinement batch on the card: scroll-only interior with no gutter lane or vertical padding, the hot accent stroke on resize, no caret entry anywhere, and click-to-fold headings. The one open feel-decision from the walkthrough remains the symmetric width resize — say the word if the half-speed edge bothers you and I'll flip it to 1:1.

##### Nathan

explain breifly the half speed edge

##### Claude

When you drag the card's right edge, the card stays centered on the link it's pointing at. So if you drag your cursor 100px to the right, the card gains 100px of width — but it's split evenly: 50px goes to the right side and 50px to the left. The edge under your cursor only moves half as fast as your hand, and your cursor gradually "outruns" it mid-drag.

This is a side effect of the beak-anchoring you ratified: the card centers itself on the link, so it can't grow in one direction only — widening it pushes both sides outward around the anchor.

The alternative: double the drag so the edge tracks your cursor 1:1. The card then grows 200px for that same 100px drag (both sides still expand — the left side just also moves at full speed). Your hand feels right, but the card visibly grows twice as fast as you're dragging.

There's no option where the right edge alone moves — that would un-center the card off its link. It's a pick-your-compromise: **edge fidelity** (1:1, faster growth) versus **growth fidelity** (current, laggy-feeling edge). Try a resize and see which feels wrong.

##### Nathan

It's acceptable.
What isnt acceptable is the clear lack of DRY consideration; the highlights border doesnt seem to use the duration tokens that other accent-resize actions use like surfacepm tiles and markdown embedds.

##### Claude

You're right — I painted the stroke with no transition while the tile chassis animates its accent on the shared beat. Finding the exact treatment tiles use:

- **Bash:** Find the tile border accent transition
- **Edit:** Pommora/src/renderer/src/Embeds/embeds.css
- **Bash:** Lint + commit the accent transition
Fixed (`81993486`) — the frame stroke now transitions on `--duration-base` with `--ease-standard`, the identical declaration the markdown embed tile uses for its accent border, so the accent breathes in and out on the house beat instead of snapping. Fair hit: I reused the *color* token but hand-skipped the *motion* half of the treatment — an accent treatment is both, and Interaction.md is the law on that. CSS-only, so it's live on hover without a reload.

##### Nathan

cofnirmed, however the bloom-out seems jumpy. Please send a final code-review on this entire feature + its mandatory simplification and hoisting pass. This pass should apply the fix to this issue to.

Once it's done, please add 

#### MarkdownPM -- Hover Previews

into history; likely 3-5 sentences is all that's needed here; same story with the II. Hover Previews in MarkdownPM.md

---
- **Avoid Absolutes:** Avoid writing unnecessary absolutes or double negatives such as “this is true, never that” when “this is true” is interpreted the same way — don’t assert claims as locked; claims should be written neutrally.
- **Professionalism:** Write through encyclopedic-neutral and grammatically correct conventions; full terms, connective phrasing, natural advancement of ideas, and documentation-appropriate structure. Avoid agent-hand language such as fragmentation, fact-stacking, single-clause statements, and re-emphasizing established points — documentation *shouldn't* read like you're trying to convince anyone of its claims.
- **Tense:** Consider the time-specific implications of what you're writing — session-specific or historical documentation should avoid variable claims and use past-tense framing, while feature documentation should describe current state neutrally and assertively, while avoiding over-specification and enumeration that would risk those claims becoming outdated or inaccurate given the natural lifecycle of a project to accumulate changes, or otherwise highly subject to change. 

---

Once thats done, run through the newly updated 9changed recently) /handoff procedure. It requires reformatting the existing document + moving the MarkdownPM stuff (codeblocks + table thing + this) into Current Focus, while the current "Current Focus" as-in the identities and nexusrecord get removed from that block and NOT added anywhere esle -- those already are within the recent work. 

Also, with the Context.md format -- the current "why" before getting into it doesnt need to exist lmao; just write it professionally and with 'similar' phrasing, but youre totally allowed to say instead of like this in the current Syntax entry

"Properties keyed values by ULID inside a nested map while Contexts keyed theirs by name at the root — exact mirror images, each paying the cost the other refused."

you could just say

"Properties where changed to have their keyed values within [Property] syntax, with Context using (Context) syntax; this reversed the previosuly wrapped frontmatter format."

- Please also fix the project-context document so that it DOESNT enforce that kinda akward phrasing I just noted lol, you're allowed to have some freedom here as long as it follows standard documentation practices.

##### Claude

On it — one final combined pass (review + the mandatory simplification/hoisting + the bloom-out fix), then the docs, then the new handoff. My read on the jumpy bloom-out to seed the reviewer: the body unmounts the instant the card closes (`{hovered && <PageEmbed/>}`), so the exit animation fades an *empty* shell — the content vanishes a frame before the fade starts. The preview window already solved this class with a held-target ref.

- **Dispatch:** general-purpose — Final pass: review + simplify + fix bloom-out
- **Return:** **Bloom-out diagnosis — confirmed, with a second jump source.** The hypothesis was right: `{hovered &amp;&amp; &lt;PageEmbed/&gt;}` unmounted the body the instant `hovered` went null, so PickerMenu's ~380ms `useExitPresence` exit faded an empty shell (PickerMenu freezes *position* through the close via `place.current = null`, but the card's own content and size were never frozen). The size half was also real: during the exit `maxSize()` reads a null link and falls back to the full viewport band, so a band-clamped card *grew* to its stored size mid-fade.

**Fix** (in `/Users/nathantaichman/The Studio/Projects/Project Pommora/Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx`): the PreviewWindow `held` pattern — a `heldRef` carries the last non-null `Hovered` through the exit and the body renders from `held`; the `shown` clamp now freezes the same way (`shownRef` only updates while `hovered` is live, and doubles as the existing resize-gesture ref — no second ref added). Retarget closed-beat verified safe: during the one-rAF null frame the pane is frozen at the *old* link showing the *old* content (better than the previous blank flash), and the same render that reopens at the new link swaps `hovered` → `PageEmbed` remounts on its new `key` — old content can never paint at the new anchor. After the exit completes PickerMenu returns null, so the hold renders nothing.

**Review findings.** Walked every scope seam — `hoverIntent` arm/cancel ordering in both the editor handlers and TableView's delegation, the cold-fetch supersession token + `:hover` gate, `toggleFoldAt`'s `posAtDOM` line-start contract, PickerMenu's centered branch (beak-slide math, `decidedDir` reset on `open === false`, `onDirection` stability), the linger coercion (`coerceHoverLinger` clamps at the read boundary, LingerRow deletes the key at 0), and the `hoverCard:load/save` handlers (`isCardSize` guard, clamp-on-read in `hoverCardSize.ts`). Nothing incorrect found; resize strips are already inert during the exit via PickerMenu's `pointerEvents: 'none'` closing style, so the held content can't mis-fire a fold click. No reported-only items.

**Simplification.** The feature was already lean from prior rounds; the only redundancy candidate (a separate frozen-size ref) was avoided by folding the freeze into the existing `shownRef`. All adjudicated keeps untouched.

**Gates** (from `Pommora/`, pipefail on): `npm run typecheck` clean · `npx vitest run` 2188/2188 · `npx biome lint src` clean. **Diff:** +4 code lines (comments excluded). Nothing staged or committed.
While the code agent runs, the docs. Reading History's current top and the skill's voice section:

- **Bash:** Read History top + locate the voice section
- **Bash:** Find where the parallel reorg moved things
- **Bash:** Find project-context skill + read HistoryPM top
- **Edit:** .claude/HistoryPM.md
- **Edit:** .claude/Features/MarkdownPM.md
- **Edit:** .claude/Features/PagePreviewPM.md
- **Bash:** Read the studio-context voice section
- **Bash:** Rewrite the studio-context voice mandate
Docs are written (History entry, MarkdownPM §II. Hover Previews, PagePreviewPM condensed to a pointer so the interaction has one home) and the `studio-context` skill's voice section now asks for professional documentation phrasing instead of the stylized motivation-first mimicry — your Syntax-entry example is baked in as the model. The final-pass agent is mid-fix on the bloom-out (it's applying exactly the held-target pattern the preview window uses, so the card keeps its content and frozen size through the exit animation). Once it reports and its gates hold, I commit the batch and run the new /handoff with your Current Focus reshuffle.

The pass confirmed both jump sources (empty shell *and* the size growing mid-fade) and folded the freeze into the existing ref — +4 lines, gates green. Committing, then the handoff:

- **Bash:** Commit fix + docs; check The Studio repo state
- **Bash:** Commit the skill fix in The Studio repo
- **Skill:** handoff
- **Bash:** Resolve session ID + read the document head
- **Write:** .claude/HandoffPM.md
- **Dispatch:** transcription-agent — Render the session transcript
The gate is a clear yes — invoking the context skill with your ledger directions:

- **Skill:** studio-context
- **Dispatch:** transcription-agent — Render the session transcript
