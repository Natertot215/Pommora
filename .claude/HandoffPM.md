## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** 59de0e21-fd69-4a68-b0a2-7a95d553188d
**Dates:** 08-18-2026
**Model:** Opus 5

**Populating the Settings feature.** PM-107 built the foundation settings accumulate into; the work from here is filling it. The abstract-plumbing arc closed with PM-106, and this is the pivot back to visible surface.

The session opened on four pre-work items and one framework ask. The pre-work landed first: the nexus glyph, the app accent, the interface's zoom baseline, and the File property type's icon. The nexus glyph turned out to be drawn four different ways — `square-dashed` in the ribbon and the settings header, `house` in the homepage banner and the navigation index — so the fix was one `DEFAULT_NEXUS_ICON` rather than a placeholder swap. The zoom ask was ambiguous between moving the default and rebasing the scale; rebasing was chosen, so a stated 1.0 now resolves to 0.9 host zoom through `viewScaleZoom`, and every site that sets zoom passes through it.

The framework itself was brainstormed before any code, against a full inventory of what exists to place. Fourteen rows existed across two leaves; nine categories were asked for. Three had no backing key at all, which settled the shape: build the shelves, seat the rail, redistribute what exists, and let Appearance, Properties and Automations ship empty. `CATEGORIES` and `LEAVES` were two structures keyed by the same name and collapsed into one roster; sections became named row groups so a leaf has an interior before it needs one.

Two settings joined the personalization block. `dateFormat` is a live fallback and entered at `defaultStyleFor`, which already had precedent for a default sourced from a setting rather than a constant — that single seam is why the broad reading was affordable. `timeFormat` relocated out of the settings file's top level; a compatibility read for the older spelling was built and then **removed**, because `time_format` never had a writer and the fold would have re-applied itself over the absent key the picker stores for its default. That reversal is logged in the decision log and is the session's clearest lesson.

The closing ask was a capability check: the shared window surface holding two side panes at once, widening rather than compressing. `PreviewPane` already accepted both sides — what was missing was the width rule, now `widenBy`. Verified in a browser on the real Settings shell, not asserted. **Everything here is committed at `56d3eb6a` with gates green; nothing is assumed.**

#### Completion Criteria

- [x] **The leaf roster** — one declaration carrying label, glyph, foot placement, and a body that is sections or a surface, with the mutual exclusion enforced at compile time.
- [x] **The rail seated** — nine categories in order, Trash anchored, every existing knob rehomed with no behavior change.
- [x] **`dateFormat` and `timeFormat`** — both in the personalization block, the date form reaching every unoverridden column through one resolver.
- [x] **Two-sided windows** — a pane on either edge at once, an opening side moving the window's own edge, confirmed by measurement.
- [x] **Docs reconciled** — ConfigurationPM re-scaffolded to three scopes with option tables; SymbolsPM, PropertiesPM, MarkdownPM, ViewsPM, CardViewPM, SidebarPM and InteractionPM corrected.
- [ ] **Appearance filled** — accent, connection color, default icons and the default view scale have working keys and no controls.
- [ ] **Properties and Automations answered** — both are seated and empty; neither has a backing key, and Automations has no feature behind it yet.

#### Next Session

- **Fill Appearance.** Accent and connection color need pickers, and `ColorPicker` already exists; the two placement knobs are two-value choices; the default view scale is a slider; default icons need the Icon Picker per kind. All four write through the existing `setPersonalization` — no new plumbing.
- **Decide what Properties configures.** The category is seated with nothing behind it; no personalization key is property-scoped today.
- **Shortcuts is data-ready and control-free.** `DEFAULT_COMMANDS` holds three bindings the leaf could display read-only before rebinding is designed.
- **The inspector the two-sided window now allows** — the capability shipped ahead of a consumer; nothing yet opens a right pane in Settings.
- Standing options remain: full-text search, View QuickFilter, the store split, and the debt list — see ContextPM.

#### Feedback

- "It only needs one History-Format paragraph." — the PM-107 entry is a single paragraph rather than sub-labeled strands.
- "use an actual SettingWindow example to capture proper rounding" — a demo that stands in for the real shell isn't the demonstration; the showcase leaf wears the Settings window's own class and bounds.
- "Adjust the order appropriately" — a sketch's ordering defers to the rail's actual order.
- "ViewsPM can keep its description, just not as elaborate." — tightening prose means shortening it, not replacing it with a pointer.
- "Short and simply, as minimal wording or padding as possible."

