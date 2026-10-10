## Scout 9b — The Link-Property Lane, Finished

HEAD `42a18f4a5`. Probe: `probe9b/p.ts` (`npx vite-node`). Tags: **V** read, **R** run, **I** inferred. Production `wc -l`: `connectionMenuActions.ts` 103 · `connectionMenu.ts` 122 · `cellMenu.ts` 149 · `connectionsApi.ts` 158 · `cellStatic.tsx` 486 · `LinkCell.tsx` 97 · `TextCell.tsx` 82 · `Cell.tsx` 240 · `valueClick.ts` 77 · `PropertyValueInput.tsx` 88 · `linkValue.ts` 144 · `TableView.tsx` 734 · `CardValue.tsx` 171 · `PropertyPanel.tsx` 571 · `TextPane.tsx` 183 · `propertyMenu.ts` 40 · `editorHost.tsx` (read, not shrunk).

Rulings applied: 1b.5, 1c, and 1d (resting Text values at parity with the resting table cell, system rows included, Undo/Redo out; padding edits for both value kinds; Remove Title On Link Change for every syntax; **Format hidden on Link values**, both options still costed).

---

### 1. Scout 9 Completeness

**Q-01 · What Scout 9 Settled and Still Holds.** Decode → commit → draw → cascade → index (P-01…P-22) needs nothing from 1b/1c/1d except where listed below; the verifier owns line-by-line truth. **V**

**Q-02 · Superseded by 1c: the Row Labels.** P-25 ("Both become `Rename` + `Edit Title`") is wrong under 1c: the second row reads **Edit Link** on an address and **Edit Title** on a connection. One source: `connectionMenu.ts:83-87` becomes `[{ 'Rename', 'rename' }, { ctx.external ? 'Edit Link' : 'Edit Title', 'editLink' }]`. Today's labels branch on `hasAlias` (`:84`, probe **R**: body page = `Add Title, Edit Link`; value page = `Edit Title, Edit Link`; body/value url = `Rename, Edit Link`); the alias branch is what 1b.1 deletes, and with it every `hasAlias` field (Q-08). **V/R**

**Q-03 · Superseded by 1d: P-24's Click-Intent Cut Is Taken.** P-24 called it "a product call … ≈ −9 more if taken". 1d takes it; Q-29 re-measures it at **−18** (P-24 missed the three `openWebLink` imports, the `readLink` import, and `urlClickTarget`'s body measured 5). **V**

**Q-04 · Superseded by 1d: R-14 Is Parity, Not a Decision; T-03 Resolves to Hidden.** R-14 handed the resting Text value to this lane as a choice; 1d mandates it (§4). T-03 (Format collision) resolves to option (b); the residue is §3's coherence check. **V**

