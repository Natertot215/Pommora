# Code findings surfaced by the doc sweep (verify each before acting)

## From Contexts.md agent
- mutate.ts:235-237 — generic `rename` of a context/space routes to bare renameFolderEntity,
  skipping renameContextOp/renameSpaceOp + the journal. Renderer uses the dedicated ops, so
  latent; a second caller would corrupt membership. VERIFY.
- contextWrite.ts — dangling doc comment "Set a Context's singular label in the registry."
  with no function beneath it.
- shared/contexts.ts:8-9, contextIdentity.ts:12 — comments say user Context "has none until
  per-Context singular editing ships"; ruled rule makes TITLE the key.
- contextWrite.ts:232-233 — comment claims singular "defaults to the title"; line 252 writes none.
- Sidebar.tsx:519 — advertises a "Settings" item the native menu doesn't build.

## From Architecture.md agent
- shared/schemas.ts:61-63 — asserts views/banner are depth-1 only; readSet reads them at every depth.
- main/adopt.ts:96-99 — cites `React/.claude/Features/Architecture.md § "Agenda discrimination"`:
  wrong folder, wrong nesting, section no longer exists.
- trashMode is live in main (routes deletes to OS trash) but has NO renderer writer — hand-edited
  in pommora.json, undocumented.

## From Sidebar.md agent
- Sidebar.tsx:736-745 — exit overlay keys on exit.epoch and calls layerFor(exit.mode), remounting
  AgendaMode: leaving Agenda paints "No tasks or events" over the outgoing list for the whole
  sweep AND fires a redundant agenda:list. Collections/Contexts immune (render from tree prop).
  LIVE BUG.
- Sidebar.css:311-314 — raw `0.12s ease` on .section-add, 12 lines from the correct
  --duration-fast pattern at :221-225. Also .section-add is STRANDED: SectionHeader.onAdd
  has no caller.
- ENTITY_ICON_KINDS still ships area/topic/project; Ribbon.tsx:48 is the sole live reader of
  'area' (resolves the Contexts tab), while Sidebar.tsx:526 uses 'space' for group headers.
  Identical today, divergent the moment either is overridden.

## From Typography.md agent
- segmented.css.ts:69-71 — composes text.control.standard then overrides fontWeight: 500.
  500 IS font.weight.emphasized, so text.control.emphasized gives the same result with no
  literal. Matches audit code-finding #39.
- DesignPM.md:54 — "(Also in `Typography.md`.)" pointer now dangles (dup section removed).
  DesignPM agent ran concurrently; re-check after.

## From Properties.md agent
- shared/properties.ts:157 — comment cites "Properties.md § 'Status property type → Default
  seed'", a subsection that does not exist and never did.
- Inspector.md still claims properties "live with the content" and points at an unbuilt panel;
  needs the same correction as Properties.md (DesignPM+Inspector agent may or may not catch it).

## From Agenda.md agent
- deleteAgendaItem hardcodes trashWithTimestamp, ignoring the user's trashMode setting.
  Harmless today (test-only callers); becomes a live bug the moment the write path is wired.
- Building the agenda built-in Status is NOT a one-line seed: validateDefinition
  (main/properties/schema.ts:64) rejects any reserved id at add-time, so addAgendaProperty
  would refuse `_status`. Needs a seed path past the validator AND a guard in deleteProp.

## From Icons.md agent
- src/renderer/src/design-system/symbols/Symbols.md is the registry's OWN mirror doc and is
  stale — outside the feature-doc sweep scope. Line 17 still says "Context tiers (Area/Topic/
  Project)"; line 19 assigns circle-dashed to Status (actually progress-check); line 44 gives
  link-2 a "Context/Relation property type" that doesn't exist. NEEDS ITS OWN FIX.
