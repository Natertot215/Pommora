## Pommora Monorepo — Findings Q&A

Each item states an audit finding, its citation, and what Claude does if you say nothing. Answer on the `>` line under it; a blank line means the default stands.
Only findings where your knowledge of how the app looks or behaves could change the outcome are here — plumbing, resolvers, caches, and imports are not asked about.

---

## Phase 3 — Filing inside the domains

### Task 10

1. **Page Property Rows, Two Filters.** `PageProperties` keeps every Context row visible until "set aside" while `PagePanel` shows only assigned rows (A14 §2d, `PageWindow.tsx:285-288`); default: keep both behaviors behind the `variant` prop rather than picking one.

> keep both behind a CLEANLY named variant

2. **Two Property Stylesheets.** The main-pane rows use `page-properties.css.ts` (39 rules) and the window panel uses `.page-window-insp-*` in `page-window.css` (63 rules); default: one sheet, the vanilla-extract one wins, so the panel's paddings and widths converge on the main pane's.

> One sheet only. But the window's pane and the padding on the panel itself should remain unchanged

3. **The Inspector Column Is Shared With History.** `.page-window-insp` is reused by `PageHistoryWindow.tsx:136` as its snapshot-list column (A14 §6, `page-window.css:25`); default: rename it `.window-right-column` and let both keep the same metrics.

> it should both just be the window-panel. Same thing as the component itself is called; no seperate names here.

4. **View Delete, Two Rules.** `ViewFrame.tsx:107` allows deleting any view when more than one exists; `ViewItemMenu.tsx:23` additionally refuses the default view (A12 §4); default: the stricter rule, so the default view can never be deleted.

> ViewFrame.tsx is the correct one -- kill the other.

5. **Recents Reorder, Two Writers.** NavView's list mode reorders through `setRecentsOrder` and its gallery mode falls through to the store's `reorderRecent` (A16 §4C); default: one writer, `setRecentsOrder`, so both modes reorder identically.

> setRecentsOrder; reorderRecent can be removed

6. **Errors: Native Box or In-App Label.** Fifteen renderer sites raise a native macOS message box through `showError`, four post the in-app `notifyError` label (A14 §4); default: leave both as they are.

> leave both as they are; in a final report of the plan keep a list about outstanding tasks. This question can go into ContextPM open questions

7. **Disabled Controls That Display.** `ViewFrame.tsx:143-150` renders a disabled "More", `PageMenu.tsx:83-87` a disabled "Lock", `HiddenFrame.tsx:58-65` a disabled eye on the Title row (A12 §5); default: leave all three.

> Leave as is, one-line //PLACEHOLDER comment.

8. **`empty_placement` Is Written But Never Read.** The Group frame mirrors `ungrouped_placement` into `group.empty_placement` in every saved view's JSON and nothing reads it back (A12 §6, `shared/views.ts:91,232`); default: stop writing it, leave existing files alone.

>empty placement is for a grouped view. If one existing thing already solves this, collapse the dupes.

9. **Two Tab Strips, Two Copies of the Close Animation.** `WindowTabStrip.tsx:53-79` is a verbatim twin of `TabBar.tsx:87-114` including its own `EXIT_MS` (A14 §4); default: one hook, so window tabs and toolbar tabs close on the same timing.

> One TabBar definition. TabClose or something like that. 

10. **Slide and Morph Twins.** `PageWindow` and `ContentView` each define a 14px slide, and `PageWindow`'s engulf FLIP and `NavWindow`'s morph FLIP are the same math inverted (A14 §4); default: one helper at 14px, directions kept per surface.

>Keep the same for now. 

11. **Warm Caches, Four Policies.** Tile bodies are cached unbounded, glance caps at 8, tab cache at 50, window cache clears on close (A14 §4); default: one factory, tiles capped at 50.

> Glance moves to 10. Different policies are intentional.

12. **The Iteration Window Ships in the Build.** `Utilities/iteration-window.tsx` mounts unconditionally and ⌘⇧T is hardcoded outside the command table (A16 §6, `App.tsx:184,279`); default: gate the mount behind a dev build, keep the chord in dev.

> No. Keep as is