#### Session Pointers

- `Pommora/src/renderer/src/Settings/NexusSettings.tsx` — the roster. `roster()` and the `Leaf` union's `never` arms are the two type tricks; read their comments before editing either.
- `Pommora/src/shared/columnStyles.ts` — `defaultStyleFor`'s third argument is the nexus date form; its `url` arm is the precedent that shape follows.
- `Pommora/src/renderer/src/Detail/Views/Table/columnStyles.ts` — `useStyleFor`, the hook every date-rendering surface reads so the fallback is live.
- `Pommora/src/renderer/src/design-system/interactions/FloatingWindow.tsx` — `widenBy`, its center-outward growth and viewport clamp.
- `Pommora/src/renderer/src/design-system/showcase/leaves/PanesLeaf.tsx` — the two-sided case, reproducible at `npm run showcase` → Interactions → Side Panes.
- `.claude/Planning/NexusSettings Leaf Framework — Decision Log.md` — the spec, including both reversals and why they happened.
- `.claude/Features/ConfigurationPM.md` — the settings tables; a new row belongs in the leaf's table there.

#### Working Notes

- **A setting relocated into the personalization block has to take its readers with it.** Two components were left reading `tree.timeFormat`, a copy that only refreshes on a disk round-trip — which reads as a settings row that doesn't work.
- **Backward compatibility for a key that never had a writer is compatibility with nothing.** Check whether any file could carry the older spelling before folding it in; the fold costs a real defect when the new path stores its default as an absent key.
- **A "default X" setting is only meaningful once the seam it overrides is named.** The date form was affordable because `styleFor` is the single resolver every column passes through.
- **Width drags deliberately do not move the window's edge.** Dragging a pane's own strip reallocates inside the window; only an open/close transition moves the frame. A future pass could "fix" this into the wrong behavior.
- **The date-format vocabulary is still stated in four places.** `DATE_FORMAT_LABELS` now serves the column menu and Settings; `DATE_OPTIONS` in `DateTimeEditor.tsx` is the one left restating it. `TRASH_DATE_FORMATS` diverges on purpose and its comment says so — don't fold it.
- **Piping a gate through `tail` hides its failures.** `biome check` was reported clean while truncated; it was failing on two a11y errors.

#### Changes

**FILES ADDED**

- `.claude/Planning/NexusSettings Leaf Framework — Decision Log.md`
- `Pommora/src/renderer/src/design-system/showcase/leaves/PanesLeaf.tsx` · `panesLeaf.css`

**FILES MODIFIED**

- `.claude/Features/ConfigurationPM.md` · `SymbolsPM.md` · `PropertiesPM.md` · `MarkdownPM.md` · `InteractionPM.md` · `ViewsPM.md` · `CardViewPM.md` · `SidebarPM.md`
- `Pommora/src/shared/types.ts` · `columnStyles.ts` · `columnMenu.ts`
- `Pommora/src/main/readNexus.ts` · `index.ts` · `menu.ts` · `watchPatch.ts`
- `Pommora/src/renderer/src/Settings/NexusSettings.tsx` · `TrashLeaf.tsx` · `nexusSettings.css`
- `Pommora/src/renderer/src/design-system/components/PreviewPane/PreviewPane.tsx` · `interactions/FloatingWindow.tsx` · `symbols/index.tsx` · `showcase/leaves/registry.tsx`
- `Pommora/src/renderer/src/Detail/Views/Table/columnStyles.ts` · `TableView.tsx` · `Detail/Views/Cards/CardsView.tsx` · `CardPickerHost.tsx` · `Detail/Views/PropertyEditing/DatetimeValuePicker.tsx` · `Detail/Banner/Banner.tsx`
- `Pommora/src/renderer/src/Components/Detail/PropertyTypes.tsx` · `FilterPane.tsx` · `PickerControl.tsx` · `PropertiesPane.tsx` · `SettingsScaffold.tsx`
- `Pommora/src/renderer/src/Sidebar/NexusPhoto.tsx` · `treeIndex.ts`

**FILES REMOVED**

- None.

**COMMITS**

- `56d3eb6a` — feat(settings): one leaf roster, nine categories, and the Nexus's own date and clock

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