- shared/types.ts:92-99 — ENTITY_ICON_KINDS still ships area/topic/project, all seeded to
  layout-grid. Live in the personalization contract. (Nathan ruled: 'area' shouldn't be there.)
- Icon Picker collision UNRESOLVED (Nathan: no decision yet): the picker cell draws from
  ALL_ICONS (IconPicker.tsx:222) while Icon resolves curated-first (symbols/index.tsx:215),
  so picking Lucide's Table or Lock renders Pommora's glyph instead.

## From SurfacePM.md agent (all code COMMENTS contradicting verified behavior)
- HomepageView.tsx:8-12 — still calls homepage.json "the G-12 dev host; removable" (plan-task id).
- shared/blocks.ts:131-133 — claims view tiles "don't surface Scale yet"; the Scale row is ungated.
- surfacepm.css:183 + shared/blocks.ts:71-72 — still promise a locked host pins borderless hidden;
  no lock condition exists in the CSS.
- surfacepm.css:281-290 — claims a locked tile keeps Duplicate/Link reachable, but
  BlockHandleMenu.tsx:207-208 dims every mutating row.
- accentOutline is a DEAD declaration chain (only the page-embed title field wears the accent tint).

## From TableView.md agent
- columnWidths.ts:17-19 — comment says "Max is UNCAPPED for every type (Nathan)" three lines
  above a table where ELEVEN types carry finite maxes. Directly contradicts Nathan's ruling
  that the caps are purposeful. MUST be rewritten.
- TableView.tsx:1466 — resize back-solves the zoom factor via
  cell.getBoundingClientRect().width / width — the exact anti-pattern :1099-1101 names.
  One resolvedZoom(gridEl) would close it.
- Stale comments: table-tokens.css:3 (no-raw-values, false); shared/views.ts:141-144 (render
  wiring "a follow-up" — landed) and :151-153 ("drives a class on the table root" — no such
  class); shared/columnMenu.ts:54-56 ("their chips always render pill" — squared label).
- DELETED Known Issue that had no code path: "structural-group members lose nesting indent
  once a row precedes them" — padLeft applies to every member.

## From Connections.md agent
- **REAL BUG (data corruption):** the rename cascade rewrites [[links]] INSIDE code fences.
  Editor excludes bracketed titles in code three ways (tokens/index.ts:123,153;
  decorations.ts:173) but main/connections/scan.ts and rewrite.ts have NO code masking.
  A page documenting [[Old Title]] in a fenced block gets its code sample silently mutated
  on an unrelated rename, and indexes a phantom edge. Fix = hoist the code mask into the
  shared layer.
- The alias ruling is unimplemented and FOUR sites disagree: shared/connections.ts:32 drops
  the tail; cellStatic.tsx:38-40 renders it as plain text; subfieldStats.ts:16 prefers it as
  display text; rewriteConnections destroys it on any rename.

## From Pages/PageSets agent
- mutate.ts:71 — comment asserts "both builds heal parent_id from it"; the React build does
  NOT heal on a move (moveFolderEntity is a bare rename). Comment is false in source.
- OPEN QUESTION (Nathan): Sub-Set openability. Sidebar says expand-only; search, Back-nav and
  DetailPane all open a Sub-Set as a full container view. Scope.ts's comment shows knowing
  tolerance. Three routes: close the hole in nav/resolve indexes, resolve a Sub-Set hit to its
  depth-1 ancestor, or ratify current behavior.

## CODE-TREE DOCS needing their own pass (no feature-doc agent could write to these)
- src/renderer/src/design-system/symbols/Symbols.md — line 17 "Context tiers (Area/Topic/
  Project)"; line 19 circle-dashed for Status (actually progress-check); line 44 link-2 as a
  "Context/Relation property type" that doesn't exist.
- src/renderer/src/design-system/components/README.md — states the one-folder-per-component
  rule absolutely (Nathan ruled it DEFERRED intent, not a held rule), and claims an index.ts
  barrel plus an `@/design` alias that DO NOT EXIST.

## From Structure/Configuration agent
- shared/types.ts:92-98 — ENTITY_ICON_KINDS still ships dead topic/project members.
- main/adopt.ts:96-99 — DEFERRED note calls the agenda discriminator open; Nathan ruled the
  extension IS the decision. Its doc cross-reference also points at a non-existent path.

## From DesignPM/Inspector/QuickCapture agent
- Deleted an unflagged color line ("fills heaviest, strokes lighter, text-washes lightest") —
  token opacities contradict it (separators sit above the top fill step). ASK NATHAN if that
  ordering is real intent expressed another way.

## RULED BY NATHAN (07-27): modified_at triggers
Rule: a page's modified_at updates on — property VALUE change, text change,
location change, rename. Schema-level property edits (definition rename/type
change) must NOT touch member pages' modified times.