**Q-05 · Left Unfinished by Scout 9.**
- **The Panel's second Text-value menu.** P-07/P-25 cover `valueMenu` (`PropertyPanel.tsx:334-348`) but not that a Text value there falls through it (`:340` returns false for non-link) to the row's `propertyMenuModel({kind:'page-value', editable})` → Edit · Clear · Remove (`:390-393`, `propertyMenu.ts:31-38`), while Table/Card use `cellMenuModel({kind:'text'})` → Edit · Clear (· Remove) (`cellMenu.ts:134-135`). Two models for one value menu. **V**
- **`TextPane`** (the live Text editor) isn't examined; §4 does it.
- **`retarget`'s fit** (P-25's "should be the one this commit calls", tagged **I**) — §5 shows it doesn't fit unchanged.
- **T-08 named `holder` only.** The inline editors (`TableView.tsx:217-222`, `CardValue.tsx:146-151`, `PropertyPanel.tsx:408-413`) also lack `connections` (S2-C's live read) and, under 1d.3, the `removeTitleOnLinkChange` setting the commit now reads (Q-21). **V**
- **The Panel's Remove.** P-07 says "Table has no Hide (`hide: null`)"; the Panel is also `hide: null` (`PropertyPanel.tsx:303`) yet has a Remove — the row menu's `value:remove` → `emptyRow(id, false)` (`:331-332`, `:315-319`, clears and un-reveals). A Link value's own menu there therefore lacks the Remove its row label offers. **V**

---

### 2. The Link Value Menu, Concretely

**Q-06 · One Builder.** Folding `tokenMenuTarget` into `linkMenuTarget` (S5-B) and taking S7-A's promise, the one builder in `connectionsApi.ts` is:

```ts
export type LinkMenuTarget = { editable: boolean; value?: { hideable: boolean } } &
  ({ kind: 'page'; page: ConnPage; heading?: string } | { kind: 'url'; url: string })

export function linkMenuTarget(target: MdTarget, editable: boolean, value?: { hideable: boolean }): LinkMenuTarget | null {
  switch (target.kind) {
    case 'page': return { kind: 'page', page: target.page, heading: target.heading, editable, value }
    case 'external': return { kind: 'url', url: target.url, editable, value }
    default: return null
  }
}
```

Callers, each with its own `MdTarget` and applier:

| Caller | Target | `editable` | `value` | Applies the answer through |
|---|---|---|---|---|
| Body (`linkClicks.ts:139-154`) | `hit.target` (already `heldTarget`, `:58`) | `!view.state.readOnly` | — | one `applyLinkAction(view, a, hit.range)` (Lane 10 R-07) |
| Resting table cell (`cellStatic.tsx:288-306`) | `tokenTarget` | `!readOnly()` (R-13) | — | `commitEdit(linkEdit(…))` (R-07) |
| Resting Text value (`TextCell`, §4) | `heldTarget(tokenTarget, own)` | `commit !== undefined` | `{ hideable }` | the same `commitEdit`; `cell:*` → the parent |
| Link value (three parents) | `valueTarget(raw, api, holder)` (P-24) | `true` | `{ hideable }` | `valueMenuIntent` → the parent's `runValueIntent` |

The `tk?.kind === 'wikiLink'` gate (`connectionsApi.ts:102`) goes with 1b.1 (B-57). `hasAlias` goes (Q-08). `surface` + `hideable` + `onCell` become the one optional `value` (Q-09). **V** (sites), **I** (shape).

**Q-07 · One Model.** `connectionMenuModel` (`connectionMenu.ts:80-122`) has two url returns (`:93-94` for cell/read-only, `:95-109` for editor) whose row *order* differs: the value puts Copy Link beside the opens, the body after the authoring rows (probe **R**: url editor `Preview, Open In Browser, Rename, Edit Link, Copy Link, Format▸, Remove Link, Delete`; url value `Preview, Open In Browser, Copy Link, Rename, Edit Link, Clear, Remove`). Under 1c ("every link's menu shares the same rows") the model is one join for both kinds:

```
opens            = external ? site rows (minus Preview when windowed) : pageOpenRows(…)
authoring        = editable ? [Rename, external ? Edit Link : Edit Title] : []
copy             = external ? [Copy Link] : [Copy Link, Copy Path]
format           = external && editable && !value ? [Format ▸] : []        // Format hidden on values (ruling)
closing          = value ? cellClosingRows(true, value.hideable) : editable ? [Remove Link, Delete] : []
joinGroups([opens, [...authoring, ...copy, ...format], closing])
```

`closingRows` (`:64-67`) folds into the `closing` line. **User-Visible:** a value's Copy Link moves after Rename/Edit Link; nothing else changes on values. **Body consequence the menu lane owns:** "same rows" gives a body *connection* Remove Link/Delete, which it lacks today (`:65` returns `[]` unless `external`; `ConnectionsPM.md:47` documents "—"). Remove Link on `[[P|a]]` keeps `a`, on `[[P]]` keeps `P` — Lane 10 R-07's `linkEdit` already writes `unescapeAlias(label)`. **V/R**

**Q-08 · 1b/1c Delete `hasAlias` From the Menu Protocol (≈ −8, New).** Labels no longer read it, and nothing else does: `connectionsApi.ts:26,33,87,108`, `connectionMenu.ts:14`, `connectionMenuActions.ts:30,49,85` (8 lines, the full production set by `git grep -n hasAlias -- Core Desktop UIX`, **R**; `aliasedToken` stays imported in `connectionsApi.ts` only if another member reads it — `:3`, only `:108` today, so the import line loses a member, ±0). S7-A's "drop the dead url `hasAlias`" (−1) is inside this −8. **V**

**Q-09 · `surface` Has One Job Left, So It Becomes `value?`.** After Q-07 `surface === 'cell'` decides only Format's absence and the closing rows. It is true exactly when `onCell`/`hideable` are set (B-70), and its name collides with a resting *table cell*, which is `'editor'` (`connectionMenuActions.ts:22`; `tokenMenuTarget` sets none, `cellStatic.tsx:458`). Scout 9 kept it renamed `'value'`; the optional `value?: { hideable }` replaces `ConnSurface` (`connectionMenu.ts:21`), the `surface`/`hideable` pair in `ConnMenuContext` (`:12,:18`) and `ConnMenuTarget` (`connectionsApi.ts:17-18`), and the two `shared` lines (`connectionMenuActions.ts:22,24`) — one concept, no finite-state string to switch on. ≈ −4. **V/I**

**Q-10 · Each Row on a Link Value.**

| Row | Today | After | Seats / Writes |
|---|---|---|---|
| Open rows (Preview · New Tab / Open) | `runPageAction` (`connectionMenuActions.ts:60`); page values only | Same, run inside the menu (S7-A); `[[#H]]` and hand-written `[x](Page)` values gain them via `valueTarget`'s `heldTarget`/`resolveMdTarget` arms (P-19) | — |
| Preview · Open In Browser (address) | `openBrowser` / `link:open` (`:35-36`) | Same, inside the menu | — |
| Copy Link / Copy Path | `:37` (url), `runPageAction` (page) | Same, inside the menu | — |
| **Rename** | `rename` → `valueMenuIntent` → `{kind:'rename'}` (`valueClick.ts:59`) → `editAs('popover')` (`TableView.tsx:154`), `open('popover')` (`CardValue.tsx:91`), `editAs('popover')` (`PropertyPanel.tsx:300`) → `PropertyValueInput alias` → `TextPicker` seeded `linkAlias(raw)` (`PropertyValueInput.tsx:56,66-75`), committing `linkValueFromRename` (`:58`; probe: `''` clears, **R**) | Unchanged | the alias popover |
| **Edit Title / Edit Link** | `editLink` → `{kind:'edit'}` (`valueClick.ts:57`) → inline `EditableInput` (`PropertyValueInput.tsx:77-87`) at `TableView.tsx:217`, `CardValue.tsx:146`, `PropertyPanel.tsx:408`; seeded `editorText` → `linkEditText` (`parseEditorValue.ts:9`), committing `linkValueFromEdit` (`:35-40`) | Label per Q-02; seed and commit per §5 | the inline `EditableInput` |
| Format ▸ | Absent (`connectionMenu.ts:93-94`) | Absent (ruling; Q-07's `!value`) | — |
| **Clear** | `cell:clear` via `onCell` → `{kind:'commit', value:null}` (`valueClick.ts:60`); Panel keeps the emptied row (`PropertyPanel.tsx:295`) | Same intent, returned by the menu's promise | parent commit |
| **Remove** | `cell:hide` → Card `onHide` (`CardValue.tsx:95`); Table/Panel `hide: null` | Card unchanged; **Panel** passes `hideable` and maps `hide: () => emptyRow(def.id, false)` (replaces `:303`'s `null`, ±0) so its value menu offers the Remove its row label already does (Q-05). Table stays without (a table hides columns, not values) | parent |

**Q-11 · What Survives at the Three Parents.** The `dt === 'link'` decision, `runValueIntent` handlers, `holdGhost` (Table, Card), `hideable` (Card; Panel per Q-10), and the generic fallback for an empty or unresolvable value (P-08) survive. Each parent's link branch becomes:

```ts
const link = dt === 'link' ? linkMenuTarget(valueTarget(raw, ctx.connections?.(), holderOf(row, ctx)), true, { hideable }) : null
if (link) { const a = await holdGhost(() => showConnectionMenu(link)); if (a) runMenuIntent(a); return }
```

`TableView.tsx:287-293` (7) and `CardValue.tsx:114-121` (8) → ≈ 4 each; `PropertyPanel.tsx:344-346` stays 3 (`.then(run)` already). `holdGhost` now awaits a real promise, which fixes B-68 (`ghostCreate.ts:144-153`). **V** (sites), **I** (Biome line breaks).

**Q-12 · What Goes.**
- `linkValueMenuTarget` whole (`connectionMenuActions.ts:74-103`, 30 incl. `LinkCellAction`) — its resolve is `valueTarget`'s, its base fields are `linkMenuTarget`'s arguments, its `apply` filter is S7-A's promise. Scout 9 kept ≈ 8 lines of it; nothing in it remains a rule.
- Its imports: `isConnCellAction`, `ConnCellAction`, `ConnEditAction` (`:4,6,7`), `isValidLink` (`:10`), `readLink` (`:11`), `resolveConnection` (`:12`) — 6.
- The `onCell` channel: `onCell` dispatch (`:38`), `ConnCellApply` (`connectionMenu.ts:24`), `isConnCellAction` (`:61-62` + blank), `onCell` field and its import (`connectionsApi.ts:19,5`) — 7.
- `surface` naming (Q-09), `hasAlias` (Q-08).
- **Narrowing:** the promise resolves a value's `rename | editLink | cell:clear | cell:hide`, but its type is the authoring union (`format:*`, `link:remove`, `link:delete` included) while `valueMenuIntent` takes `CellMenuAction` (`valueClick.ts:64`). Widen the parameter to `CellMenuAction | LinkMenuAction` over the same `Partial<Record>` table (±0 to +1): a `format:*` the value menu never offers maps to `null`, which is already the table's "not mine" answer. A surface-typed return would add an overload per surface (+3 to +4). **V/I**

**Q-13 · The Fallback (Empty or Unresolvable Value).** `cellMenuModel({kind:'link'})` reads **Edit** · Rename · Clear · Remove (`cellMenu.ts:127-131`, probe **R**). Under 1c's one label source the filled fallback should read Rename · Edit Link/Edit Title too, but a phantom value has no `MdTarget` arm to say which (R-28: the menu lane decides whether 1b's rows need a target for unresolved links). If R-28 gives unresolved links a target (`{kind:'invalid', syntax}`), the value fallback rides Q-06 and `cellMenu`'s `link` kind shrinks to the empty case (`Edit` alone, −3); otherwise it keeps its labels and is the one place they differ, stated as "no link exists to name". ±0 here; owner R-28. **V/I**

---

### 3. Format on a Link Value (Ruled: Hidden)

**Q-14 · Option (a): Format Writes a Per-Value Label.**
- **Writes:** `linkMarkdown(url, d)` (`linkValue.ts:132-134`, probe **R**): Full → `[https://www.a.com/x](https://www.a.com/x)`, Short → `[a.com](…)`, Page Title → `[a.com](…)` with `wantsTitle` until the fetch lands.
- **Lines:** show Format on values (drop Q-07's `!value`, ±0); `valueMenuIntent(action, raw)` gains a `format:` arm producing `{kind:'commit', value}` (+4); a title wait — `resolveLinkTitle` returns a promise (in-flight `Set` → `Map<string, Promise>`, `cacheSlice.ts:18,23-35`, +3), the parents await before committing with a whole-value guard (+3 to +4, one shared helper); the three parents' `runMenuIntent` become async (+0 to +3). **≈ +10 to +14.**
- **User-Visible:** the property's Format (`PropertyFrame`/`LinkEditor.tsx:54`) and the view's column Format (`columnMenu.ts:72`) stop reaching that value forever, since `linkDisplayText` returns the alias first (`linkValue.ts:112`); Full pins a label equal to the address; sort and filter move from the address to the label (`filter.ts:147-149`, `sort.ts:60-62` read `linkDisplayText`); the Rename popover opens seeded with "a.com" or the site title; the frontmatter holds `[Example Domain](https://…)`.

**Q-15 · Option (b), Ruled: Hidden.** **0 lines** — it is today's model (`connectionMenu.ts:93-94`) and the documented one (`ConnectionsPM.md:45` "Format (editor only)"). The look has two sources, both property-level and neither stored in the value: the property's `link_display` and a view column's `look` (`LinkCell.tsx:32`; the column default is the property's own, `columnStyles.ts:143-145`). The Panel shows the property's alone (`PropertyPanel.tsx:420`, `look: 'standard'` → not a link display). **V/R**

**Q-16 · Option (c): Format on a Value = the Column's Format.** The code suggests one: every other styled type's *cell* menu offers its column style from a cell right-click (`cellMenu.ts:73-84` → `styleBranch`, labeled **Format** for number and link, `columnMenu.ts:40-42`), while the link kind omits it (`:65-66`). Offering `styleBranch({type:'link', current})` on a value (Table/Card; parents already route `style:*` at `TableView.tsx:307`, `CardValue.tsx:131-132`) costs ≈ +4 (the value target carries the style context; the model adds it for `value`). **User-Visible:** Format on one value restyles the whole column in that view (as Number does today); an aliased value doesn't change (alias wins); the Panel has no column, so it's hidden there — a per-surface difference. Not recommended under the ruling; listed because the cell-menu omission (`cellMenu.ts:65-66` vs `:73-84`) is a sibling difference the ruling leaves standing. **V/I**

**Q-17 · Is "Hidden on Values" Coherent? Checked Mechanism by Mechanism.**
- **A label pinned by a past paste or Format.** A value committed from `[a.com](https://a.com)` (a body link copied after Format ▸ Short, then pasted into Edit Link) keeps `a.com` as its alias (`linkValueFromEdit` → `parsePastedLink` keeps `m[1]`, `linkValue.ts:57,61`; probe `"[y](https://b.com)" on "[x](https://a.com)"` → `[y](https://b.com)`, **R**), and `linkDisplayText` returns it before consulting any format (`:112`; probe under `link-title` → `"a.com"`, **R**). The property's Format can't reach it. The release exists and is Rename → empty → `linkValueFromRename('', raw)` writes the bare address (probe **R**). **Coherent** once the docs say a pasted label *is* the alias and Rename-to-empty clears it (`PropertiesPM.md:81` says the alias is "set through Rename" only — false for pasted labels today).
- **Page Title fetching.** Display-side only: `LinkCell` subscribes and fetches when the resolved look is Page Title and the value has no alias (`LinkCell.tsx:32-38`); nothing is committed. Hidden Format needs no title wait. **Coherent** (the hook's duplication with `WebTile` is §3.13's).
- **Resting cell / Text value vs value row sets.** A weblink in a resting table cell, a Text value, or the TextPane gets Format, and a Link value doesn't. The difference is the look's owner: prose links draw their stored label (`renderCellContent`), so Format can only mean "rewrite the label"; a Link value draws `linkDisplayText(raw, display)` from the property's settings. **Coherent**, genuine data-layer difference (1b.5's "what's appropriate to the data layer").
- **Paste As onto a value.** Unreachable: the inline field is a UIX `EditableInput` (`UIX/Fields/EditableInput.tsx`), no CodeMirror view, so neither Paste As nor the paste decision runs; a paste is literal text through `linkValueFromEdit`. A bare address pasted there stores bare (no Default Link Format label, probe `"b.com"` → `[x](https://b.com)` keeping the old alias, **R**), which is what hidden-Format wants. The literal paste of a *formatted* link is the leak that produces the pinned-label case above. **Coherent.**
- **The column Format omission** (Q-16): the one sibling difference left. Number/Select/Date cells offer their column style from a cell right-click; Link cells don't, and under the ruling Link *values* offer no Format at all. **Odd-one-out by mechanism (`cellMenu.ts:65-66`), not by ruling** — Nathan's call whether the column Format belongs on a link cell's menu.
- **Default look vs the device's Default Link Format.** A property with no `link_display` falls to the constant `DEFAULT_LINK_DISPLAY` (`properties.ts:115`, `LinkCell.tsx:32`), while every pasted body link uses the device's `defaultLinkFormat` (`devicePrefs.ts:41`). Two defaults for "how an address shows"; arguably genuine (a property is shared Nexus-wide, the device pref isn't). **I**; flagged, not a defect.
- **Retarget's weblink-into-wiki arm** writes the Default Link Format when no title exists (E-23, 1c's disclosed call). A value can't take that arm or it stores a Format label the ruling hides (§5, Q-21).

---

### 4. Resting Text Values (Parity, Mandated by 1d)

**Q-18 · Today vs the Resting Table Cell After Lane 10.**

| Right-click on… | Resting Text value today | Resting table cell after Lane 10 + 1d |
|---|---|---|
| A resolved link | Read-only link menu: opens + Copy (`TextCell.tsx:28-33` passes no `menuAt` → `readOnlyMenu`, `cellStatic.tsx:409-412`); `stopPropagation` (`:424`) also hides the value's Edit/Clear | Full menu with authoring (Rename · Edit Title/Link · Format · Remove Link · Delete), applied by the pure `linkEdit` + `commitEdit`, entering with a seat for Rename/Edit |
| Text, marks, anything else | Bubbles to the parent: Table/Card `cellMenuModel({kind:'text'})` → Edit · Clear (· Remove) (`cellMenu.ts:134-135`); Panel → row `propertyMenuModel('page-value')` → Edit · Clear · Remove (`PropertyPanel.tsx:340,390-393`) | Editor menu at rest through the same door (`host.menus.format`, R-16): Insert Link · Format ▸ (· Lists ▸ in a cell) + Cut · Copy · Paste · Paste As · Paste Without Formatting, at the click offset (R-15) |
| Phantom/ambiguous/`[[#H]]` | Bubbles (target null) | Per R-28 |

**V** (today), **I** (after, per R-07/R-15/R-16).

**Q-19 · Parity Mechanism: One Resting Door, Hoisted.** Lane 10 puts `menuAt`, `commitEdit`, the offset mapper, and the right-press claim inside `StaticCellImpl`. Parity means they live in the shared hook both resting surfaces already call — `linkGestures` (`cellStatic.tsx:397-434`), which becomes the resting door for *every* construct, taking `{ readOnly, commit(text), enter(seat), host }`. TextCell then passes:
- **`commit`:** `Cell` passes its `commit` (all three mounts supply one, `PropertyPanel.tsx:421`, `CardValue.tsx:164`, `TableView.tsx:681`; `Cell.tsx:141` doesn't forward it today) as `(t) => commit(t.trim() ? {kind:'text', value:t} : null)` — TextPane's `settled` rule (`TextPane.tsx:23,107`).
- **`enter(seat)`:** the TextPane, never the inline `EditableInput`, which edits the trimmed first line (`parseEditorValue.ts:10,15-22`) and can't hold a source seat. TextPane seats the caret at the end on mount (`TextPane.tsx:147`); it gains `seat?` threaded `onPane(anchor, seat)` → `{kind:'popover', seat}` → each parent's popover state → `PropertyValueInput` → `TextPane`.
- **`host`:** TextCell has no `EditorHost` (it reads `glanceHost` directly, `:31`). `useEditorHost` subscribes per mount (`editorHost.tsx:152-167`), too heavy for every row of a table (R-25 hot path). `buildEditorHost` reads the store at call time (`:40`), so one module-level `valueHost` built from it serves every resting value (menus.format, linkTitles, clipboard, settings).
- **Offsets:** TextCell renders each line through `renderCellContent(line, …, { base })` (`TextCell.tsx:60`) in a `.cell-text-line` span with no line attribute; R-15's mapper needs the same attribute StaticCell's lines carry (+1).
**V** (sites), **I** (shape).

**Q-20 · The Value's Destructive Rows Ride Both Doors.** Under parity TextCell claims every right-click, so Clear/Remove — today reached only by bubbling — must ride the menus TextCell pops, the same rule as the Link value (Q-06's `value?`):
- **Link door:** `linkMenuTarget(target, editable, { hideable })` → Clear · Remove on a link inside a Text value too. ±0.
- **Editor door:** the request gains `value?: { hideable }` (`Core/Actions/editorMenu.ts` schema, +1); main appends Clear (· Remove) after the system rows (`Desktop/Actions/editorMenu.ts`, +3 to +4). A renderer-composed menu (R-16's E-Popper) would avoid the Desktop rows but splits the live and resting value onto two doors.
- **Routing back:** `cell:clear` / `cell:hide` go to the parent's `runMenuIntent` through one `onValueMenu?(action)` prop on `Cell` → TextCell (+2 in `Cell`, +1 per parent).
- **What this deletes:** the `text` kind of `cellMenu` (`cellMenu.ts:24,69-70,105,134-135` ≈ −6) and the Panel's value fallthrough to the row menu for text (the `editable` flag of `page-value`, `propertyMenu.ts:9,33`, `PropertyPanel.tsx:327,330` ≈ −3; the row label keeps Clear · Remove). **"Edit"** goes from the value menu, as the resting cell has none: a left-click already edits (`valueClick.ts:45-46`).
- **Ghost:** a TextCell-popped menu isn't wrapped in the parent's `holdGhost` (Table `:302`, Card `:128` wrap the generic menu today). TextCell reads `useContext(GhostSuppress)` itself (+2), as `CardValue.tsx:63` does. **V/I**

**Q-21 · Page Title at Rest on a Text Value Has No Swap Owner.** The resting table cell's swap (F-043) goes through the page editor under Lane 10's T-A; a Text value has no page editor, and its live editor's swap dies with the pane (`sweepOnTitles.destroy`, `pendingTitle.ts:43,68-70`; R-12 keeps the view-local mechanism for Text values). One mechanism fits both rest surfaces and needs no swap: **wait, then commit once** under the whole-text guard (R-08) — `resolveLinkTitle` returns a promise (`cacheSlice.ts:18,23-35`, +3), the rest path awaits it before `commit` (+3). **User-Visible:** at rest, Format ▸ Page Title shows nothing until the fetch lands and then writes the titled link once; a failed fetch writes the short form after the failure — where the body writes the short form at once and swaps it. If Lane 10 adopts the same rest-side wait, T-A narrows to live editors (body, live cell); if not, the Text value's wait is a second title mechanism beside T-A — an odd-one-out the plan must pick. ≈ +6. **V** (sites), **I** (fit).

**Q-22 · The Live `TextPane` Is Already at Parity.** It mounts `editorBase` → `inlineSurface(getConn, 'text')` (`TextPane.tsx:117-123`, `surface.ts:43-70`): `linkPointer` with authoring (`linkClicks.ts:139-154`, the view isn't read-only), `editorMenu('text')`, `pasteLink`, `pendingTitle`. Its menu is `Insert Link · Format ▸` without Lists (`Core/Actions/editorMenu.ts:138-141`) because the text scope reads no lists (`detect.ts:497-509`) — genuine. One gap is shared with the live cell, not its own: a Page Title swap still pending when the pane closes is lost (`pendingTitle.ts:68-70`; `save` writes the short form, `TextPane.tsx:103-108`) — B-158's class. With Q-21's rest wait, the pane can forward its unsettled entries on destroy to the same wait (+3 to +4), or accept the loss. **V**

**Q-23 · Parity Arithmetic (on Top of Lane 10's Shared Costs).**

| Item | Lines |
|---|---|
| Hoist Lane 10's rest machinery into the shared hook (moved, not added) | ±0 to +3 |
| TextCell: hook options, `valueHost`, line attribute, ghost hold | +6 to +8 |
| `valueHost` in `editorHost.tsx` | +2 to +3 |
| `Cell` forwards `commit` and `onValueMenu` | +2 to +4 |
| Seat thread: `ValueIntent.popover.seat`, three parents' popover state, `PropertyValueInput`, `TextPane` | +12 to +16 |
| Value rows on the editor door (schema +1, Desktop +3-4) + parent routing (+3) | +7 to +8 |
| Rest title wait (Q-21) | +6 |
| `cellMenu` `text` kind; Panel `page-value` `editable` | −9 |
| `readOnlyMenu` + the `menuAt ?` branch (`cellStatic.tsx:409-412,421`): every caller builds through the one builder with `editable` | −5 |
| **Net** | **≈ +21 to +34** |

System rows (Cut/Copy/Paste…) ride Lane 10's door at ≈ +0 to +3 more for Text values: a value has no table payload to fill (R-23) and no Undo plumbing (out under 1d). **I.** Parity is net positive; it buys the 1d mandate and deletes two value-menu models.

---

### 5. Edit Title / Edit Link on a Value

**Q-24 · Today's Seed and Commit (Probe R).**

| Typed | On | Today |
|---|---|---|
| (seed) | `[[Old#H|a]]` / `[x](https://a.com)` | `[[Old#H|a]]` (alias shown) / `https://a.com` (alias hidden) |
| `New` (bare title) | `[[Old|a]]` | refused |
| `[[New]]` | `[[Old|a]]` | `[[New]]` (the user deleted the shown alias) |
| `https://b.com` | `[x](https://a.com)` | `[x](https://b.com)` (alias kept, `linkValue.ts:92-93`) |
| `https://b.com` | `[[Old|a]]` | `https://b.com` (alias lost) |
| `[[New]]` | `[x](https://a.com)` | `[[New]]` (alias lost) |
| `[y](https://b.com)` | `[x](https://a.com)` | `[y](https://b.com)` |

Three rules today: page→page keeps what's typed, url→url keeps the old alias always, cross-kind loses it.

**Q-25 · One Seed, One Commit.**
- **Seed:** the value's target without its label, for both kinds — `connectionText(title, undefined, heading)` or the address (P-16's rule; `linkEditText`, ±0). The page seed keeps `[[…]]`: a bare-title reader arm would read `Note: x` as a scheme (`HAS_SCHEME`, `urlPath.ts:2`; `namesPage`, `links.ts:33-34`) and isn't proposed.
- **Commit (1c + 1d.3):** read the typed text through S3-1's reader (page if resolved, refusing `status !== 'resolved'`; else address if valid; else refuse; a holder answers `''`). Shown text = the typed link's own alias, else the value's current alias **unless Remove Title On Link Change** (`personalization.ts:153`, default **on**), else none. Storage by kind (P-02): page → `connectionText`, address → `serializeLink` — never a Default Link Format label (Q-17).
- **Same target, re-typed:** when the reader's target equals the current one (e.g. `[[old]]` for `[[Old|a]]`), keep the alias whatever the setting; the field's own `text === initial` skip (`PropertyValueInput.tsx:62`) only catches an untouched field. +1.

**Q-26 · Should the Commit Call E-23's `retarget`? Only After Two Changes.** E-23 is the right single writer for "change what a link points to", but as specified it doesn't serve values:
1. **Syntax:** `retarget` keeps the container's syntax (page into markdown → `[t](P)`); a value stores pages as `[[…]]` whatever it held (P-02). For a value the container syntax is chosen by the *next* target's kind — the caller passes `{ syntax: next.kind === 'page' ? 'wiki' : 'markdown', title }`. ±0 at the call.
2. **No format label:** E-23's weblink arm writes `linkPaste(url, format, cached)` when no title exists; a value must store the bare address. `format` becomes optional (absent → `serializeLink({ url })`), +1.
3. **Title precedence:** E-23 says "`keepTitle && container.title` wins, else `next.alias`"; 1c says the pasted alias wins, else the container's unless Remove Title On Link Change. E-23 must flip to `next.alias ?? (keepTitle ? container.title : undefined)` for every caller, body included (±0; a correction to E-23, not a value-only rule).
With those, `linkValueFromEdit` (`linkValue.ts:82-95`, 14) becomes reader → refuse/clear → `retarget(...).text` (≈ 8), the setting passed in by `PropertyValueInput` (+1, `useSetting`). **≈ −5 lane-unique**, beside S3-1's `parsePastedLink` deletion (owned there). The pending-title half of `LinkPaste` is unused by values (no title is fetched at commit). **V/R** (shapes), **I** (fit).

**Q-27 · Nathan's Call: Does Edit Title Count as a "Link Change"?** Under 1d.3 one rule covers every syntax, so with the default (on) an address value renamed "Docs" loses "Docs" when Edit Link changes `https://a.com` to `https://a.com/v2` — today it keeps it unconditionally (`linkValue.ts:81,92-93`; probe **R**). The same applies to the body's Edit Link once retarget governs it. 1d ruled on syntax, not on which gesture is a change; this is user-visible on every renamed address value and needs his word.

---

### 6. Padding Click (Ruled: Text Follows, Padding Edits)

**Q-28 · Today.** *Text:* the anchor's `onClick` opens **any** non-empty address and stops propagation (`LinkCell.tsx:51-56`); a page value's anchor selects through `useSession.select` (`:83-90`). *Padding* (`.cell-text-scroll` is content-sized `inline-block`, `UIX/Table/table.css:189-193`; Card adds inner padding, `cards-view.css:119-123`) bubbles to `valueClickIntent`'s link arm (`valueClick.ts:47-52`): a valid address → `open` → `openWebLink` (`TableView.tsx:155`, `CardValue.tsx:94`, `PropertyPanel.tsx:301`); a page → `null` (nothing); `TBD`, `[x](Old)`, or empty → `edit` (probe **R**: `https://a.com` → open, `[[Old]]` → null, `[x](Old)` → edit). **V/R**

**Q-29 · One Opener.** The mechanism is TextCell's already: a click on a link follows and stops propagation (`TextCell.tsx:34-42`); anything else bubbles to `valueClickIntent` → `edit`. With P-24 the page arm *is* TextCell, and the address arm's anchor follows through `resolveFollow(valueTarget…)`, stopping propagation **only when a follow exists**, so an invalid address's text edits rather than opening (`resolveFollow` returns null for `invalid`, `linkClicks.ts:112-113`). The link arm then joins the text arm.
- `valueClick.ts`: `case 'link':` stacks on `case 'text':` (+1, −6 for `:47-52`); the `open` union member (`:18`, −1); the `readLink, urlClickTarget` import (`:6`, −1).
- Handlers: `open: ({ url }) => openWebLink(url)` ×3 (−3) and their now-unused `openWebLink` imports (`TableView.tsx:52`, `CardValue.tsx:29`, `PropertyPanel.tsx:42`; no other use in those files, `git grep`) (−3).
- `urlClickTarget` (`linkValue.ts:64-68`, −5).
- **Net −18.** **User-Visible:** a page value's padding now edits (was nothing); an address's padding edits (was open); an invalid address's text edits (was a browser open of e.g. `Old`). **V**

---

### Delta

De-overlapped against Scout 9 P-21…P-25 and the synthesis owners. **Replaces:** P-25 entirely (by Q-07…Q-12), P-24's click-intent sub-bullet (by Q-29), P-23's commit half (by Q-25/Q-26; P-23's holder threading +6 stands). P-21, P-22, P-24's renderer move stand as written.

| ID | Item | Lines | Owner / Overlap |
|---|---|---|---|
| Q-08 | `hasAlias` out of the menu protocol | −8 | new (1b/1c); S7-A's url `hasAlias` −1 is inside |
| Q-09 | `surface` + `hideable` → `value?` | ≈ −4 | new; replaces P-25's rename (±0) |
| Q-07 | One model join (two url returns + `closingRows` fold) | ≈ −5 | new |
| Q-12 | `linkValueMenuTarget` whole + imports | −36 | replaces P-25's −20; S7-A's `apply`/filter −6 inside → **−30 net of S7-A** |
| Q-12 | `onCell` channel | −7 | replaces P-25's −11 (re-measured); S7-A's `onCell` field −1 inside → **−6** |
| Q-11 | Parents' link branches (Table −3, Card −4, Panel ±0) | −7 | replaces P-25's −12 |
| Q-12 | `valueMenuIntent` widened | +0 to +1 | — |
| Q-10 | Panel Remove (`hide` handler) | ±0 | new |
| Q-14 / Q-15 / Q-16 | Format: (a) per-value label / **(b) hidden (ruled)** / (c) column Format | +10..+14 / **0** / ≈ +4 | (b) taken |
| Q-23 | Resting Text value parity | +21 to +34 | new (1d); rides Lane 10's door |
| Q-21 | Rest title wait | inside the parity row | shared with Lane 10 if it adopts the rest wait |
| Q-22 | TextPane forwards pending titles on close | +3 to +4 (optional) | B-158 owner |
| Q-25 | Same-target alias keep | +1 | new |
| Q-26 | `linkValueFromEdit` on `retarget`; `retarget` `format?` | ≈ −5, +1 | E-23 correction; S3-1 owns `parsePastedLink` |
| Q-29 | Click-intent cut | −18 | replaces P-24's −9 |
| **Menu + click (Q-07…Q-12, Q-29)** | | **≈ −84 to −85** (≈ −76 to −77 net of S7-A's inside lines: −1 −6 −1) | vs Scout 9's P-25 −39 + optional −9 |
| **This report's net (P-21, P-22, P-24's renderer move stand beside it)** | | **≈ −51 to −67**, ≈ −46 to −59 net of S7-A (menu + click −85, parity +21..+34, Q-25/Q-26 −3) | |

---

### Traps

**Q-30 · `menu={false}` Survives Parity, Widened.** A Link value drawn through TextCell (P-24) must decline *both* resting doors — the link menu (T-04) and the new editor-menu claim — or a page value's padding right-click pops Format/Paste rows over a value with no prose. The flag means "this TextCell is a whole Link value". **V** (`cellStatic.tsx:417-427`), **I.**

**Q-31 · Removing `readOnlyMenu` Needs Every Caller on the Builder.** `readOnlyMenu` (`cellStatic.tsx:409-412`) is TextCell's path today; once TextCell authors, the resting embedded page's read-only cells (`PageTile.tsx:182`) still need non-authoring menus, which `editable: !readOnly()` gives (R-13). Delete it only in the same change. **V.**

**Q-32 · The Seat Is in Source Coordinates; TextPane Gets the Full Text.** The resting TextCell shows the first line only (`UIX/Table/table.css:218-220`), but offsets are whole-text (`TextCell.tsx:60` `base`), and TextPane mounts the full value (`TextPane.tsx:59`). A seat computed on line 1 is valid in the pane; one computed against the inline field's trimmed first line would not be — `enter` must open the pane. **V.**

**Q-33 · Panel `cell:hide` Is Destructive Where Card's Isn't.** Card's Remove hides a property from the view (`CardValue.tsx:95`, `ConnectionsPM.md:48`); the Panel's Remove clears the value and un-reveals the row (`PropertyPanel.tsx:315-319,332`). Same row label, same action id, two meanings by surface — genuine (the Panel holds no view to hide from), but the menu must not be built assuming one. **V.**

**Q-34 · Remove Title On Link Change Defaults On.** Any value commit routed through 1c's rule starts dropping aliases on retarget by default (Q-27); the setting's hint reads "Pointing a connection at another page" (`Settings/frames.ts:532`), which 1d.3 widens. **V.**

**Q-35 · Retarget's Container Syntax Is Wrong for Values.** Calling E-23 unchanged stores `[x](New)` for a page retarget of `[x](https://a.com)`, breaking P-02's canonical `[[New|x]]` and everything that reads it (`frontmatterMentions`, `goneEntry`, `parkLinks`) until P-21 lands. Q-26's caller-chosen syntax is required. **V/I.**

**Q-36 · The Rest Wait Must Re-Check the Value.** A commit that awaits a title can land after the user edited the value; the whole-text guard (R-08's `live.current === text`) must wrap the commit, or the wait reverts the edit. **I.**

**Q-37 · The Editor Door Needs `stopPropagation` Without `preventDefault`.** The value-row half of Q-20 rides Chromium's `context-menu`, which any ancestor's `preventDefault` withholds (R-20). `PickerMenu`'s layer and shield call both (`stopContextBubble`, `UIX/Pickers/PickerMenu.tsx:31-37,319,330`), and a Panel can sit in a dropdown (`Pages/PageMenu.tsx:92`, `Contexts/SpaceMenu.tsx:103`). TextCell's editor-door handler must stop the React bubble (so that layer never runs) without defaulting — exactly `TextPane`'s `stopBubble` (`TextPane.tsx:21,175-177`) — while its link-door handler keeps `preventDefault` (`cellStatic.tsx:423`). Whether a resting Panel `TextCell` actually sits under a `PickerMenu` layer wasn't traced to the mount. **V** (handlers), **I** (Panel ancestry).

---

### Would Go False

**Docs:**
- `ConnectionsPM.md:43` — "Add Title / Edit Title · Edit Link | Rename · Edit Link" (Q-02).
- `ConnectionsPM.md:47` — "Close, in the editor: — " for a connection (Q-07, if the menu lane takes "same rows").
- `ConnectionsPM.md:48` — "Close, in a property cell" gains the Panel's Remove (Q-10).
- `PropertiesPM.md:81` — "A per-value alias, set through Rename" (pasted labels are aliases too, Q-17).
- `PropertiesPM.md:63` — Text values gain authoring and system menus at rest (Q-18).
- `ConfigurationPM.md:100` / `Settings/frames.ts:532` — the setting's scope (Q-34).

**Comments:**
- `valueClick.ts:1` ("a valid address opens") and `:21` ("a page link, whose own text opens it") — Q-29.
- `linkValue.ts:81` — Q-25.
- `cellStatic.tsx:396` ("read-only by default") — Q-31.
- `connectionsApi.ts:15` (`apply` closes over the span) and `:96` — Q-06.
- `connectionMenuActions.ts:20` — Q-09.
- `TextCell.tsx:14` ("opens its menu as a body link does" becomes true, rewritten for the editor door).
- `TextPane.tsx:147` (seat at end) — Q-19.

**Tests:**
- `connectionMenu.test.ts:5,15,20,24,49,71,98,112` (`surface`, `hasAlias`, Add/Edit Title labels).
- `connectionMenuActions.test.ts:8,16,106` (`linkValueMenuTarget`, `hasAlias`).
- `linkEdit.test.tsx:66,81,96,125,135`, `linkFormat.test.tsx:79,93`, `externalLink.test.tsx:129,145`, `linkEdges.test.tsx:432`, `cellLinks.test.tsx:305,319` (`hasAlias` in targets).
- `cellMenu.test.ts:110,116,171-172` (the `text` kind, Q-20).
- `propertyMenu.test.ts:20` (`page-value` `editable`).
- `valueClick.test.ts:62-68` (`open`, page `null`) and `linkValue.test.ts:13,171` (`urlClickTarget`).
- `linkValue.test.ts` `linkValueFromEdit` cases pinning url→url alias keep (Q-25/Q-27).
- `TextPane.test.tsx` and `PropertyPanel.test.tsx` wherever they pin the end-seated caret or the row menu for text values.
