## ImagePicker — Implementation Plan

> **Status:** written, pending review · Spec: [[ImagePicker — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Any image the nexus shows — a banner, a page cover, a card's cover, the nexus icon — can be framed by hand after it's set: right-click → Edit, move and scale it inside a frame cut to the seat's own proportions, zoom out onto a chosen background, Save. The framing is a focal point and a zoom stored beside the nexus in `.nexus/crops.json`, keyed by the image, so one framing serves every seat that shows the picture, follows the nexus to another device, and never touches the file or the note. `PhotoCropModal` — the nexus icon's private crop dialog that bakes a PNG and ships bytes over IPC — is gone; `ImagePicker` is the design-system component every seat opens, and the icon is one more seat on the same model.

The shape is Sapphire's, ported rather than reinvented: `cropGeometry.ts` is the one producer of a framed image's paint, shared by the editor and the seats so they cannot disagree; the paint is gated on a crop existing, so the ten seats that draw a stored reference keep their plain `<img>` until someone frames them. The alternatives — a baked derivative per seat, per-owner crop keys in frontmatter, `nexus.db` as the store, a hex field or the ramp grid for the background, Chromium's `EyeDropper` (absent in Electron 42) — were weighed in the decision log and rejected there; Nathan ratified every decision below.

What this is not: rotation, filters, pixel editing; per-view image-fit or aspect settings on Cards; any change to page-capture thumbnails, which are not pickable images. The lightest transformation of what exists is the measure — every task names the mechanism it rides, and a task that would add a parallel is wrong as written.

**Requirements**

1. `shared/cropGeometry.ts` — `Crop`, `DEFAULT_CROP`, `MIN_ZOOM` / `MAX_ZOOM`, `clampZoom`, `coverStyle`, `panToCrop`, `panDelta` — pure, tested.
2. `.nexus/crops.json` (`{ byImage: { key: Crop } }`) read at open as `tree.crops`, patched live by the watcher, written by one op `setCrop { image, crop | null }`; `dropReplacedAsset` clears the crop it orphans.
3. `AssetImage` replaces the ten `<img>` seats that draw a stored reference: a plain `<img>` with no crop, the `coverStyle` background box with one; a URL-keyed natural-aspect cache with a repaint on resolve.
4. `ImagePicker` (`circle` | `rect`, `boxAspect`), panning on `beginPointerGesture`, zoom on the house `Slider` plus pinch / two-finger scroll, zoom-out to `MIN_ZOOM`, corner glyphs Reset and Background (native `<input type="color">`), footer Cancel · path echo · Save; error state with Save withheld; on the Showcase and the `DesignSystemPM` ledger.
5. Edit on the banner menu through a widened `useBannerMenu` that the three hand-spelled flows fold onto; Edit Image on the card menu; Edit Photo on the icon menu; `setProfileImage` carries a path and the byte pipeline is deleted.
6. `PhotoCropModal` deleted; every document in Made False rewritten; the dead-vocabulary sweep at zero.

**Acceptance — the whole thing working:** In the live nexus, right-click a Collection banner → Edit Banner → drag it, zoom to 0.6, pick a background from the image, Save. The banner repaints framed with that background; the same image set as a page's cover shows the same framing in the page header, the page embed, and a Cover-mode card; `.nexus/crops.json` holds one entry keyed by that file's nexus-relative path and the `.md`, the sidecar and the image file are byte-identical to before; quit and relaunch, and it's still framed; hand-edit the JSON's `zoom` while the app runs and the banner follows. Right-click the ribbon's nexus photo → Add Photo → pick a file → the picker opens on it as a circle; Save; the ribbon, the nav list, the settings header, and the homepage title all show that framing, `settings.json`'s `profile_image` names the adopted file, and no `nexus-icon.png` was minted. `rg -F PhotoCropModal src` → 0.

**Forced By**

- Every stored image field holds `[[Name.ext]]`, never a path (`adoptFile` answers `connectionText(base)`; `profile_image`, sidecar `banner`, frontmatter `cover`, `navigation.json` all carry it) → the crop key is what resolution answers — the nexus-relative path for a file (`assetFilePath` main-side, `resolveAssetValue(...).rel` renderer-side), the raw string for a web address — which is Sapphire's exact rule, and no new resolver exists on either side.
- `AssetMap.version` bumps on `change` only; an `add`/`unlink` moves nothing → the aspect cache keys by the resolved URL (which carries `?v=`), and an external replace-under-the-same-name keeps the old aspect until relaunch — accepted, as the map accepts it.
- `nexus-asset://` responses carry no CORS header → no canvas may read a served image; the picker paints with CSS, never a canvas, and the background colour comes from the platform's own picker.
- `EyeDropper` is `undefined` in Electron 42 (probed under a user gesture) → the Background glyph drives `<input type="color">.showPicker()`, which macOS answers with the system panel and its loupe; the input stays mounted, since `showPicker()` throws off-DOM or outside a gesture.
- No write Pommora makes is visible to its own watcher (`recordWrite` / `isRecentWrite`, dropped at `watcher.ts:109` before classification) → every `crops.json` writer calls `patchCropsFromDisk` itself; a `setCrop` missing its `mutatePatch.ts` case falls to a full verification walk on every Save, silently.
- `serializeOnFile` keys on the literal path string and is non-reentrant → `nexusConfig(root, NEXUS_CONFIG_FILES.crops)` is the only builder of the crops path, and the crops RMW is never called from inside another lock on the same path.
- `.nexus` singletons are hand-coerced, not zod-parsed (`readHomepageLeaves`, `coerce.ts` has no `asNumber`) → `readCropLeaves` guards numbers itself and drops a malformed entry, never the file.
- `card-tokens.css:23` matches `.page-card-thumb img` by element type → an uncropped cover's plain `<img>` is caught by `object-position: top` unless the rule re-anchors on a capture-only class; without that, Save on an unmoved frame jumps the image.
- `card-tokens.css:30` owns `transform` on card `<img>`s and `navGallery.css:5` sets `--cover-zoom: 1.25` → the cropped path is a background box, never an `<img>` with an inline transform.
- `beginPointerGesture` binds Escape capture-phase and swallows it only while `active` → the picker's own Escape listener stays; a live pan eats Escape, an idle picker closes on it.
- `pageMetaMenuItems` is switched over by four other menus (`cellMenu.ts`, `connMenu.ts`, `pageActionsMenu.ts`, `contextMenu.ts`) → Edit Image is its own `CardMenuAction` literal added in `popCardMenu`, never a `PageMetaAction`.
- `GhostSuppress` is a Context whose default is a pass-through → `useBannerMenu` consumes it internally; seats under no provider are unaffected and the two card seats get suppression back.
- `Icon` falls through to the whole Lucide set but `AccessoryButton.icon` is `IconName`-typed → `rotate-ccw` and `pipette` join the registry (two lines) so the corner glyphs go through the typed path rather than the fallback bundle.
- Sapphire's `startPan` snapshots `start.zoom` and discards a mid-drag zoom → `panDelta` reads the live zoom for the overhang and anchors position on the gesture-start crop plus the total delta.

**Inherited Reasoning**

- **A baked derivative per seat** — rejected: re-edit works on cropped pixels, zoom-out bakes the background in, one file serves one aspect.
- **Per-owner keys (`cover_crop` beside `cover`)** — rejected: a crop belongs to the picture; Sapphire rejected the same for the same reason.
- **`nexus.db`** — rejected: WAL SQLite syncs as an opaque, stale blob and is dropped clean on a schema mismatch.
- **Canvas sampling / `EyeDropper` API** — closed by the CORS fact and the probe.
- **A per-seat house aspect ratio, a per-view `image_aspect_ratio`** — unnecessary once the crop is aspect-independent.
- **Widening `assets:adopt` with `allow`** — dropped during scouting: every image adoption is main-side inside the owner's mutation, and widening the channel widens what a renderer can land in the asset root. Add Photo *writes* through `setProfileImage { source }` and then opens the picker on the stored value.
- **`useSyncExternalStore`** — no precedent in the renderer; `tileWarm.ts`'s `Map` + listener set is the house shape.
- **Keeping `<img>` and driving `object-position` / `transform` for the cropped path** — rejected: `--cover-zoom` and `transform-origin: top left` already own that slot on card thumbs, and below fill it needs a second geometry.
- **Sapphire's border-sample colour proposal** — not ported (Nathan's call: eyedropper only).

**Grounding** *(re-open these; don't cite them)*

- `.claude/Planning/ImagePicker — Decision Log.md` — the ratified spec; its Sources block is the file map.
- `../Sapphire/src/ui/cropGeometry.ts`, `src/ui/cropModal.ts:160-184`, `src/native/coverCrop.ts:56-72, 252-262` — the model, the pan conversion, the crop gate and aspect cache.
- `main/readNexus.ts:276-283, 357-358, 611-617, 702` · `main/watchPatch.ts:57, 131-143, 195-201, 253-256, 456-461` · `main/mutatePatch.ts:143-157` · `main/index.ts:505-525, 1630-1640` — the homepage leaf, end to end.
- `main/mutate.ts:99-121, 132-193, 249-259, 460-477, 486-564` · `main/settings.ts:24-31` and its last function (`writePersonalization`) · `main/io/atomicWrite.ts:17-24, 71-89, 125-133` · `main/io/fileLock.ts:7-33` · `main/assetRoots.ts:34-53`.
- `shared/mutate.ts:31, 53-140` · `shared/types.ts:370-379, 403-406` · `shared/identityMenus.ts` · `shared/cardMenu.ts` · `shared/bridge.ts:317-330, 350, 389`.
- `renderer/src/store.ts:202-213, 907-916, 1794-1895` · `renderer/src/assetUrl.ts` · `renderer/src/App.tsx:134`.
- The ten seats (Decision Log Sources) · `Detail/Banner/useBannerMenu.ts` · `Detail/Views/Cards/CardsView.tsx:102-103, 1010-1030, 1340-1345, 1381-1410, 1413-1451` · `Tabs/NavView.tsx:24-48, 61-62` · `Components/useNexusIcon.ts` · `Sidebar/NexusPhoto.tsx:49-62` · `Components/Detail/SettingsScaffold.tsx:26-38, 57-88` · `Detail/Views/useGhostAnchor.ts:22-25, 57-60, 166-176`.
- `DesignSystem/Components/PhotoCropModal/*` · `DesignSystem/Interactions/gesture.ts:10-52, 219-227` · `Embeds/ConnectionHoverCard.tsx:150-199` (the pan shape) · `DesignSystem/Components/Controls/Slider/Slider.tsx:13-33` + `Components/Detail/ViewSettings.tsx:209-220` (the zoom-slider precedent) · `DesignSystem/Components/Controls/Button/Button.tsx:9-34` + `button.css.ts:52-89` · `DesignSystem/Components/Menu/Menu.tsx:158-193` + `menu.css.ts:178-181, 237-239` · `DesignSystem/Components/Fields/InputField.tsx` · `Settings/AssetDirectoryRow.tsx` · `DesignSystem/Elements/NavTrail/NavTrail.tsx:80-84` · `DesignSystem/Symbols/index.tsx:83-168, 231-238` · `DesignSystem/Tokens/card-tokens.css:23-44` · `NavWindow/navGallery.css:5, 62-68` · `Embeds/tileWarm.ts` · `DesignSystem/Showcase/leaves/ComponentsLeaf.tsx:11-85`.
- `.claude/Guidelines/Data-Layer.md` · `.claude/Guidelines/Cohesion-Rulings.md` · `.claude/Guidelines/Adversarial-Review-Log.md`.

**Environment**

- **Plan directory:** `.claude/Planning`. **Spec input:** the decision log.
- **Explorer:** `Explore`. **Attack reviewer:** `build-breaking-agent`. **Code reviewer:** `feature-dev:code-reviewer` (the project designates no correctness agent of its own). **Neutral verifier:** `general-purpose`, handed the claim alone. **Simplification:** `code-simplifier` + `comment-killer-agent`, then `/closeout`.
- **Gates**, from `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint` · `npm run build`. Exit codes read directly. Biome formats every write through the PostToolUse hook; a shell-driven edit runs `npm run format`.
- **Rules directory:** `.claude/Guidelines`.

**Shapes:** additive · removal · refactor · user-visible

**Global Constraints (every task inherits these)**

- Gates as above, exit codes read directly, never through a pipe. A red gate is attributed to its paths before it's believed — a parallel session commits to this branch.
- **Stage explicit paths. Never `git add` a directory, never `git stash`.** Read `git diff --cached --name-only` before every commit; Nathan's hook pre-stages his own doc edits — commit them along, never reset them out.
- Main owns the filesystem; the renderer holds nexus-relative paths and stored values only. Every channel is declared once in `shared/bridge.ts`; IPC returns `Result`, never throws.
- Tokens from `DesignSystem/Tokens` only. No new keyframes, no new scrim, no new slider, no new drag primitive. A hand-rolled parallel to an existing mechanism is a defect, not a style choice.
- No layout read on a high-frequency path: the paint path measures nothing; the pan measures the frame once at gesture start.
- Comments are why-only; none names a value its declaration holds; `KNOB` markers survive.
- No keyboard shortcut is added without sign-off.
- One commit per task, boxes ticked in the same commit, message in the house `type(scope): sentence` form.
- Out of scope everywhere: page-capture thumbnails and `thumbnails.ts`; `assets:adopt` and its bridge entry; `PageMetaAction`; Sapphire's tree; rotation, filters, per-view fit settings.

**Made False** *(each rewrite lands in the commit that falsifies it)*

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `Features/CardViewPM.md` Card Image | "Right-clicking the image band pops the native banner menu — Add when the page has no cover, Change / Remove when it does" | Edit joins the band menu; Edit Image joins the card menu | 14 |
| `Features/CardViewPM.md` Prospects | "Fit Image / Reposition — contain-vs-fill and hover-reposition on covers; v1 is fill-crop." | Reposition ships as the crop; the prospect resolves | 14 |
| `Features/ConfigurationPM.md` Profile | "its image and icon are written from the ribbon's identity menu" (bytes) | the image is a path write through `adoptFile`, framed by a crop | 15 |
| `Features/ArchitecturePM.md` `.nexus/` layout | the file listing with no `crops.json` | `crops.json` exists | 4 |
| `Features/DesignSystemPM.md` Pickers table | no `ImagePicker` row (nor a `PhotoCropModal` one) | `ImagePicker` is a Picker | 12 |
| `Features/DesignSystemPM.md` GlassWindow row | "the crop modal" | it's the ImagePicker | 12 |
| `ContextPM.md` | "Part 3 of the file-based arc — `PhotoCropModal` widened past the nexus icon…" and the Files & Assets line | Part 3 ships | 17 |
| `Planning/Codebase-Cleanup-Checklist.md:99` | "`PaneSlider`, `PhotoCropModal`, `IconPicker` and `Surface` are already inside `DesignSystem/`" | `PhotoCropModal` no longer exists | 16 |
| `Planning/Buttons-Spec.md:41, 51` | "the PhotoCropModal pair … the app's only accent-filled button" / "Cancel · Choose" | Save is `tinted`; the component is renamed | 16 |
| `Features/PagesPM.md` | `cover` described as the banner with no framing | a crop keyed by the image frames it (one sentence) | 17 |

**Dead Vocabulary** *(what the closing sweep searches for)*

- `PhotoCropModal` → 0. Legitimate hits: none (History entries are prose about the past and live outside `src/`; the sweep runs over `Pommora/src` and `.claude/Features`, `.claude/Planning/Codebase-Cleanup-Checklist.md`, `.claude/Planning/Buttons-Spec.md`, `ContextPM.md`).
- `imageData` → 0 in `Pommora/src`. Legitimate hits: none.
- `decodeImageDataUrl`, `writeNexusIcon`, `readImageData`, `pickedImagePaths`, `NEXUS_ICON` → 0 in `Pommora/src`.
- `dataUrl` → 0 in `Pommora/src`. Legitimate hits: none.
- `Move and Scale` → 0 in `Pommora/src`.
- Control: `adoptFile` → 23 at planning time (`rg -F "adoptFile(" Pommora/src`). Zero here means the sweep never ran.

**Hazard Window:** Task 15 changes `setProfileImage`'s request shape; between its `shared/mutate.ts` edit and its `useNexusIcon.ts` edit the type gate is red by design. Both land in Task 15's one commit; no task runs between them.

---

### Phase 1 — The model and the store, proven before any seat paints

#### Task 1: Port `cropGeometry.ts` into `shared/`, with the pan conversion

**Requirement:** 1

**Why:** Every surface — the ten seats, the picker's frame, main's write-time clamp — must produce byte-identical framing from one function, or the picker is a liar. Sapphire's module is that function, pure and proven on 39 live crops; it lives in `shared/` because main needs `Crop`, `clampZoom` and the bounds for the write, and the renderer needs `coverStyle`. The one thing Sapphire keeps in its modal — turning pointer pixels into position fractions — comes along as `panDelta`, so the gesture is arithmetic on a snapshot and the sticky-edge and mid-drag-zoom defects can't be written.

**Files:**
- Create: `Pommora/src/shared/cropGeometry.ts` — `Crop`, `CoverStyle`, `DEFAULT_CROP`, `MIN_ZOOM = 0.25`, `MAX_ZOOM = 4`, `clampZoom`, `coverStyle`, `panToCrop`, `panDelta`, `isCrop`.
- Test: `Pommora/src/shared/cropGeometry.test.ts`

**Interfaces**
- Produces: `interface Crop { x: number; y: number; zoom: number; color?: string }` — `x`/`y` background-position fractions in `[0,1]`, `zoom` relative to fill in `[MIN_ZOOM, MAX_ZOOM]`.
- Produces: `coverStyle(crop, imageAspect, boxAspect): CoverStyle | null` — aspects are height ÷ width; null where either is unusable; `backgroundSize` is `${zoom*100}% auto` when `imageAspect > boxAspect`, else `auto ${zoom*100}%`; `backgroundPosition` `${x*100}% ${y*100}%`; `backgroundColor` `crop.color ?? ''`.
- Produces: `panToCrop(crop, dx, dy): Crop` — fractions applied and clamped to `[0,1]`.
- Produces: `panDelta(anchor: Crop, liveZoom: number, imageAspect: number, boxAspect: number, boxW: number, totalDx: number, totalDy: number): Crop` — the overhang computed from the *live* zoom and `boxW` (`boxH = boxW × boxAspect`), the position from the *anchor* crop plus the *total* pointer delta; a zero overhang on an axis leaves that axis untouched.
- Produces: `isCrop(v: unknown): v is Crop` — finite numbers, `color` a string or absent.
- Assumed by: Task 3 (validation and clamp at write), Task 5 (`AssetImage`), Task 9 (the picker), Task 4 (`readCropLeaves`).

**Failure half:** `zoom` NaN → treated as 1; `zoom` outside bounds → clamped, never letterboxed past `MIN_ZOOM`; zero or negative `imageAspect` → null, the caller paints the plain fill; equal aspects take the height branch deterministically.

**Must agree:** `coverStyle(DEFAULT_CROP, a, b)` must be `cover` centered for every `a`, `b` — one test asserts `backgroundSize` is `100% auto` or `auto 100%` and position `50% 50%` across portrait, square and landscape at the three real seat aspects (1, 230/900, 104/180).

**Steps:**
- [ ] Copy Sapphire's `cropGeometry.ts` (Biome will reformat: single quotes, no semicolons); add `panDelta` and `isCrop`.
- [ ] Write the tests: both fill branches; the equal-aspect boundary; `zoom` below/above bounds; a zero aspect; `panToCrop` clamping at both ends; the Must-agree table; `panDelta` — a pinch mid-drag (anchor zoom 1.5, live zoom 2) yields the anchor's position moved by `totalDx / overhang(liveZoom)`, never the anchor zoom's overhang; a total delta returning to 0 returns exactly the anchor.
- [ ] `npm run test -- cropGeometry` — expect pass; `npm run typecheck` 0; `npm run lint` clean.
- [ ] Commit: `feat(shared): the crop model — a focal point and a zoom, one producer of the paint`

#### Task 2: `.nexus/crops.json` as the `crops` leaf

**Requirement:** 2

**Why:** A crop that lives in the tree reaches every seat the way a homepage banner does — one subscription, one watcher case, one confirmer — and needs no push channel of its own. The homepage leaf is the template line for line; this task adds beside it and nothing else.

**Files:**
- Modify: `main/paths.ts` `NEXUS_CONFIG_FILES` — `crops: 'crops.json'`.
- Modify: `shared/types.ts` `NexusTree` — `crops: Record<string, Crop>` beside `homepage`.
- Modify: `main/readNexus.ts` — `readCropLeaves(config: Record<string, unknown>): NexusTree['crops']` beside `readHomepageLeaves`; one more `readConfig(nexusConfig(root, NEXUS_CONFIG_FILES.crops))` in the open-time `Promise.all`; `crops: readCropLeaves(cropsConfig)` in the assembly.
- Modify: `main/watchPatch.ts` — `| { kind: 'crops-leaf' }`; the classifier line beside the homepage one; `case 'crops-leaf': return patchCropsFromDisk(root)`; `patchCropsFromDisk` cloned from `patchHomepageFromDisk`.
- Modify: the four tree fixtures that would fail a required field — `shared/treePatch.test.ts`, `renderer/src/store.test.tsx`, `renderer/src/selection.test.ts`, `renderer/src/Navigation/testTree.ts` — `crops: {}`.
- Test: `main/watchPatch.test.ts` — the leaf's three assertions beside the homepage ones.

**Derivation**
- `rg -F "homepage: readHomepageLeaves" Pommora/src` → 1 (the assembly). `rg -F "homepage-leaf" Pommora/src` → 4 (class, classifier, dispatch, test). Each gains a `crops` twin.
- `rg -F "homepage: {" Pommora/src --glob '*.test.*' --glob 'testTree.ts'` → 4 at planning time — the fixtures. Control: `rg -F "readHomepageLeaves" Pommora/src` → 3.

**Interfaces**
- Produces: `tree.crops: Record<string, Crop>` — keyed by the resolved image key (Task 3 defines the writer's spelling; the reader stores what the file holds).
- Produces: `patchCropsFromDisk(root): Promise<NexusTree | null>` — the confirmer Task 3's op and Task 3's `dropReplacedAsset` call.
- Assumed by: Task 3, Task 5.

**Failure half:** file absent → `{}` (via `readConfig`); `byImage` missing or not an object → `{}`; an entry failing `isCrop` → dropped, the rest kept; a `zoom` out of bounds on disk → kept as read and clamped at paint (`coverStyle` clamps).

**Must agree:** the walk and the patch decode through the same `readCropLeaves`, so `stabilize(walked, live)` is identity after a crops write — the existing homepage assertion pattern at `watchPatch.test.ts:102-103`, repeated for crops.

**Steps:**
- [ ] Write the failing watch test: write `crops.json` with one valid and one malformed entry → after the event, `live.crops` holds the valid one; `classifyEvent` answers `crops-leaf` for the path; `stabilize(walked, live)` is `live`.
- [ ] Run it — expect failure.
- [ ] Make the seven edits; fix the four fixtures; run the full gate — expect green.
- [ ] Commit: `feat(nexus): crops.json rides the tree as a leaf`

#### Task 3: `setCrop`, and the orphan cleared where the bytes go

**Requirement:** 2

**Why:** One op writes the file, resolving the caller's stored value to the key once, main-side, through the resolver `assetFileToDelete` already wraps — so the renderer never learns a second spelling of an image. `dropReplacedAsset` is the one place a replaced image's bytes are removed and already holds the exact path being removed, which *is* the crop key; clearing there costs one call and prevents a later same-named adoption inheriting a dead framing.

**Files:**
- Modify: `shared/mutate.ts` — `| { op: 'setCrop'; image: string; crop: Crop | null }` beside `setBanner`.
- Modify: `main/mutate.ts` — `cropKey(root, image)`: `assetFilePath(root, image)` for a resolvable file, else the raw string when it's a web address (`SCHEMED`-shaped), else `null` → `fault('That image can’t be framed.')`; `updateCrops(root, fn)` = `rmwJsonStrict(nexusConfig(root, NEXUS_CONFIG_FILES.crops), fn, () => ({}))` on `writePersonalization`'s nested-merge shape over `byImage`; the `setCrop` arm — clamp `zoom` through `clampZoom`, set or delete `byImage[key]`; `dropReplacedAsset` gains `await updateCrops(root, drop(prev))` after the `rm`.
- Modify: `main/mutatePatch.ts` — `case 'setCrop': return patchCropsFromDisk(root)`; the four owner arms that call `dropReplacedAsset` already confirm through their own leaf — add `patchCropsFromDisk` to their confirmers only where a crop was actually dropped (return the dropped key from `dropReplacedAsset` and confirm conditionally).
- Test: `main/mutate.test.ts` — beside the `setBanner` battery.

**Interfaces**
- Produces: `mutate({ op: 'setCrop', image, crop })` — `image` is the stored value verbatim (`[[Name.png]]`, a raw path, or a URL); `crop: null` deletes.
- Assumed by: Task 9 (Save), Task 13–15 (the entry points pass the seat's stored value).

**Failure half:** an unresolvable or ambiguous name → refused, nothing written; `crop: null` on an absent key → no write; the last key deleted → `{ byImage: {} }` persists (the `homepage.json` `{}` discipline); a foreign top-level key in `crops.json` → preserved by the RMW.

**Negative control:** with the `updateCrops` call in `dropReplacedAsset` removed, the test "replacing a page's cover clears the old cover's crop" goes red; with it restored, green — and the same test asserts the *new* cover's key was not touched, proving the clear is keyed, not a wipe.

**Must agree:** `cropKey`'s answer for `[[Name.png]]` equals `resolveAssetValue('[[Name.png]]', map).rel` for the same map — one test builds a map with `liveAssetMap` and compares the two spellings.

**Steps:**
- [ ] Write the failing tests: set → file holds the key at the resolved path with the clamped zoom; set on an ambiguous name → refused; null → key gone, foreign key kept; the negative control pair; the Must-agree comparison; a URL value keys raw.
- [ ] Implement; run the full gate — expect green.
- [ ] Commit: `feat(nexus): setCrop writes one key; a replaced image takes its crop with it`

#### Gate 1 — the model and the store agree with the disk
- [ ] Gate commands green, exit codes read directly.
- [ ] Derivations re-run against their controls; counts matched, or the divergence rewrote the plan.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `shared/cropGeometry*`, `main/readNexus.ts`, `main/watchPatch.ts`, `main/mutate.ts`, `main/mutatePatch.ts`, `main/paths.ts`, `shared/mutate.ts`, `shared/types.ts`.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in.

---

### Phase 2 — One seat, painted once

#### Task 4: `AssetImage` and the aspect cache

**Requirement:** 3

**Why:** Ten places draw a stored reference with their own `<img>`; a crop can reach none of them. One component that resolves the value, reads the crop, and paints through `coverStyle` when — and only when — a crop exists is the whole feature's consumer side. The gate is Sapphire's: an uncropped image stays a plain `<img>` with its `onError` placeholder and lazy load, and loads no aspect. The aspect cache is `tileWarm.ts`'s shape because a module cache whose late fill must repaint mounted consumers is a problem this renderer already solved once.

**Files:**
- Create: `renderer/src/DesignSystem/Components/AssetImage/AssetImage.tsx` — `AssetImage({ value, className, fallback, preview, style })`.
- Create: `renderer/src/DesignSystem/Components/AssetImage/imageAspect.ts` — `aspectFor(url): number | null | undefined` (undefined = loading), `subscribeAspect(fn): () => void`, one rAF-coalesced notify, `null` for a failed load; `useImageAspect(url)` binding a `useState` bump to the subscription.
- Create: `renderer/src/DesignSystem/Components/AssetImage/assetImage.css.ts` — `box` (background-size/position/color come inline from `coverStyle`; `backgroundRepeat: no-repeat`, `display: block`, `width/height: 100%`).
- Test: `renderer/src/DesignSystem/Components/AssetImage/AssetImage.test.tsx`.

**Interfaces**
- Produces: `AssetImage({ value: string | null | undefined; className?: string; fallback?: ReactNode; preview?: Crop | null; style?: CSSProperties })` — resolves `value` through `useAssetUrl` and `resolveAssetValue`; the crop is `preview ?? tree.crops[key]` where `key` is `rel` for an asset, the raw value for an external URL; no crop → `<img className src loading="lazy" onError→fallback>`; a crop → `<div className={cx(box, className)} style={{ backgroundImage: url(src), ...coverStyle(crop, aspect, boxAspect) }}>` where `boxAspect` comes from a `ResizeObserver`-free source: the seat passes `boxAspect` when it knows it (cards, banners are fixed-height strips whose width the seat can't know) — **see Failure half**.
- Assumed by: Task 6–8 (the seats), Task 9 (the picker passes `preview`).

**Failure half:** `value` empty/unresolved → `fallback ?? null`; the cropped path's image fails to load → `aspectFor` answers `null` → `fallback`; aspect still loading → the plain `<img>` paints meanwhile (no flash of empty box); `boxAspect` unknown → `coverStyle` needs it, so `AssetImage` measures its own box **once on mount and on the asset-map version change only**, through the existing `useHeld`-free `useLayoutEffect` + `getBoundingClientRect` — not per render, not per paint; a seat whose box is a fixed ratio passes `boxAspect` and skips the measure.

**Must agree:** the picker (Task 9) paints its frame through this same component with `preview`, so "what the frame showed" and "what the seat shows" are one code path — one test renders `AssetImage` with a `preview` crop and asserts the inline style equals `coverStyle(preview, aspect, boxAspect)`.

**Steps:**
- [ ] Write the failing tests: no crop → an `<img>` with the resolved URL; a crop in `tree.crops` under the resolved key → a div with `coverStyle`'s three properties; a `preview` overrides the stored crop; a failed load on the cropped path renders `fallback`; the aspect cache keys by URL and notifies once per frame for two resolves.
- [ ] Implement; gate green.
- [ ] Commit: `feat(design-system): AssetImage — a stored image, painted through its crop when one exists`

#### Task 5: The card family — capture thumbs keep their rule, covers take the component

**Requirement:** 3

**Why:** `card-tokens.css:23` top-anchors and zooms every `<img>` in a thumb, which was written for page captures and catches covers by accident. Re-anchoring it on a capture-only class is what lets an uncropped cover's plain `<img>` render centered and keeps Save-on-an-unmoved-frame from moving anything. The set card and the Cover-mode page card become `AssetImage`; the Preview branch and the nav gallery are untouched captures.

**Files:**
- Modify: `DesignSystem/Tokens/card-tokens.css:23-33` — selector `.page-card-thumb.is-capture img, .nav-gallery-thumb img`.
- Modify: `Detail/Views/Cards/CardsView.tsx` — the set card's `<img>` → `<AssetImage value={set.banner} fallback={placeholder} />`; the page card: `banner === 'cover'` → `<AssetImage value={cover} fallback={placeholder} boxAspect={THUMB_ASPECT}/>` — **no**: the thumb's width varies with the column, so no `boxAspect`; `banner === 'preview'` → the existing `<img src={thumbSrc}>` inside `.page-card-thumb.is-capture`; the `failed` latch and `lastSrc` reset apply to the preview branch only.
- Modify: `NavWindow/NavGallery.tsx` — no change (always a capture; the selector still matches `.nav-gallery-thumb img`).
- Modify: `Detail/Views/Cards/CardsView.css` — `.page-card-thumb > *` sizing if the `AssetImage` div needs `width/height: 100%` beyond its own class (it doesn't; verify).

**Derivation**
- `rg -F ".page-card-thumb img" Pommora/src` → 1 (`card-tokens.css`). `rg -F "--cover-zoom" Pommora/src` → 3 (`card-tokens.css` ×2, `navGallery.css`). Control: `rg -F ".page-card-thumb" Pommora/src` → 8.

**Survivors:** `--cover-zoom`, `object-position: top`, `transform-origin: top left`, `-webkit-user-drag: none` — all stay, scoped to captures. The set card gains the `failed` reset it lacked (the component owns it).

**Steps:**
- [ ] Make the edits; `npm run test` green (CardsView tests that assert an `<img>` in Cover mode are inverted to assert `AssetImage`'s output).
- [ ] Launch the dev app; a Cover-mode card with no crop shows the cover centered, a Preview-mode card unchanged; a set card's banner renders.
- [ ] Commit: `refactor(cards): covers paint through AssetImage; the capture rules keep to captures`

#### Task 6: The banner family — Banner, PageHeader, PageEmbed, NavView

**Requirement:** 3

**Why:** Four seats, one class each, all `object-fit: cover` on a 230px strip. Each holds the stored value one line above its `<img>`, so the swap is two lines per seat. NavView passes the *resolved* value (`ownBanner ?? homeBanner`) because the crop belongs to whichever image is showing.

**Files:**
- Modify: `Detail/Banner/Banner.tsx` (the banner `<img>` only — the homepage inline icon is Task 7), `MarkdownPM/PageHeader.tsx`, `Embeds/PageEmbed.tsx`, `Tabs/NavView.tsx` — `<img className="banner-img|mdpm-banner-img" src=…>` → `<AssetImage value={…} className="banner-img|mdpm-banner-img" />`; the `useAssetUrl` line stays only where the seat still branches on `src` being null (`PageEmbed`'s early return, `Banner`'s empty branch) — otherwise it's deleted.
- Modify: `Detail/Banner/Banner.css:14-19`, `MarkdownPM/Styles.css:206-211` — the rules apply to a div now; `object-fit` is inert on it and harmless; leave the rule as is.

**Derivation**
- `rg -F 'className="banner-img"' Pommora/src` → 2; `rg -F 'className="mdpm-banner-img"' Pommora/src` → 2. Control: `rg -F "useAssetUrl(" Pommora/src` → 13 at planning time; expect 13 − (seats that drop the line) after.

**Steps:**
- [ ] Make the edits; gate green.
- [ ] Dev app: a Collection banner, a page header, a page embed, NavView — all render as before with no crop.
- [ ] Commit: `refactor(banner): every banner strip paints through AssetImage`

#### Task 7: The icon family — NexusPhoto, EntityGlyph, SettingsScaffold, the homepage inline icon

**Requirement:** 3

**Why:** Four seats show the profile image, three as circles; today they read a baked PNG. On `AssetImage` they read the original through the circle crop the picker writes in Task 15, and until then they render the baked file unchanged under `DEFAULT_CROP` — the migration costs nothing.

**Files:**
- Modify: `Sidebar/NexusPhoto.tsx`, `Navigation/EntityGlyph.tsx`, `Components/Detail/SettingsScaffold.tsx`, `Detail/Banner/Banner.tsx` (`homeIcon`) — `<img …>` → `<AssetImage value={profileImage} className={…} style={dim} boxAspect={1} />`; the circular seats' existing classes (`photoImg`, `entity-glyph-photo`, `banner-home-icon`, `headerPhotoImg`) keep their radius and sizing.

**Derivation**
- `rg -F "useAssetUrl(profileImage)" Pommora/src` → 3; `rg -F "useAssetUrl(nexus?.profileImage)" Pommora/src` → 1. Control as Task 6.

**Steps:**
- [ ] Make the edits; gate green; dev app: ribbon photo, nav list glyph, settings header, homepage title icon all unchanged.
- [ ] Commit: `refactor(identity): the nexus photo paints through AssetImage on every seat`

#### Gate 2 — ten seats, no visible change
- [ ] Gate commands green.
- [ ] `rg -F "<img" Pommora/src/renderer` → the captures (`NavGallery`, the Preview branch), `WebpageEmbed`, `PhotoCropModal` (dies in Task 9), and nothing else; the count is recorded in the Log.
- [ ] Simplification and review against `<base>..HEAD` scoped to `AssetImage/`, the seven seat files, `card-tokens.css`.
- [ ] The running app seen: every seat renders as before; no crop exists yet so no paint changed except Cover-mode cards and set banners now centered (the one-time reframe, named in the acceptance).
- [ ] Progress hashes filled in.

---

### Phase 3 — The picker

#### Task 8: Two Lucide glyphs join the registry

**Requirement:** 4

**Why:** The corner glyphs go through `IconName`-typed props; `rotate-ccw` and `pipette` render today only through the fallback that pulls the whole Lucide set. Two registry lines keep them on the curated path.

**Files:** Modify: `DesignSystem/Symbols/index.tsx` — import `RotateCcw`, `Pipette`; add `'rotate-ccw': RotateCcw`, `pipette: Pipette`.

**Steps:**
- [ ] Add; `npm run typecheck` 0; commit: `feat(symbols): reset and pipette glyphs`

#### Task 9: `PhotoCropModal` becomes `ImagePicker`

**Requirement:** 4, 6

**Why:** The picker stops rasterizing. Its frame is an `AssetImage` at frame size with a `preview` crop, inside the existing masked surround and ring — so it shows the seat's exact paint, and every line of canvas, `nat`, `imgLeft`, `OUTPUT` and `choose()` deletes rather than generalizes. Panning rides the app's one gesture primitive with `panDelta`; zoom rides the house `Slider` (the Cards Scale precedent) and a wheel handler; the shape is the mask and ring only. The footer is the path-echo recipe two settings fields already share. What survives of the old component is its material: scrim, panel, viewport, surround, ring, message, actions.

**Files:**
- Rename (`git mv`): `DesignSystem/Components/PhotoCropModal/PhotoCropModal.tsx` → `DesignSystem/Components/ImagePicker/ImagePicker.tsx`; `photoCropModal.css.ts` → `imagePicker.css.ts`.
- Modify: `ImagePicker.tsx` — props `{ value: string; crop: Crop | null; shape: 'circle' | 'rect'; boxAspect: number; onCancel: () => void; onSave: (crop: Crop) => void | Promise<void> }`; local state `draft: Crop` (from `crop ?? DEFAULT_CROP`), `busy`, `dragging`; frame `W = FRAME_W` (KNOB, 280) × `H = round(W × boxAspect)` for rect, `W = H = 280` for circle (the current `VIEWPORT`, the ring inset as today); `<AssetImage value preview={draft} boxAspect className={s.frameImage} />` inside `viewport`; surround mask: circle → the existing radial gradient; rect → a `linear-gradient` mask inset by the ring's rect (one expression, same `maskImage` property); ring radius `50%` | `12px` (KNOB); pan: `usePointerGesture` with `activation: 0`, `capture: true`, `onActivate` snapshots `{ anchor: draft, boxW: viewport.getBoundingClientRect().width, sx, sy }`, `onDragMove` sets `draft = panDelta(anchor, draft.zoom, aspect, boxAspect, boxW, ev.clientX − sx, ev.clientY − sy)`, `teardown` clears `dragging`; zoom: `<Slider value={draft.zoom} min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} ariaLabel="Zoom" onInput onCommit format={v => `${v.toFixed(2)}×`} />`; `onWheel` on the viewport: `draft.zoom = clampZoom(zoom × exp(−deltaY × (ctrlKey ? PINCH_RATE : SCROLL_RATE)))` with `preventDefault` (the two rates are KNOBs); corner glyphs: two `<Button size="button-inline" paddingX="0" icon iconSize="control" ghostRest className={s.cornerGlyph} aria-label>` — Reset sets `draft = DEFAULT_CROP`, Background calls `colorInput.current.showPicker()`; a visually-hidden `<input type="color" value={draft.color ?? '#000000'} onInput={e => draft.color = e.currentTarget.value}>` always mounted inside the viewport; error: `useImageAspect(url) === null` → `<span className={s.message}>Couldn’t load that image.</span>` and Save disabled; footer: `<Button type="filled" label="Cancel">`, `<InputField chrome="bordered" capped leading={<Icon name="image" size="body" />}><NavTrail segments={pathSegments(rel)} /></InputField>` where `rel` is the resolved asset path (or the raw URL for an external value), `<Button type="tinted" label="Save" disabled={busy || aspect == null}>`; Escape → `onCancel` (existing listener); backdrop click → `onCancel` (existing).
- Modify: `imagePicker.css.ts` — delete `slider`; `ring` loses its hard radius (inline per shape); add `cornerGlyph` composing `accessoryButton` with `&&&` `color: c.label.secondary` (the `bottomRow` precedent); `frameImage` (`position: absolute; inset: 0`); `colorInput` (visually hidden, still in the DOM); `footer` extends `actions` with the field taking `flex: 1`.
- Delete: the header comment; `VIEWPORT/CIRCLE/RADIUS/INSET/OUTPUT`; `imgRef`, `nat`, `offset`, `drag`, the pointer handlers; `choose()`; the `<img>`; the raw `<input type="range">`.
- Modify: both mounts — `Sidebar/NexusPhoto.tsx`, `Components/Detail/SettingsScaffold.tsx` — temporarily to the new props (`shape="circle" boxAspect={1}`), on the *still-baked* `profileImage` value with `onSave` writing `setCrop`; Task 15 finishes the flow.
- Test: `DesignSystem/Components/ImagePicker/ImagePicker.test.tsx` — the frame is an `AssetImage` with the draft as `preview`; Reset returns the draft to `DEFAULT_CROP`; a wheel with `ctrlKey` multiplies zoom and clamps; Save calls `onSave` with the clamped draft and is disabled while the aspect is null; Escape cancels; the color input's `input` event lands on `draft.color`.

**Derivation**
- `rg -F "PhotoCropModal" Pommora/src` → 6 at planning time (the component, its css import, two mounts, two imports). After: 0. Control: `rg -F "GlassWindow" Pommora/src` → ≥ 6.

**Interfaces**
- Produces: `ImagePicker({ value, crop, shape, boxAspect, onCancel, onSave })`.
- Assumed by: Task 13 (`useBannerMenu` mounts it), Task 14 (the card), Task 15 (`useNexusIcon`).

**Failure half:** `value` unresolvable → the error state on open, Save withheld; `showPicker()` throwing (no gesture, detached) → caught, nothing happens; `onSave` rejecting → `busy` clears, the picker stays open.

**Survivors:** `backdrop`, `panel`, `title` ("Move and Scale" → the title reads the noun the seat passes? — **no**: the title is dropped; the path echo names the image), `viewport`, `grabbing`, `surround`, `message`, `actions` — reused as they stand.

**Steps:**
- [ ] `git mv` the two files; rewrite per the Files block; write the tests; gate green.
- [ ] Dev app (Task 15's flow isn't in yet): temporarily open the picker from the ribbon's Change Photo on the existing baked icon — drag, zoom, wheel, pinch, Reset, Background → the macOS panel opens with its loupe; Save writes `crops.json`; the ribbon photo repaints through the crop.
- [ ] Commit: `refactor(design-system): PhotoCropModal becomes ImagePicker — the frame is the seat's own paint`

#### Task 10: The Showcase and the ledger learn the picker

**Requirement:** 4

**Why:** A design-system shape that never lands on the deployed roster is a shape nobody finds before hand-rolling a parallel; `PhotoCropModal` never landed there, which is how it stayed the icon's alone.

**Files:**
- Modify: `DesignSystem/Showcase/leaves/ComponentsLeaf.tsx` — one `<PopupButton label="ImagePicker">` in the Popups switcher opening the picker on a bundled sample (`shape` toggled by a second button: circle / rect 3:1).
- Modify: `.claude/Features/DesignSystemPM.md` — Pickers table row `| ImagePicker | \`ImagePicker\` | Frames a stored image — a focal point and a zoom — as a circle or a rect cut to its seat. |`; the GlassWindow row's "the crop modal" → "the image picker"; a `#### AssetImage` line under Components or a row in the nearest table: "the one element that draws a stored image, through its crop when one exists".

**Steps:**
- [ ] Add; `npm run build` 0; commit: `docs(design-system): ImagePicker and AssetImage on the roster`

#### Gate 3 — the picker, seen running
- [ ] Gates green.
- [ ] Simplification and review against `<base>..HEAD` scoped to `ImagePicker/`, `Symbols/index.tsx`, `ComponentsLeaf.tsx`.
- [ ] The running app: circle and rect frames; the color panel; Reset; the slider readout; Escape during a live drag does not close the picker, Escape idle does.
- [ ] Progress hashes filled in.

---

### Phase 4 — The entry points, each landing once

#### Task 11: `useBannerMenu` mirrors its channel and owns the picker

**Requirement:** 5

**Why:** Edit lands once only if the hook is the one place a banner menu pops. Today it can't be — the three hand-spelled flows each pass an option the bare hook can't express (`add`, `noun`, `noRemove`) and the two card ones wrap the pop in `GhostSuppress`. Widening the hook to its own channel's options and letting it consume the Context itself makes the fold three deletions and adds the picker mount in the one place every seat then shares.

**Files:**
- Modify: `shared/identityMenus.ts` — `BannerMenuAction = 'change' | 'edit' | 'remove'`.
- Modify: `shared/bridge.ts` `nexus:bannerMenu` args — `{ noRemove?, noun?, add?, edit? }`.
- Modify: `main/index.ts` `nexus:bannerMenu` — `...(opts?.edit ? [{ label: \`Edit ${noun}\`, click: pick('edit') }] : [])` between Change and Remove.
- Modify: `Detail/Banner/useBannerMenu.ts` — signature `useBannerMenu(path, kind, { value, noun?, noRemove?, boxAspect, onDone? })` where `value` is the seat's stored image (or null) and `boxAspect` a getter; `add = !value`, `edit = !!value`; `const hold = useContext(GhostSuppress)` wrapping the pop; `editing` state; `openMenu` routes `'edit'` → `setEditing(true)`; returns `{ openMenu, addOrChange, picker }` where `picker` is the mounted `<ImagePicker value crop={tree.crops[key]} shape="rect" boxAspect onCancel onSave={crop => mutate({ op: 'setCrop', image: value, crop }).then(onDone)} />` or null.
- Modify: the three existing callers — `Banner.tsx`, `PageHeader.tsx`, `PageEmbed.tsx` — pass `{ value, boxAspect: () => el.width / 230 }` and render `{picker}`.
- Modify: the three twins — `CardsView.tsx` set card and page-card thumb, `NavView.tsx` — replace the hand-spelled blocks with the hook (`noun`, `noRemove: !ownBanner` for NavView, `onDone: onRefreshValues` for the page card); NavView passes `value: ownBanner ?? homeBanner`.
- Test: `Detail/Banner/useBannerMenu.test.tsx` — `edit` offered only with a value; `'edit'` opens the picker; Save writes `setCrop` with the seat's stored value; the ghost wrap is called.

**Derivation**
- `rg -F "window.nexus.bannerMenu(" Pommora/src` → 4 at planning time; after: 1 (the hook). Control: `rg -F "useBannerMenu(" Pommora/src` → 4 → 7 after.

**Failure half:** `value` present but unresolvable → Edit offered, the picker opens into its error state (the seat shows nothing either); NavView with no own banner and no homepage banner → no menu items beyond Add.

**Steps:**
- [ ] Write the failing hook test; make the edits; gate green; the CardsView tests that spelled the flow inline are inverted.
- [ ] Dev app: a set card's banner menu, a page card's Cover menu, NavView's banner menu, the Collection banner, the page header, a page embed — all offer Edit when an image exists and open the picker at the right proportions.
- [ ] Commit: `refactor(banner): one hook pops every banner menu, and Edit lands in it`

#### Task 12: Edit Image on the card menu

**Requirement:** 5

**Why:** Nathan's call: the card's own right-click reaches the framing without aiming at the band. It's a separate literal so the four other menus over `PageMetaAction` stay untouched, and it's gated on Cover mode with a cover present because a Preview thumb is a capture.

**Files:**
- Modify: `shared/cardMenu.ts` — `CardMenuAction |= 'image:edit'`; `CardMenuContext.editableImage?: boolean`; `popCardMenu` (`main/cardMenu.ts`) inserts `{ label: 'Edit Image', click: pick('image:edit') }` after the Add Property block when `ctx.editableImage`.
- Modify: `CardsView.tsx` `onCardContextMenu` — passes `editableImage: banner === 'cover' && !!cover`; routes `'image:edit'` → the same `setEditing(true)` the thumb's hook exposes (the page card already holds the hook from Task 11; expose `openEditor` from it).
- Test: `shared/cardMenu.test.ts` — the item appears only with `editableImage`.

**Steps:**
- [ ] Test, edits, gate green; dev app: Edit Image appears on a Cover-mode card with a cover, not in Preview or None.
- [ ] Commit: `feat(cards): Edit Image on the card menu`

#### Task 13: The nexus icon joins the model; the byte pipeline dies

**Requirement:** 5, 6

**Why:** The one flow that carries bytes over IPC exists only because the icon baked its crop. On the path model `setProfileImage` is `setBanner`'s navview arm with a different field, and `writeNexusIcon`, `decodeImageDataUrl`, `nexus:imageData`, `readImageData` and `pickedImagePaths` have nothing left to vary. Add / Change Photo writes the path and opens the picker on the stored value; Edit Photo opens it directly.

**Files:**
- Modify: `shared/mutate.ts` — `{ op: 'setProfileImage'; source: string | null }`.
- Modify: `main/mutate.ts` — the arm on the four-line navview shape (`prev = assetFileToDelete(root, existing?.profile_image)` → `adoptFile(root, source, { allow: 'image' })` → `updateSettings(setOrDrop(...'profile_image', adopted))` → `dropReplacedAsset`); delete `decodeImageDataUrl`, `NEXUS_ICON`, `writeNexusIcon`, and the `atomicWriteBinary` import if unused.
- Modify: `main/index.ts` — delete `pickedImagePaths`, `readImageData`, `IMAGE_DATA_MAX`, the `nexus:imageData` handler; `pickFilePath` no longer branches on `opts.any` for the image set.
- Modify: `shared/bridge.ts` — delete `nexus:imageData`; `preload/index.ts` — delete `imageData`.
- Modify: `shared/identityMenus.ts` — `NexusIconAction |= 'editPhoto'`; `main/index.ts` `nexus:iconMenu` — `{ label: 'Edit Photo', click: pick('editPhoto') }` when `hasPhoto`.
- Modify: `Components/useNexusIcon.ts` — `addPhoto`: `pickFile()` → `mutate({ op: 'setProfileImage', source })` → `setEditing(true)`; `editPhoto` → `setEditing(true)`; `removePhoto` → `source: null`; `selectGlyph` → `source: null`; returns `picker` mounted on `tree.nexus.profileImage` with `shape="circle" boxAspect={1}` and `onSave` → `setCrop`.
- Modify: `Sidebar/NexusPhoto.tsx`, `Components/Detail/SettingsScaffold.tsx` — render `{picker}` in place of their own mounts.
- Test: `main/mutate.test.ts:505-555` replaced by the `setBanner`-shaped battery for the profile: adopt lands under the asset root and names it; a replaced `.nexus/assets` file is deleted, one under the configured root is not; `null` clears; a non-image is refused.

**Derivation**
- Every token in Dead Vocabulary → 0 after; `rg -F "'nexus:imageData'" Pommora/src` → 3 at planning time (bridge, preload, main). Control: `rg -F "'nexus:pickFile'" Pommora/src` → 3.

**Failure half:** a nexus whose `profile_image` names the old baked `nexus-icon.png` → renders identically under `DEFAULT_CROP` (it's a 512² square in a circle); Add Photo cancelled at the dialog → nothing written, no picker; adoption refused → the error surfaces through the existing `showError` path and no picker opens.

**Negative control:** the test "a replaced profile image under the configured root survives" goes red if `dropReplacedAsset` is called with the raw path instead of `assetFileToDelete`'s answer.

**Steps:**
- [ ] Write the replacement tests; make the edits in one commit (the hazard window); gate green.
- [ ] Dev app: Add Photo → picker opens as a circle on the adopted file; Save; all four icon seats framed; Remove Photo clears; `settings.json` names the file; no `nexus-icon.png` minted.
- [ ] Commit: `refactor(identity): the nexus photo is a path and a crop; the byte channel is gone`

#### Gate 4 — every entry point, seen running
- [ ] Gates green.
- [ ] Dead Vocabulary sweep run against its control; recorded in the Log.
- [ ] Simplification and review against `<base>..HEAD` scoped to Phase 4's files.
- [ ] The running app: the acceptance criterion, in full, in the live nexus.
- [ ] Progress hashes filled in.

---

### Phase 5 — The record

#### Task 14: `CardViewPM` — the band menu and the resolved prospect
**Requirement:** 6 · **Files:** `.claude/Features/CardViewPM.md` Card Image + Prospects — one sentence each per Made False. Commit: `docs(cards): covers are framed through the picker`.

#### Task 15: `ConfigurationPM` — the profile image is a path and a crop
**Requirement:** 6 · **Files:** `.claude/Features/ConfigurationPM.md` Profile — one sentence. Commit: `docs(configuration): the profile image rides the asset model`.

#### Task 16: The planning documents that name `PhotoCropModal`
**Requirement:** 6 · **Files:** `Codebase-Cleanup-Checklist.md:99`, `Buttons-Spec.md:41, 51` — the name and the button pair. Commit: `docs(planning): the crop modal is the ImagePicker`.

#### Task 17: `ArchitecturePM`, `PagesPM`, `ContextPM`, History
**Requirement:** 6 · **Files:** `ArchitecturePM.md` `.nexus/` listing gains `crops.json — per-image framing (focal point, zoom, background), keyed by the image`; `PagesPM.md` one clause on `cover`; `ContextPM.md` Part 3 line ticked and the standing paragraph rewritten; `HistoryPM.md` a BRIEF entry per `History-Format.md`. Commit: `docs: Part 3 of the file-based arc`.

#### Gate 5 — closeout
- [ ] `/closeout` over the whole diff (simplify → verify → purge → reconcile).
- [ ] Delivery Claim written; neutral verifier dispatched with the claim, the spec, this plan, and the range; then the attack pass; then the interface pass against the running app.
- [ ] Dead Vocabulary sweep at zero against its control.
- [ ] Lessons routed; `HandoffPM.md` updated; pushed.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — the model and the store · base `<commit>`
  - [ ] Task 1 — cropGeometry · `<commit>`
  - [ ] Task 2 — the crops leaf · `<commit>`
  - [ ] Task 3 — setCrop and the orphan · `<commit>`
- [ ] **Phase 2** — one seat, painted once
  - [ ] Task 4 — AssetImage · `<commit>`
  - [ ] Task 5 — the card family · `<commit>`
  - [ ] Task 6 — the banner family · `<commit>`
  - [ ] Task 7 — the icon family · `<commit>`
- [ ] **Phase 3** — the picker
  - [ ] Task 8 — glyphs · `<commit>`
  - [ ] Task 9 — ImagePicker · `<commit>`
  - [ ] Task 10 — the roster · `<commit>`
- [ ] **Phase 4** — the entry points
  - [ ] Task 11 — useBannerMenu · `<commit>`
  - [ ] Task 12 — Edit Image · `<commit>`
  - [ ] Task 13 — the icon on the model · `<commit>`
- [ ] **Phase 5** — the record
  - [ ] Tasks 14–17 · `<commit>`

### Rulings
### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- Sapphire reading `.nexus/crops.json` as its crop source.
- The file property's chip opening the picker.
- Pruning crops whose image no longer resolves.
- In-place framing on the banner itself.
### Closeout