Verified against code:
- text change  → OK (crud/page.ts updatePageBody writes modified_at)
- rename       → OK (crud/page.ts renamePage writes modified_at)
- MOVE         → **GAP**: movePage is a bare rename(); nothing writes modified_at
- PROPERTY VAL → **GAP**: mutate.ts case 'setProperty' merges only
                 { properties } with governed keys ['properties'] — no modified_at.
                 Note crud/pageValue.ts DOES write it, so the two value paths diverge.
Fix both; make setProperty match pageValue's governed-key shape.

## FILTER — Nathan's two reports are ONE problem (07-27)

Live nexus has exactly two saved filters, and both correctly filter nothing:
- Studio/_pagecollection.json → Table: filter_enabled: FALSE, and its only rule is
  {op:"is_not", property_id:"_location"} with NO value → unauthored, abstains.
- Ideas/_pagecollection.json → Table: {match:"any", rules:[]} → no rules.

Root causes (both UX, evaluator is correct):
1. The on/off switch is an independent axis (FilterPane:544). Authoring rules while
   it is OFF does nothing and gives NO signal. -> "filtering doesn't work".
2. A half-authored rule (property+op, no operand) persists and silently abstains.
   The last row carries NO clear-x (FilterPane:806 `rows.length > 1`), so that
   half-authored rule is STUCK with no way out. The comment at :804 even says
   "Clearing its operand is the way out" — but there is no affordance to do it.

RULED FIX (Nathan): the first/only row gets an x. Clicking it clears the assigned
filtering but KEEPS the input fields.
Implementation: delete the `rows.length > 1` gate at FilterPane:806. removeRow on
the last row yields rows=[] -> `lead = rows.length === 0` (:824) renders the blank
draft row with full input slots. Exactly the ruled behaviour, one line.
Also update the now-false comments at :804 and :821-823.

OPEN (needs Nathan): should the switch auto-enable when a rule is authored, or
show that it's off? Currently silent.

## THE ACTUAL FILTER BUG (confirmed 07-27) — empty structural bands persist

pipeline/group.ts:269 `const groups = setTree.map(build)` — structural bands come
from the SET TREE, not from surviving rows. build() emits a band per node and
recurses every child, items: bySet.get(node.id) ?? [].

=> A filter that removes every row in a Set STILL renders that Set's band, and
   every sub-folder under it. Table looks unchanged => "filtering doesn't work".
   Reproduced on the real nexus: bandsUnfiltered=4, bandsFiltered=4, all empty.

The evaluator is CORRECT (verified: 104 rows -> title-is=1, contains-a=70).
The result simply never reaches the render.

RULED (Nathan): filtering should hide group-bands, including sub-folders whose
whole subtree is filtered out.

FIX: in structural() (and structuralFlat / structuralSubGrouped / locationFlat as
applicable), drop a band whose own items AND whose entire descendant subtree have
no surviving rows — when a filter is active. An empty Set with NO filter must
still show (you want to see your folders).
Careful: prune bottom-up so a parent with only empty children also drops.

NOT auto-enabling the filter switch on rule authoring (Nathan ruled).

## FILTER PANE — overflow scroll never wired (confirmed 07-27)
filterPane.css.ts `cellField` sets overflow:hidden + whiteSpace:nowrap and nothing
else. FilterPane.tsx/filterPane.css.ts reference NO truncateHoverScroll, no
OverflowScroll, no slideScrollBack. So a long value is simply clipped.

NOT a hover-x conflict: removeButton is "always shown, and in flow so it can never
sit over the value field" (its own comment, verified in the style — flex 0 0 auto,
marginRight only).

FIX (DRY): consume the shared hover-scroll primitive the design system already
owns (typography.css.ts truncateHoverScroll — chips, menu/sidebar rows,
OverflowScroll all use it) on cellField/valueField. Do not hand-roll a parallel.

## FILTER PANE — first-row x (Nathan ruled)
Delete the `rows.length > 1` gate at FilterPane.tsx:806 so the only row carries an
x. removeRow on the last row -> rows=[] -> lead row (:824) renders blank inputs.
Update the now-false comments at :804 and :821-823.
Do NOT auto-enable filter_enabled on rule authoring (Nathan ruled).
