## ImagePicker — Decision Log

### Frame

- **Purpose:** Part 3 of the file-based arc — the crop surface widened past the nexus icon. `PhotoCropModal` becomes `ImagePicker`, a design-system component every image-bearing seat frames through: banners, card covers, the nexus icon.
- **Core Value:** One framing model — Sapphire's focal point and zoom, keyed by the image — so any image in the nexus can be framed by hand after it's set, and the same framing reads correctly on every surface that shows it.
- **Success Criteria:** Right-click a banner or a card and choose Edit; move, scale, zoom out onto a chosen background; Save. The seat shows exactly what the frame showed, the framing survives a relaunch and reaches another device with the nexus, the source file and the note are untouched, the nexus icon runs on the same component with the same store, and `PhotoCropModal` no longer exists.

### Sources

- `renderer/src/DesignSystem/Components/PhotoCropModal/PhotoCropModal.tsx` — the existing crop: fixed 280px viewport, 220px circle, zoom 1–4, hand-rolled pointer capture, exports a 512² PNG data URL. Its header comment is meta-commentary and comes out.
- `renderer/src/DesignSystem/Components/PhotoCropModal/photoCropModal.css.ts` — backdrop scrim at `stack.top.floating`, `GlassWindow` panel, viewport, masked-surround blur, ring, slider, actions. The material the new component keeps.
- `renderer/src/Components/useNexusIcon.ts` — the one flow that carries bytes over IPC: pick → `nexus:imageData` (a data URL) → crop → `setProfileImage { dataUrl }` → `writeNexusIcon`. Two components mount its modal: `Sidebar/NexusPhoto.tsx:57` and `Components/Detail/SettingsScaffold.tsx:83`. Nothing else consumes the byte channel.
- `main/mutate.ts` `setBanner` (`:486`) / `setProfileImage` (`:460`) / `writeNexusIcon` (`:197`) — banners carry a *path* through `adoptFile(allow:'image')`; the profile carries *bytes*. Both delete a replaced file only under `.nexus/assets`.
- `renderer/src/Detail/Banner/useBannerMenu.ts` — the shared banner flow (menu → pick → `setBanner`) used by `Banner`, `PageHeader`, `PageEmbed`. `CardsView.tsx:1018` (set card), `CardsView.tsx:1418` (page card thumb) and `NavView.tsx:39` re-spell it by hand.
- `main/index.ts:1831` `nexus:bannerMenu` — Add / Change / Remove with a noun; `:1790` `nexus:iconMenu` — Edit Icon / Add-Change Photo / Remove.
- `shared/cardMenu.ts` + `shared/pageMenu.ts` `pageMetaMenuItems` + `CardsView.tsx:1381` `onCardContextMenu` — the card's page-meta menu and its action routing.
- **The ten hand-rolled `<img>` seats** that draw a stored reference — every `useAssetUrl` consumer that isn't a capture thumbnail: `Detail/Banner/Banner.tsx:30` (homepage inline icon) and `:123` (banner), `MarkdownPM/PageHeader.tsx:66`, `Embeds/PageEmbed.tsx:196`, `Tabs/NavView.tsx:62`, `Views/Cards/CardsView.tsx:1045` (set card) and `:1258` (page card — one element serving Cover and Preview, split by the view's mode at `:1443`), `Sidebar/NexusPhoto.tsx:44`, `Navigation/EntityGlyph.tsx:27`, `Components/Detail/SettingsScaffold.tsx:67`. All `object-fit: cover`; the three icon seats are circles, the settings header an 8px box. The cards' `onError` → placeholder swap (`:1045`, `:1258`) and `card-tokens.css:32`'s `-webkit-user-drag: none` are behaviors the seats carry today.
- `shared/types.ts:374` + `main/assetMap.ts:61-64` — `AssetMap.version` is one global counter bumped on `change` only; an `add` or `unlink` (and so an external rename, which is both) leaves it alone on purpose.
- `main/mutate.ts:115` `dropReplacedAsset` — the one place a replaced asset's bytes are removed, called from every owner arm.
- `main/mutate.ts:141` — `adoptFile` admits an image by extension, never by bytes; `main/index.ts:1810` `assets:adopt` adopts with `allow: 'any'`, the image refusal living inside each owner's mutation arm.
- `renderer/src/DesignSystem/Tokens/card-tokens.css` — `--cover-zoom` and `object-position: top` on the thumb `img`, aimed at *page-capture* thumbnails ("a page's inline title banner sits at the top of the shot").
- `renderer/src/DesignSystem/Interactions/gesture.ts` `beginPointerGesture` / `usePointerGesture` — the app's one pointer-drag primitive (capture, threshold, Escape, blur, scroll abort).
- `renderer/src/DesignSystem/Components/Fields/InputField.tsx` — the house field: `chrome` boxed / bordered, `leading` glyph, `trailing` action, children at rest, optional press-to-edit. `PathField` retired into its slots (`03efc3ed`); a path renders as `DesignSystem/Elements/NavTrail` over `pathSegments` (`fb27e7f0`), the recipe `Settings/AssetDirectoryRow.tsx:16-41` and `Components/Detail/FileEditor.tsx` share. `SegmentRun` is the value-segment recipe (the filter pane, the file cell), not the path one.
- `renderer/src/Embeds/tileWarm.ts:37-46` — the house shape for a module cache whose late fill must repaint mounted consumers: a `Map`, a `Set<() => void>`, register / notify. `useSyncExternalStore` has no use in the renderer.
- `renderer/src/Detail/Views/useGhostAnchor.ts:25` — `GhostSuppress`, a Context with a pass-through default; the two card flows wrap their native pops in it (`CardsView.tsx:1022`, `:1424`) so the hover ghost stands down while a menu owns the pointer.
- `renderer/src/DesignSystem/Components/Pickers/ColorPicker/ColorPicker.tsx` — the 8×8 ramp grid. Not used here.
- `main/index.ts:204` — `nexus-asset` is registered `standard · secure · supportFetchAPI · stream`; `:261` its responses carry no `Access-Control-Allow-Origin`. A canvas that draws one is tainted; pixel reads throw.
- `main/paths.ts:70` `NEXUS_CONFIG_FILES` — the `.nexus/` JSON registry (`nexus`, `settings`, `state`, `homepage`, `navigation`, `properties`); `main/watchPatch.ts:132` routes `settings.json` / `homepage.json` to a leaf re-read, and `:398` / `:456` are the shared confirmers the writers call themselves.
- `main/db/schema.ts` + `main/db/driver.ts:15` — `nexus.db` is WAL SQLite inside `.nexus/`, holds what has no cross-device answer, and is dropped clean on a version mismatch.
- `main/assetMap.ts:133` `patchHeldAssetMap` + `main/watchPatch.ts:235` — assets arrive as `add` / `change` / `unlink`; an external rename is an unlink and an add, never one event. Sapphire, by contrast, gets one `vault.on('rename')` and re-keys (`src/native/coverCrop.ts:229`, `src/options/store.ts:526`).
- **Sapphire** `src/ui/cropGeometry.ts` — the crop model this feature ports: `{ x, y, zoom, color? }`, `x`/`y` as background-position fractions (0.5 = centered), `zoom` relative to fill in `[0.25, 4]`, `coverStyle(crop, imageAspect, boxAspect)` the ONE producer both the paint and the editor render through, `panToCrop` clamped to `[0, 1]`. Aspect-independent by construction: percentage positioning bounds the pan with no clamping code, and below fill the image slides inside the box.
- **Sapphire** `src/options/store.ts:494` + `src/types.ts:224` — crops in the plugin's synced `data.json` as `coverCrops.byImage`, **keyed by the image** (vault path, or the raw string for a URL), never by the note; nothing written to frontmatter, the image, or the `.base`. 39 live crops in NexusOS today.
- **Sapphire** `src/ui/cropModal.ts` — frames at the card's own ratio; zoom by slider, pinch (`ctrlKey` wheel) and two-finger scroll; an image that won't load opens into a stated unavailable state with Save withheld. `:163-183` holds the pan conversion — the frame measured once per gesture, pointer pixels turned into position fractions through the overhang they cross — which `cropGeometry.ts` does not.
- **Sapphire** `src/native/coverCrop.ts:256-260` — the paint is gated on a crop *existing*: no crop, native's plain fill is restored and no aspect is ever loaded. `:59-72` — the natural-aspect cache keys by **URL**, `null` the sentinel for an image that won't load, with a repaint hook for aspects that resolve after the pass.
- **Sapphire** [[BaseViews]] Cover Crop — Edit Image on the card menu; a crop overrides the view's Image fit; Prospects name "the stored crop applied beyond the card — the planned page banner".
- [[CardViewPM]] Card Image + Prospects ("Fit Image / Reposition — v1 is fill-crop") · [[ConfigurationPM]] Profile · [[DesignSystemPM]] Components · [[ArchitecturePM]] the `.nexus/` layout · [[ContextPM]] the Part 3 line · `.claude/Planning/Codebase-Cleanup-Checklist.md:99` · `.claude/Planning/Buttons-Spec.md:41` (the crop modal's Choose as "the app's only accent-filled button").

### Decisions

#### A — Component

- **A-1:** [confirmed] `PhotoCropModal` is generalized into `ImagePicker` under `DesignSystem/Components/ImagePicker/`, on the existing material (backdrop scrim, `GlassWindow` panel, masked-surround blur, ring, slider). Rename and removal of `PhotoCropModal` is the last step; the Codebase-Cleanup line naming it updates.
- **A-2:** [confirmed] Footer is `[Cancel — Button filled] [path field, flex] [Save — Button tinted]`, per the mockup.
- **A-3:** [confirmed] The component's meta-commentary header is removed.
- **A-4:** [open] Two frame shapes: `circle` and `rect` with ~12px radius, the same crop model, the shape being the ring's radius. `coverStyle`'s percentages resolve against the painted element's own box, so the frame must *be* the viewport for the picker to show the seat's exact paint (B-2) — which means no blurred margin outside the frame and a circle cut by `border-radius` on the frame itself, not "the current geometry" of a 220 circle inside a 280 viewport. Nathan rules at ratification; the plan builds frame = viewport.
- **A-5:** [confirmed] The footer's path field is a read-only echo of the image being edited — which file, nothing more. Not a destination, not editable: the path-in-a-field recipe `Settings/AssetDirectoryRow.tsx` and `Components/Detail/FileEditor.tsx` already share — `InputField chrome="bordered"`, a leading glyph, `<NavTrail segments={pathSegments(path)} />`, no `edit`. The picker's echo is that recipe's third consumer.
- **A-6:** [confirmed] Two `label.secondary` glyphs sit inside the frame's corners: bottom-left **Reset** (back to `DEFAULT_CROP`), bottom-right **Background** (the eyedropper). No Reset menu item anywhere.
- **A-7:** [confirmed] Panning rides `beginPointerGesture` rather than the modal's hand-rolled pointer capture — the app has one drag primitive, and a second is the kind of parallel this codebase treats as debt.
- **A-8:** [confirmed] Zoom answers the slider, a pinch, and a two-finger scroll, as Sapphire's does; the slider spans `MIN_ZOOM`–`MAX_ZOOM` with 1.0 at its own position on the track, not the midpoint.
- **A-9:** [confirmed] The rect frame's proportions are the destination's *live* box at open time — the banner strip's, the card thumb's — passed in by the seat as a height ÷ width `boxAspect`. The circle's is 1. No house ratio, no per-view aspect setting.

#### B — The Crop Model

- **B-1:** [confirmed] A crop is Sapphire's: a focal point and a zoom, never a pixel rectangle, so it is independent of any aspect ratio and one framing reads correctly on every surface the image appears on.
- **B-2:** [confirmed] Pommora ports `cropGeometry.ts` — `Crop`, `DEFAULT_CROP`, `MIN_ZOOM` / `MAX_ZOOM`, `clampZoom`, `coverStyle`, `panToCrop` — into `shared/` (no React, no fs; main validates it, the renderer paints with it) and every seat paints through `coverStyle`, so the picker shows the result rather than a likeness of it.
- **B-3:** [confirmed] Page-capture thumbnails (Cards' **Preview** mode, the nav gallery) are not images anyone crops and keep their own `<img>` with `--cover-zoom` and `object-position: top`. Those rules re-anchor on a class only the capture path carries (`.page-card-thumb.is-capture img`, `.nav-gallery-thumb img`) rather than on element type — otherwise an uncropped cover's plain `<img>` (B-4) is caught, and Save on an unmoved frame would jump it from top-anchored to centered. `AssetImage`'s plain path sets `object-position: center` explicitly. Cover-mode covers and set banners are top-anchored today only by that selector; on ship they take `DEFAULT_CROP`'s center, a one-time reframe named in the acceptance criteria.
- **B-4:** [confirmed] One `AssetImage` component replaces the ten hand-rolled `<img>` seats, with the seat's own shape (circle, 8px, full-bleed) as its class. It resolves the reference through the asset map and reads the crop from the leaf. **The paint is gated on a crop existing, as Sapphire's is:** with none, it renders the plain `<img>` (`object-fit: cover`, `loading="lazy"`, `onError` to the seat's placeholder slot, the card's user-drag rule) and loads no aspect; with one, it renders the background box painted by `coverStyle`. Ten seats don't pay for machinery two of them use, and the two paths agree by construction: CSS `cover` centered *is* `coverStyle` at `DEFAULT_CROP`. The cropped path's placeholder comes from the aspect cache answering `null` (B-5) — the image it loads for geometry is the same one that fails — so no second error mechanism exists.
- **B-5:** [confirmed] The natural-aspect cache keys by the resolved **URL** — which carries the asset map's version — with `null` for an image that won't load, and `Embeds/tileWarm.ts`'s shape — a module `Map` plus a listener set with register / notify — coalesced through one rAF as Sapphire's `coverCrop.ts:111-118` does, so a grid resolving many aspects in one frame repaints once. A re-save under the same name bumps the version and re-keys for free; an external unlink + add of a different image under the same name does not, and keeps the old aspect until relaunch — accepted, as the map's own version discipline accepts it.
- **B-6:** [confirmed] The port includes the pan conversion beside `panToCrop` — `panDelta(anchorCrop, liveZoom, imageAspect, boxAspect, boxW, totalDx, totalDy) → Crop` — pure and tested. The frame's width is measured once at gesture start (`boxH` follows from `boxAspect`, so it is never passed twice); `x`/`y` anchor on the gesture-start crop and the *total* delta, so a clamp never accumulates; the overhang reads the *live* zoom, so a pinch or slider move mid-drag reframes without reverting the pan — the invariant Sapphire states and its `startPan` doesn't keep.
- **B-7:** [confirmed] `ImagePicker` joins the Showcase (`ComponentsLeaf`, both shapes) and `DesignSystemPM`'s Components table in the rename's own phase; `PhotoCropModal` was never on either.

#### C — Zoom & Background

- **C-1:** [confirmed] Scale defaults to 1.0; zooming out below 1 reveals the background behind the image, down to `MIN_ZOOM`.
- **C-2:** [confirmed] The background glyph opens an eyedropper; the picked colour is `crop.color`, painted by `coverStyle` as `backgroundColor`.
- **C-3:** [confirmed] Eyedropper only — no hex field, no ramp grid, and Sapphire's border-sample proposal is not ported.
- **C-4:** [confirmed] The eyedropper is the platform's: the Background glyph drives a visually-hidden `<input type="color">` (`showPicker()` on click), which on macOS opens the system color panel with its own loupe — the same control Obsidian's color setting uses, verified working on desktop. Chromium's `EyeDropper` API is absent in Electron 42 (probed: `typeof EyeDropper === 'undefined'` under a user gesture), and a canvas sample is closed off by the taint fact in Sources. The input's `value` is the hex `crop.color` reads.

#### D — Entry Points

- **D-1:** [confirmed] "Edit Banner" joins the banner menu (Change · Edit · Remove); it opens the picker on the existing image with its stored crop. The noun follows the surface as today (Cover on a card thumb).
- **D-2:** [confirmed] "Edit Image" joins the card's page-meta menu (`cardMenu.ts`), offered only when the view's Card Banner is Cover and the page has a cover. Preview thumbs are captures; None has no image.
- **D-3:** [confirmed] The three hand-spelled banner flows (`CardsView.tsx:1018`, `:1418`, `NavView.tsx:39`) fold onto `useBannerMenu`, which is where Edit lands once rather than four times. The hook widens to mirror its own channel — `useBannerMenu(path, kind, { onDone?, noun?, hasImage?, noRemove? })`, `add` derived from `hasImage` — because each of the three passes an option the bare hook can't express today; `hasImage` also gates Edit. The hook consumes `GhostSuppress` itself and wraps its own pop — the Context's pass-through default leaves Banner, PageHeader and PageEmbed unaffected and gives the two card seats their suppression back. It takes the seat's `boxAspect` (a getter read at open) and returns `{ openMenu, addOrChange, editing, closeEditor }`, so each seat mounts its own `ImagePicker` from state the hook owns. NavView's Remove clears its own override and falls back to the homepage banner, which the hook states rather than hides.
- **D-4:** [confirmed] The nexus icon's Add / Change Photo goes pick → adopt → open the picker on the adopted file, and the icon menu offers **Edit Photo** once one exists. Both land in `useNexusIcon`, so the ribbon and the settings header get them together. `assets:adopt` gains an `allow` option (default `'any'`, so the file property's call is unchanged) and this path passes `'image'`, since the refusal otherwise sits inside the mutation the picker runs *after*.

#### E — Storage & Write Path

- **E-1:** [confirmed] Save stores the crop, never pixels: no derivative file, the source untouched, nothing in frontmatter or a sidecar. Edit reopens with the same framing.
- **E-2:** [confirmed] Crops key by the **image** — its nexus-relative asset path — not by the owner: one framing serves every seat the image appears on, as Sapphire's `byImage`.
- **E-3:** [confirmed] The store is `.nexus/crops.json` — `{ byImage: { "<asset path>": Crop } }` — a synced text file like every other `.nexus` JSON, last-writer-wins whole-file. Not `nexus.db`: a WAL SQLite file syncs as an opaque, often-stale blob, conflicts rather than merges, and is dropped clean on a schema mismatch by contract — it holds what has no correct cross-device answer, and a crop has one.
- **E-4:** [confirmed] The nexus icon joins the model. `setProfileImage` becomes a path write through `adoptFile` like every banner; the circle framing is a `Crop` on the profile image; `writeNexusIcon`, `nexus:imageData`, `decodeImageDataUrl` and the data-URL arm are deleted.
- **E-5:** [confirmed] Crops ride the tree as a leaf — `tree.crops`, read at open from `crops.json` and zod-validated (a malformed entry is dropped, never the file) — so the renderer subscribes the way it does to every leaf and no new push channel exists. `watchPatch` gains a `crops-leaf` beside `settings-leaf`; the writer calls the same confirmer itself, because no write Pommora makes is visible to its own watcher.
- **E-6:** [confirmed] One write op, `setCrop { image, crop | null }`, read-merge-write on `crops.json` like `updateSettings`; `null` deletes the key. Its two callers are the picker's Save and `dropReplacedAsset` (E-8); both go through the op's helper *and* its confirmer, since no write Pommora makes is visible to its own watcher.
- **E-7:** [confirmed] An external rename of an asset arrives as unlink + add, so its crop stays under the old key. Sapphire re-keys because the vault hands it one rename event; Pommora's watcher has no such event to hang a re-key on, so the orphan is accepted and pruning is a Prospect.
- **E-8:** [confirmed] `dropReplacedAsset` clears the crop for the path it removes, through `setCrop`'s own helper and confirmer — otherwise a later adoption of the same basename lands at the same path and inherits a dead image's framing. The Prospect sweep is for files deleted outside the app only. It runs after the owner's field write, inside the existing "set the field first, then delete" order; the page-cover arm holds the page's lock while it does, which no crops-first path today can cross.
- **E-9:** [confirmed] `setCrop { crop: null }` on the last key leaves `{ byImage: {} }`; "no empties" governs keys inside a map, and `homepage.json` persists as `{}` the same way.

### Approaches Weighed

- **Paint through `coverStyle` as a background image (chosen).** Sapphire's exact geometry, one producer for editor and seat, needs only the image's natural aspect. The circle is a `border-radius` on the box.
- **Keep `<img>` and drive `object-fit` / `object-position` / `transform`.** Needs a second *geometry* below fill (`contain` plus a box colour) that can't share Sapphire's math. B-4's plain path is not that: it is the identity crop, which CSS `cover` already paints.
- **Bake a derivative file per seat (the icon's old model).** Rejected: re-edit works on cropped pixels, a zoomed-out image bakes its background in, one file serves one aspect, and the byte channel widens instead of dying.

### Core (must-have)

- `shared/cropGeometry.ts` ported with its tests, the pan conversion included; `.nexus/crops.json` read as a tree leaf, watched, zod-validated; `setCrop`.
- `AssetImage`, replacing the ten seats, gated on a crop and painted by `coverStyle`.
- `ImagePicker`: `circle` / `rect`, drag via the gesture primitive, slider + pinch + scroll zoom, zoom-out, Reset glyph, eyedropper glyph, Cancel / path echo / Save, error state with Save withheld.
- Edit Banner on the banner menu (all banner owners through `useBannerMenu`), Edit Image on the card menu, Edit Photo on the icon menu; the nexus icon on the path model.
- `PhotoCropModal` and the byte pipeline deleted; the docs in Sources reconciled.

#### Prospects (allowed later, not now)

- **The file property's chip opens the picker** — any image named by a `file` value framed from where it's named. Don't-foreclose: `ImagePicker` takes a reference and a `boxAspect`, nothing owner-shaped.
- **Sapphire reads `.nexus/crops.json`** as its crop source so one framing shows in both apps. Don't-foreclose: the on-disk shape is Sapphire's own.
- **Pruning crops whose image no longer resolves** — a sweep over `byImage` against the asset map.
- **In-place framing** — dragging the image inside the real banner. The geometry is already shared, so it is a second mount; on an uncropped image the first drag creates the crop.

#### Out of Scope (won't do — distinct from Prospects)

- Rotation, filters, any pixel editing beyond framing.
- Per-view image fit / aspect-ratio settings on Cards — the crop model is independent of them, and nothing here needs one.
- Page-capture thumbnails (Preview mode, nav gallery) — captures, not pickable images.

#### Considered & Rejected

- **A house aspect ratio per seat, or a per-view `image_aspect_ratio`** — proposed before Sapphire's model was on the table; the model makes both unnecessary.
- **Per-owner crop keys in frontmatter / sidecars (`cover_crop`, `banner_crop`)** — a crop belongs to the picture, and a key in every note's properties is what Sapphire rejected for the same reason.
- **`nexus.db` as the store** — see E-3.
- **A hex field or the ramp grid for the background** — the colour wanted is one the image already contains.
- **Canvas sampling for the eyedropper** — tainted by the asset scheme's missing CORS header.
- **Chromium's `EyeDropper` API** — not shipped in Electron 42.

#### Don't-Forget Sweep

- **Happy path:** Edit → frame → Save → every seat showing that image repaints from the leaf patch; relaunch and the other device read `crops.json`.
- **Validation:** `crops.json` entries validated by the ported schema; `zoom` clamped at write; a non-image or unresolvable reference offers no Edit item.
- **Persistence:** the file is additive — absent means no crops; an old app reading a newer file ignores unknown keys; `null` write deletes the key.
- **Compatibility:** `setProfileImage`'s shape changes (bytes → path) — `useNexusIcon` updates with it, and both its mounts follow; an already-baked `nexus-icon.png` renders identically under `DEFAULT_CROP`.
- **Failure recovery:** an image that won't load opens into the stated unavailable state with Save withheld; a refused adoption leaves the value alone (existing rule).
- **Idempotency / concurrency:** Save while busy is ignored (existing `busy`); the picker is one instance per seat; a write to `crops.json` while another device wrote is last-writer-wins whole-file, the `.nexus` JSON rule.
- **Performance:** no aspect is loaded for an uncropped image; a cropped one costs one `Image()` per unique URL, cached; nothing measured in the paint path; `AssetImage` reads a leaf slice, not the whole tree.
- **Interaction & gesture:** drag ↔ release, open ↔ Escape / backdrop / Cancel, eyedropper open ↔ its own Escape, Reset ↔ any further drag; the Save button stays reachable under the frame's glyphs; Escape inside the picker is swallowed by the gesture primitive only while a drag is live.
- **Layout & layering:** the picker is a portal on the top floating stack (existing); the frame is sized by the `boxAspect` the seat passes, and the panel's width is a KNOB.

#### Lessons

- **A claim about a third-party surface is verified against that surface's docs, and a claim about your own tooling against your own tree.** "Obsidian does per-image crops" was false of Obsidian and true of Sapphire; the codebase that proved it was one folder over. → `Guidelines/Cohesion-Rulings.md`
- **Machinery is gated on the state that needs it.** Sapphire pays for crop geometry only where a crop exists; a port that routed every seat through it would have made ten surfaces pay for what two use, and dropped the `onError` and lazy-load behaviors the plain path carries. Inherit the gate, not just the function. → `Guidelines/Cohesion-Rulings.md`
- **A fold can falsify a decision written three entries later.** The crop gate re-admitted the `<img>` a selector-scoping decision assumed was gone; the review round after a fold reads the whole log, not the diff. → `Guidelines/Adversarial-Review-Log.md`
