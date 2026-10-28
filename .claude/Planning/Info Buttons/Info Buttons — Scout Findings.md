### Info Buttons — Scout Findings

**DATE:** 10-27-2026

Three read-only scouts (brainstorm *Initial Investigation*), each briefed with Nathan's Approach and Principles. Claims marked ✓ were re-read against the code by the orchestrator.

#### Hover & Pane Mechanics

- ✓ The glance can't host InfoPanes: it's a Core singleton (`Core/Interface/Glance/glanceAction.ts:24-47`), gated by the Preview setting's Off rung (`glanceAction.ts:63`), its grace a user setting, its pane kept open by pointer geometry because its anchor is a CM6 node.
- `useHoverReveal` (`UIX/Interactions/hoverReveal.ts:29-157`) is the UIX owner: enter/leave driven, 1,500 ms dwell and 150 ms grace (hardcoded), a press holds off a pending open. React 19's enter/leave walks the component tree through portals, so a `PickerMenu` rendered beside the glyph counts as inside it and the pane stays open as the pointer crosses into it (`ManageRow.tsx:43-60` has the sibling shape). **To verify live.**
- ✓ On touch, a dwell reveal stays on permanently (`hoverReveal.ts:156`); an InfoButton needs that branch changed or bypassed. `reset` stays inside the hook, so nothing outside closes a dwell-opened reveal. Each `dwell` instance holds four window press listeners for its lifetime.
- No surface does hover-on-cursor, tap-on-touch today; touch policy is "rest revealed." No hover-revealed pane has a keyboard path.
- ✓ `PickerMenu focus="keep"` fits: modal (Escape closes it first), no shield (an outside press closes it and still lands), the trigger counts as inside. `modal={false}` would let Escape and presses fall through to the parent; `focus="leave"` draws a shield.
- ✓ `focus="keep"` prevents default on mousedown inside the pane (`UIX/Interactions/shared.ts:15-18`), which blocks text selection in a read-only body.
- `PickerMenu` stops pointerdown and contextmenu bubbling but not click; a click in the pane reaches a row's `onSelect` through the portal.
- Dwell mechanisms (glance, reveal, ghost, drag-disclose) are genuinely different; no new primitive is warranted. Outside this feature: the glance's hand-pushed dismissal entry exists only because a modal `PickerMenu` couples its shield to `focus`.
- Recommended: a UIX InfoButton on `useHoverReveal` + `PickerMenu focus="keep"`, open while `reveal.on || clicked`, its click toggling the held state (covers touch and Enter/Space).

#### Row Recipe & Glyph

- Every titled row ends in `MenuItem` (`UIX/Menus/MenuRows.tsx:94-164`); `MenuRowView` maps `caption` → `subLabel`.
- ✓ The secondary line carries three names renamed at three seams: `hint` (Settings `RowText`, `SettingsFieldRow`, `ManageRow`), `caption` (`MenuRow`), `subLabel` (`MenuItem`). `MenuCaption` is a fourth meaning: a centered empty-state message.
- `SettingsFieldRow` duplicates `settingsRow`'s `hint` → `caption` map; `NexusRows` already writes the bare `MenuRowView` form beside it. The four special Settings rows break `row` into `label` + `hint` props.
- ✓ `titleText` wears `overScrollEllipsis` (mask + clip), so the glyph sits beside it as a flex sibling, not inside it; precedent `.detail-title-slot-run`. No menu row places anything after its title today.
- ✓ `AccessoryButton` is the in-row icon button, but its `accessoryButton` class forces tertiary ink (`menu-row.css.ts:261`) over `Button`'s `--button-ink` — a tinted or destructive glyph would read gray. "Clear" is `base`.
- `UIX/Labels/` holds the `Label` chip; "InfoLabel" there would collide with that concept. Nathan renamed it InfoButton.
- ✓ The property row Nathan calls Key Format is labeled **Label Format** (`Core/Properties/Schema/formatRows.ts:30`); the file is `formatRows.ts`. The Aliases row is `AliasesRow` → `ManageRow` in `PropertyPanel` (`PropertyPanel.tsx:399`).
- A focusable glyph inside a `role=button` row (rows with `onSelect`) nests interactive elements; its click must stop propagation.
- Recommended: `info?: ReactNode` on `MenuItem`, passed through `MenuRow` and `ManageRow`; one Core function turns an ID into the glyph and its body; `RowText` gains `info`.

