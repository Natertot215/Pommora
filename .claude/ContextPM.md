## Project Pommora – Active Context

### Current Focus

The Pommora Codebase Audit is the sole focus. Its ledger, `// Planning`'s `Pommora Codebase Audit.md`, opened at `f6511401d` with 556 findings, and the batches reconciled through `f178fd768` have folded 263 of the 577 entered so far, leaving 314. Each session takes one workstream, or a coherent slice of one, in the Verdict's Readiness order, then reconciles the ledger and republishes the Dashboard at closeout.

### Immediate Work

- [ ] 
- [ ] 
- [ ] 

### Pending Focuses

- [ ] **IconSwitchToggle.** A kit toggle in `UIX/Elements/` for icons that switch face on click, drawn from a pair registry in `UIX/Symbols` that generalizes `LockGlyph`'s crossfade and is seeded with the lock, eye, pin, and show/hide pairs. It replaces the sidebar, glance, and View Tile lock buttons and `FooterLockButton`'s internals, takes in `EyeToggle` and `NavPinButton`, and moves those hand-rolled buttons onto `Button`; callers supply the label and cursor. It follows the Hover Reveal plan and consumes its reveal recipe.

#### II. Open Calls

Findings where the correct answer isn't established in the codebase — design and product decisions, not cleanup. Each is cheap once it's decided.

- [ ] **`cursor: default` versus `cursor: pointer` has no rule** — roughly twenty sites each, design-system components consistently on `default` and feature surfaces mixed. Pick one convention for clickable non-link controls and the sweep is mechanical.
- [ ] **Where does the floating identity label live?** Embed tiles reveal crumbs or a webpage title on hover, the Web Window shows domain › title always, the Page Window a trail in its tab strip; one design-system element or NavTrail absorbing the webpage case.
- [ ] **Escape follows open order, not focus.** The dismissal stack pushes on open and never re-inserts, so raising a floating window on click (Escape then closing the focused window) needs an open-sequence number on each entry; the same machinery would keep a pinned glance's entry in place across a tab round-trip, where today it remounts on top of a window opened after it.

#### II. Next-Feature Candidates