13. **Naming You Will See in the Tree.** `Settings/IconPicker.tsx` exports `IconPicker`, the same name as the UIX component it wraps; `Properties/resolveContext.ts` is a render bag unrelated to `shared/contextResolve.ts` (A20 §1, A14 §6); default: `NexusIconPicker` and `viewResolveContext`.
>Thats incredibly stupid. IconPicker needs to be the component where IconValue or IconChoice becomes something that decides the icon. This way the picker can live in UIX/ like it always should

14. **Card Primitive Leaves the App Layer.** `Cards/Card.tsx` is the eight-part primitive both `CardsView` and `NavGallery` render (A11 §2); default: it becomes `UIX/Elements/Card` and the Cards *view* keeps its own folder.

> UIX/Cards

15. **The Subfield Order Knob Has No UI.** `subfieldOrder` round-trips to disk and is read by `Subfield.tsx:24`, but nothing in the app has ever written it (A16 §1, §2); default: keep the key and the disk round-trip, delete the unreachable store action.

> Kill it all, everything relating to it. It's something we can do later. 

### Task 11

16. **The Editor's New Folder Names.** MarkdownPM re-nests as `Model/ Input/ Render/ Guards/ Gestures/ Links/ Citations/ Embeds/ Widgets/ Menus/ Tables/ Autocomplete/` with `MarkdownEditor.tsx` at the root (A09 §6); default: those names as listed.

> Agreed -- if Model can be turned into something like "Core" or "Engine" that would be preffered. Renderer/ as-in if its about how it looks can stay root alongside the stlyes. I prefer all Core/Domain folders to have stylesheets at the root. So markdown-pm.css would replace Styles.

17. **The Web Tile Is Not a Tile Kind.** `Tiles/Surfaces/WebTile.tsx` is absent from `TILE_SURFACES` and its only mount is the editor's embed widget (A14 §2b); default: it stays in `Core/Tiles/Surfaces` beside the real kinds rather than moving into the editor's Embeds.

> Stays -- it's a deliberate choice. ONE LINE COMMENT is all thats needed to add there to make sure a future agent doesnt flag it. Its a tile that just lacks a tile-detail-surface creation method.

18. **The `↔` Glyph Gets Its Own Document Scan.** A whole-document regex pass per version exists to apply `scaleX(1.5)` to one arrow character (A10 M13, `Styles.css:400-405`); default: keep the look, move it into the token layer.