#### Markdown Body & Index

- The glance is the nearest existing shape — a dwell-opened `PickerMenu` holding a `MarkdownEditor` (`GlancePane.tsx:352,378`) — so mounting CodeMirror per open is an accepted cost; `TextPane` mounts and unmounts its editor around each open too.
- `MarkdownEditor` always runs the `page` scope (headings, lists, code); `ValueEditor` runs `text` (inline marks only). Guides with structure take `MarkdownEditor`.
- ✓ `PageReaderWindow` already mounts read-only with `useEditorHost({ connections: resolveOnly, inert: true })` (`PageReaderWindow.tsx:90`) and a non-path embed sentinel; inert turns off the glance and the format menu, web links still open. No new host is needed.
- `MarkdownEditor` fills its parent and pads for a page rail; a content-sized pane needs a max-height and padding override, as `text-pane.css` does.
- ✓ A second, React-side Markdown renderer exists for table cells and Text values (`Core/MarkdownPM/Tables/cellStatic.tsx:64`), inline marks and list lines only. It doesn't change the recommendation: guides need block rendering.
- `?raw` resolves under both electron-vite and vitest (typed through `vite/client`), unused in the tree so far. Biome doesn't format `.md`. Parsing the tagged entries once at module load ignores headings and any frontmatter that crosses the mirror.
- ✓ `npm run lint` runs `no-name-mentions.mjs --scan` over tracked files outside `.claude/`, so the index can't carry Nathan's name.
- Generating a TypeScript union of IDs (the `iconNames.mjs` precedent) adds a script and a staleness test for nothing a scan doesn't give. The citation test's precedent is the syntax-tree walk in `Core/Testing/engineGraph.ts`: every cited ID resolves, every entry is cited, IDs are unique, tags close.
- The mirror's Files row takes any `~`-anchored source; bodies sync both ways, frontmatter stays per side except the `description` and `version` Metadata keys. Pommora is its own repo, outside The Studio's auto-push, so vault edits sit uncommitted in Pommora until a session commits them; a branch switch rewrites the vault copy.
- Explanatory copy elsewhere that might cite entries later: `NexusRows` (Nexus ID, Password, Server, Pin), confirmation `detail` strings (`confirmations.ts`), `FilterFrame.tsx:520`, `pageFile.ts:169`.

#### Reconciliation

- **Hover ownership:** the Markdown scout read the glance's dwell as the only dwell and warned a UIX timer would duplicate it; the hover scout found UIX already owns one (`useHoverReveal`), and the glance can't be reached from UIX and is switched off by the Preview setting. `useHoverReveal` stands; no new dwell is written.
- **Decision 8 contradicted:** Nathan confirmed the glance's behavior; the code makes the glance unusable from UIX and couples it to Hover Previews. Raised with Nathan.

#### Fresh-Eyes Read

One reviewer given only the decision log and the codebase. What it changed in the log:

- ✓ Read-only editors keep their content selectable (`Core/MarkdownPM/readOnlySelection.test.tsx:14`), so the hover scout's claim that `focus="keep"` blocks selection in the pane is wrong; no-copy needs a rule of the pane's own.
- ✓ `auto-push.sh` never visits Pommora's repo; the commit step is one new line, not an existing behavior.
- A held pane plus a hover on another glyph opens two panes; one-at-a-time isn't free in that case.
- Changing the reveal's touch branch would change the title search hint and the ViewTile strip on touch; the InfoButton opts out instead.
- An entry written ahead of its row fails "every entry is cited," and a scheduled commit would land that failing tree.
- The work could finish with no worded entries and no visible InfoButtons; a completion gate now requires them.
- Terms the log leaned on without defining (the glance, live drives and their matrix, the review waves) and decisions that cited no reason now carry them.