- [ ] **A Database window:** a read-only view of `nexus.db`, table by table with row counts, reached from Settings › Nexus.
- [ ] **View QuickFilter:** A dropdown or toggle that holds single-property filtering options; the recently added ActionBand would be its natural placement for tile embeds, and the Subfield is an initial idea for where this could be placed in full-detail views.
- [ ] **Auto-Linter:** A MarkdownPM, nexus-level-configurable auto-linter that could place its action button in the subfield, or an approved command combination.
- [ ] **A Shortcuts settings pane** over the one chord table in `Core/Actions/commands.ts`. It needs a named-key map (`toAccelerator` and `toKeyBinding` capitalize a key's first character only, so `arrowup` would reach Electron as `Arrowup`), a rule for two ids bound to one chord, and a `refreshMenu()` on a commands change if the menu bar is to pick up a rebind before the next adopt or launch.
- [ ] **TokenField — a typed value becomes a Label:** an InputField holding a run of labels beside a bare caret, where Enter turns the draft into a segment resolved against the field's picker (a Set title into an EntityIcon segment, a free string into a PlainLabel) and Backspace on an empty caret removes the last. The pieces exist apart — `EditableInput` names an option chip in place, `SegmentRun` holds a field's values, the Filter pane's Location run is pick-only — and the showcase's capped field already sketches the shape. Its consumers are every location-shaped input: the Location filter, file properties, Context assignment.
- [ ] **Per-tab Subfield `crumbDepth`**, if cross-tab tail memory is ever wanted. It resets on tab switch today (correct, no leak); a per-tab field would let each tab remember its own dimmed tail across switches — a feature, not a fix.

### Important Information

- **A personalization key has to take its readers with it.** A surface left reading the tree's copy of a setting sees a value that only refreshes on a disk round-trip, which presents as a settings row that doesn't work — the store slice is what updates live.
- **A whole-surface drag handle steals its own children's clicks.** The gesture captures the pointer once a drag activates, so an interactive descendant that must not lift stops pointerdown — a container only on its own empty space, so the title still drags.
- **A write built on a failed parse must refuse, and `rmwJsonStrict` is that refusal.** The config readers stay lenient — a malformed file reads as empty — but every read-modify-write goes through the strict primitive, which fails the operation on an unparseable file rather than rewriting it holding only the toggled key; only a genuinely absent file starts from a seed.
- **A repair that fires with no user gesture may only canonicalize shape.** The write-path reconcile deletes what it cannot decode because the user's own edit earned it; a sweep reusing it inherits that deletion and must strip it back to shape — the on-open sweep leaves an undecodable value as written.
- **A live push's write leg is a per-writer obligation.** The watcher drops main's own writes as echoes, so every frontmatter writer notes its page or an open view goes stale; a new writer that skips `noteValueWrite` fails silently.
- **Focus at press time is read on the capture phase.** CodeMirror focuses its own content inside the native mousedown, so a bubbling handler asking "who had focus before this press" already sees the editor.
- **One shared timer under several pointer handlers turns every defensive pre-gate cancel into a killer** of the one that armed; when a dwell is hoisted, audit the cancels rather than the arms.
- **Two rules any future in-app window must respect**, both learned on the WindowBase: openness drivers stay declared per-window, and a FLIP measures from the surface root via a real ref rather than by walking `parentElement`.

#### II. Debt & Ride-Alongs

Known shortcuts, none broken today. Each is cheap on its own and best taken when its owning file is next touched — or swept together as one batch session.

- [ ] **Fire-and-forget writes have no seam.** The persisted-chrome family — `editorPrefs:set`, `viewOrders.set`, `personalization.set`, `devicePrefs.save`, `tiles.writeMarkdown`, the alias memory's `setPageMeta`, `nav.write`, `tabs.save` and the rest — is called as `void window.nexus.x(…)` at fifteen sites with the failure discarded. Silence is the accepted policy for this class (ruled 08-21-2026); one `persist()` helper wraps the family and states the ruling once, so a change to the policy has one site.
- [ ] **The remaining style rows.** the thirty plain `.css` sheets on ordinary React components migrate to `.css.ts` as each is next opened, the three loading globally from `Desktop/Renderer/main.tsx` first; the six static `style={{…}}` sites (`TileLab.tsx` ×2, `PickerMenu.tsx`, `PropertyPicker.tsx`, `Core/Views/Table/TableView.tsx`, `CardAddPicker.tsx`) and the `{ minWidth: 96, height: 24 }` pair in `PropertyPicker` and `CardAddPicker` become classes; the two `subLabel` exports at 13px and 11px want one decision; `band` names three unrelated things across Tiles, the Views, and the toolbar.
- [ ] **A value edited outside the app doesn’t live-refresh an open table.**
- [ ] **A moved tab rebuilds cold.** A tab dropped into the other row starts with fresh history and no warm editor state; the two rows' warm caches are separate, and carrying one across is a decision about what a tab's identity includes.
- [ ] **Scroll waits by timer, and the signal can't simply replace it.** `travel.ts` sleeps `FOLD_SETTLE_MS` for a fold animation's duration; folding's completion signal (`transitionend` → the fold entry dropping) only fires for widgets CM6 has rendered, and an outline jump's target fold is usually off-screen — waiting on it would deadlock travel against render. Retiring the timer means deciding to open off-screen folds without animation first.

### Known Issues

- [ ] **A re-aimed tile resets its height and scale.** → See `Pommora Codebase Audit.md`, F-567.
- [ ] **A second dropdown pressed inside a pop-up pane reopens the closing list there.** → See `Pommora Codebase Audit.md`, F-568.

### Recent Work

#### PM-145 || Metadata & Page Locking
**DATE:** 09-23-2026

Per-page state moved out of the per-device database and page frontmatter into synced monthly metadata files under `.nexus/metadata/`, which hold entries only for pages with something set. A page's icon, aliases, and header-icon choice now travel with the Nexus and merge between devices per page and per field, and setting an icon no longer touches the page file. Show Icon In Title became a Nexus-wide switch with per-page overrides, and a Space's glyph moved to `$icon`. Page Lock was deferred to a placeholder at the head of the page menu's footer.

#### PM-144 || View Search
**DATE:** 09-22-2026 → 09-23

Every Collection, Set, and Sub-Set view gained a search in its in-line title, narrowing the view's own rows by fuzzy title match while keeping its filter, grouping, and order. The search belongs to its tab for the session and clears when the tab shows anything else. It opens from a hint beside the title, a title click, the title and banner menus' Search row, or ⌘F, and row and band drag stand down while it's active.

#### PM-143 || Space Windows
**DATE:** 09-21-2026

Spaces joined Pages in the floating window, and the Page Window and NavWindow now share one tab system. Each Space's tile board is held once and shared by every place it appears, boards narrower than 488px collapse into a single column, and board locking moved into one shared control. Two settings give a windowed Page and a windowed Space their banners.

#### PM-142 || Space Links
**DATE:** 09-21-2026

Spaces gained links to other Spaces and values for any registry property, written to their sidecars through one sidecar writer. A link is stored on both Spaces' sidecars and draws one line in the Matrix, whose filter now reaches Spaces. The Properties panel serves a page's dropdown, a Space's dropdown, and the side pane on one row rule, with **Spaces ▸** and **Properties ▸** branches reaching the same edits from menus, and property and Context cascades now reach Space sidecars.

#### PM-141 || MatrixPM Foundations
**DATE:** 09-19-2026

The Matrix opened as Pommora's graph view, drawn to the app's first canvas by a React-free physics engine that sleeps by energy and wakes locally for what changed. Its graph reads the content index's relationship rows directly, its configuration travels with the Nexus in `.nexus/matrix.json`, and its layout and viewport stay per machine. It is a selection kind across the shell and a third floating window kind on ⌘⇧M, and its nodes answer menus, renames, previews, and icon choices as sidebar rows do.

### Guidelines

- Restate rather than amend. A fixed item is deleted, and a changed fact is rewritten as currently true; a `(resolved)` tag leaves a false line standing.
- Recent Work holds five entries under their History headings, and a sixth drops the oldest rather than accumulating.
- Sections that aren't described in `Context-Format.md` shouldn't be removed — they're intentional and will resolve themselves when appropriate. 
- Nathan also writes into §Pending Focuses, §Important Information, and §Known Issues directly; leave what's clearly written by him and consider his own writing style as something to lean towards rather than fight against. 
- A section with nothing to say stays empty.