> one-liner dual-direction-arrow{ in markdown-pm.css

### Task 12

19. **Slider vs DualSwitch Knob.** A08 §4.15 says the two knob fills were documented as one shape but are 26×18 r9 vs 21×14 r7; default: leave both.

> Keep seperate, fix the documentation.

20. **Two Named Snap Curves.** `animations.css.ts:5 BLOOM` is `cubic-bezier(0.30,0.75,0,1)` and sits beside `easing.baseSnap` `cubic-bezier(0.22,1,0.36,1)`, declared "not a token" (A08 §4.7d); default: both survive in Animations under their own names, nothing merges.

>baseSnap survives, cleanup the duplicate if it exists. BLOOM is the cannonical animation

21. **Overscroll Settles 40ms Slower.** `OverScroll.tsx:87` falls back to 240ms where the token says 280ms, and its `(1-p)**3` claims to match `--ease-base`, which is plain `ease` (A08 §4.7b); default: read the token, so the rubber-band settle lengthens.

> Read --eaes-base. If its close enough, its close enough -- take that as the mandate when looking at ALL animation work here.

22. **Autoscroll Mirrors a Retired Curve.** `autoscroll.ts:235`'s `easeOutQuint` says it mirrors an "out" easing token that no longer exists (A08 §4.7c); default: keep the curve exactly as it feels today and delete only the false claim.

> Tie it to another token.

23. **Menu Row Density.** `menuCompact` has one consumer, the pickers, expressed through three root vars for two literals (6px vs 4px padding) (A08 §2.2); default: collapse to the two literals; pickers keep their tighter rows.

> keep the variations. Just make sure both can be used at the source and are exported to a high-level positon without dupliacte branches.

24. **The Curated Icon Registry.** Its tree-shaking rationale is void because `allSymbols.ts` imports every Lucide icon anyway, three surfaces already bypass it, and six entries have no reader at all (A08 §4.2, §1.1); default: keep the registry and the `IconName` type, drop the six unread entries.

>Drop the unread entries; allSymbols reads Lucide + imported tabler ones as we need.

25. **Tabler Ships Whole for 23 Glyphs.** `fileTypes.ts:6,58` namespace-imports Tabler with a computed key (A08 §4.4); default: 23 named imports, the same glyphs on screen.

> Tabler should be enumerated where needed; Lucide ships whole.

26. **Typography Mints 26 Unused Classes.** All twelve `title*` weight combos and fourteen others are emitted and unread (A08 §1.16); default: stop minting the unused weights; the raw `font.scale.title*` values stay.
>title-weight can be gone. Weight exists as a per-style and as needed. 

27. **Duplicate Size Names.** The icon step `callout: 12` equals `control: 12` and `footnote: 10` equals `subline: 10` (A08 §4.14, §1.17); default: drop the unused `callout` icon step, keep both font-scale names.

>footnote + control for the icons; typography stays the same. Keep both font names and repoint the icons.

28. **Two Menu Chassis.** `MenuDropdown`/`MenuSurface` (CSS-anchored, beaked) and `PickerMenu` (portalled, measured, Bloom, shield) both mean "pane under a trigger", and PickerMenu carries an unreachable copy of the CSS anchoring (A08 §4.11); default: keep both chassis, delete the dead branch only.

> Only true dead branches. MenuDropdown and MenuSurface are deliberate. Surface is the square panel, dropdown is the beakeed thing. PickerMenu comes from MenuSurface. MenuSurface = A menu on a glass-surface without the notch; menuDropdown = the notched version

29. **Design-System Variants With No Caller.** `Button type="solid"`, `Segmented.outline`, `InputField.outline`, and the `solid` tint step have zero callers (A08 §1.9-1.11, §1.15); default: remove them.

> Keep them. Solid button is intended to be used; solid tint is required for the tints to actually work.

30. **Pane Widths Persist Differently.** Sidebar and inspector widths save to `localStorage` while every sibling chrome preference goes to `nexus.db` (A16 §5F, A20 §3.9); default: leave them in `localStorage` — moving them adds an IPC round trip per drag frame.

> Keep as is

---

## Phase 4 — The two layers

### Task 13

31. **Right-Click Menus Stop Being Native.** Today 24 menus pop as real macOS menus regardless of the `nativeMenus` preference, which defaults off and is honored by only two surfaces (A05 §3, `Actions/nativeMenus.ts:8-10`); default per the plan: the in-app pane becomes the desktop default and native becomes the opt-in.

> No. Right-click menues besides the two ones stay. Keep native <> pommora menues as is. 

32. **Radio Dots vs Checkmarks.** Column align and style, the grip's Scale/Type/Size, and the trash date format draw as native radio groups today; the unified model carries `checked` and gains an explicit `radio` flag (A05 §2, §3.4); default: every group that is a radio today stays a radio.

> Radio donts dont actually exist. 'checked' is the right flag; keep the interaction and visusal stuff the same.

33. **Icons in Menu Rows.** The in-app tile menu draws leading glyphs; the native path ignores icons and `ActionItem` has none (A05 §3.5); default: generic menus stay iconless in both presenters.

> Keep them as is. 

34. **The Tile Handle Menu Ignores Its Own Model.** `TileHandleMenu.tsx` re-derives its rows from props and never reads `tileMenuModel`, so the in-app and native tile menus can differ in rows and order (A05 §2); default: the model becomes canonical and the in-app pane follows it — tell me if the pane's current contents or ordering are the ones you want kept.

> THe ones that currently exist are the oens I want kept. Simplify it. tileMenuModel is weierd and should be gone. How it currently paints is correct.

35. **The Confirm Row.** `ActionItem.confirm` is dead on the native side and read by one popper purely as a separator marker, while the renderer raises its own dialog (A05 §2); default: keep the dialog and the separator, drop the field.

> Doesnt have to be. Confirm is fine. Leave it since its for in-app surfaces

36. **Sidebar Menu Failures Move In-App.** The sidebar and band menu acts inside main today and reports a failed mutation through a native error box (A05 §2, `contextMenu.ts:76`); default: the pick runs in the renderer and the failure becomes an in-app notification.

> Yes

37. **The Editor Context Menu Stays Native and Whole.** Its OS roles, spelling, Speech, and Share items cannot leave the host, and its Pommora block could optionally become a model the in-app pane draws (A05 §4); default: leave the whole editor menu native, unchanged.

> Yes, stays native. Leave unchanged besides a simplficiation pass if due

### Task 14

38. **A `]` Typed Inside a Table Cell Alias.** `refusedInAlias` guards the page editor but the table cell editor never wired it in, so typing `]` inside an alias there truncates the link (A10 H14); default: wire the guard into the cell editor.

>wire the guard.

39. **`[[` Inside a Code Fence Arms the Picker.** The autocomplete masks one line at a time and is therefore fence-blind (A10 M16, `autocomplete.ts:70`); default: make it read the cached document scan, so the picker stops appearing inside fenced code.

> Yes

40. **Double-Backtick Code Is Masked But Not Styled.** A ``` ``span`` ``` counts as code for link suppression yet never renders as `md-code` (A10 M5); default: style it like single-backtick code.
>Yes

41. **Display Math Colors on a Stray `$$`.** The `$$` styling token is a separate lazy regex from the line-anchored pairing the block model uses, and tokenizes over viewport slices (A10 M6); default: derive the coloring from the same pairing, so a lone `$$` no longer tints the rest.
>Yes

42. **A Callout Head Inside a Quoted Fence.** Detect refuses it; two other predicates treat it as a live callout head (A10 M8); default: one rule, Detect's — such a line renders as plain quoted code.
>One rule

43. **Editor Zoom Range.** The exponent mapping and its `[0,2]` clamp never bite against the tile scale steps `[0.5,1.5]`, so it collapses to a plain 15pt × scale (A10 M12); default: collapse — say so if the editor is meant to zoom past those steps on its own.
>collapse. 0.5 - 1.5

44. **Glance Arms From Links Only.** The dwell table has one row (`link`, 1000ms) and the pending "Glance Hosts" idea is what the extra generality is for (A14 §2e); default: keep the one-row table and the 1000ms dwell.
>Thats on purpose -- its just the first user; one-line comment of "MORE GLANCE SURFACES WILL BE ADDED" is all you need.

45. **iOS Keyboard Attributes.** `index.tsx:265-270` sets `autocapitalize`, `autocorrect`, and `enterkeyhint`, no-ops on desktop, and the companion app is a separate build (A10 M18); default: remove them. 

Keep; flag as mobile pre scaffolding
>

---

## Phase 5 — Removals, fixes, docs

### Task 15

46. **Changing the Asset Directory Stops Moving Old Banners.** F-3 rules the 245-line asset migration out, but A02 §2c finds it is the only mechanism that relocates existing banners and profile images when `asset_directory` changes; default per F-3: delete it and move files by hand if it ever matters.
>Cant happen -- keep the preserving behavior that we worked hard on.

47. **The Trash Date Label Contradicts the Column Label.** `TRASH_DATE_FORMATS` calls `monthDayYear` "Short Date" while `DATE_FORMAT_LABELS` calls it "MM/DD/YYYY" and reserves "Short Date" for a different format (A20 §2.10); default: the column vocabulary wins and the trash menu's label changes.
>Fix it. Unify it with the rest; the full enumeration like a table does 

48. **The Nexus Records Its Creation Date and Nothing Reads It.** `identity.ts` writes `createdAt` into `nexus.json` (A02 §2f); default: keep it as a legible on-disk fact.
>Keep it

49. **Glyphs Behind the Inert View Tiles.** `list-rounded` and `chart-gantt` are registered only to feed the four unbuilt view types' picker tiles, which stay (A12 §2, A08 §1.1); default: those two stay registered; the six genuinely unread icons (`house`, `app-window`, `heart`, `import`, `layout-panel-left`, `shapes`) go.
>Keep it. House gets removed, rest stays.

50. **The Blank Nav Menu.** `NavMenu.tsx` is a 300px empty `MenuSurface` described as a design placeholder (A12 §3); default: it stays.
>Stays

----

ADDITIONAL FOLDS!

PLEASE MAKE SURE THAT WHAT A FILE CONTAINS ACTUALLY MATCHES ITS NAME!!!! 
EACH RULING MUST HAVE THE FILE SCOPED FOR ANY OBVIOUS FIXES, IF ITS NOT AN OBVIOUS FIX THAT CAN HAPPEN AND REMAIN TRUE REGARDLESS OF FUTURE DIRECTION DONT MAKE IT HERE.
