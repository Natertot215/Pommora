## ImagePicker — Implementation Plan

> **Status:** ratified — in execution · Spec: [[ImagePicker — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Any image the nexus shows — a banner, a page cover, a card's cover, the nexus icon — can be framed by hand after it's set: right-click → Edit, move and scale it inside a frame cut to the seat's own proportions, zoom out onto a chosen background, Save. The framing is a focal point and a zoom stored beside the nexus in `.nexus/crops.json`, keyed by the image, so one framing serves every seat that shows the picture, follows the nexus to another device, and never touches the file or the note. `PhotoCropModal` — the nexus icon's private crop dialog that bakes a PNG and ships bytes over IPC — is gone; `ImagePicker` is the design-system component every seat opens, and the icon is one more seat on the same model. This completes the three-part file-based arc.

The shape is Sapphire's, ported rather than reinvented: `cropGeometry.ts` is the one producer of a framed image's paint, shared by the editor and the seats so they cannot disagree; the paint is gated on a crop existing, so the ten seats that draw a stored reference keep their plain `<img>` until someone frames them. The alternatives — a baked derivative per seat, per-owner crop keys in frontmatter, `nexus.db` as the store, a hex field or the ramp grid for the background, Chromium's `EyeDropper` (absent in Electron 42) — were weighed in the decision log and rejected there; Nathan ratified every decision below. The lightest transformation of what exists is the measure: every task names the mechanism it rides, and a task that would add a parallel is wrong as written.

What this is not: rotation, filters, pixel editing; per-view image-fit or aspect settings on Cards; any change to page-capture thumbnails, which are not pickable images.

**Ruling (Nathan, 08-25) — the frame is the viewport for `rect`; `circle` keeps its current geometry.** For `rect` (banners, card covers) the viewport *is* the frame — `280 × round(280·boxAspect)`, ring at inset 0, radius `12px`, no blurred margin — so the picker shows the seat's exact paint, per the mockup. For `circle` (the nexus icon and the rounded profile photo) the picker keeps `PhotoCropModal`'s current shape: a `220` circle inside the `280` viewport with the masked-surround blur, ring radius `50%`. Both shapes drive the same crop model — `coverStyle` resolves against the circle's `220` box or the rect's own box — so the split is display-only; the surround is a decorative second paint the circle keeps and the rect drops.

**Requirements**

1. `shared/cropGeometry.ts` — `DEFAULT_CROP`, `MIN_ZOOM` / `MAX_ZOOM`, `clampZoom`, `coverStyle`, `panToCrop`, `panDelta` — pure, tested; the `crop` and `cropsFile` codecs in `shared/schemas.ts`; one `cropKeyFor` rule in `shared/`.
2. `.nexus/crops.json` read at open as `tree.crops`, patched live by the watcher, written by one `updateCrops` owner through `setCrop { image, crop | null }`, `dropReplacedAsset`, and `migrateAssets`.
3. `AssetImage` replaces the ten `<img>` seats that draw a stored reference: a plain `<img>` with no crop, the `coverStyle` box with one, its box observed on the cropped path only; a URL-keyed natural-aspect cache with a repaint on resolve; the seats' dead `img` rule bodies deleted.
4. `setProfileImage` carries a path; the byte pipeline is deleted; Edit Photo on the icon menu.
5. `ImagePicker` (`open`, `circle` | `rect`, `boxAspect`), panning on `beginPointerGesture`, zoom on the house `Slider` plus a native wheel listener, zoom-out to `MIN_ZOOM`, corner glyphs Reset and Background (native `<input type="color">`), footer Cancel · path echo · Save; error state with Save withheld; one Showcase mount; one `DesignSystemPM` row each for `ImagePicker` and `AssetImage`.
6. Edit on the banner menu through a widened `useBannerMenu` the three hand-spelled flows fold onto; Edit Image on the card menu.
7. `PhotoCropModal` deleted; every Made False row rewritten in its falsifying commit; History PM-115; `ContextPM` and `HandoffPM` current; the dead-vocabulary sweep at zero against its control.

**Acceptance — the whole thing working:** In the live nexus, right-click a Collection banner → Edit Banner → drag it, zoom to 0.6, pick a background from the image, Save. The banner repaints framed with that background; the same image set as a page's cover shows the same framing in the page header, the page embed, and a Cover-mode card; `.nexus/crops.json` holds one entry keyed by that file's nexus-relative path and the `.md`, the sidecar and the image file are byte-identical to before; quit and relaunch, and it's still framed; hand-edit the JSON's `zoom` while the app runs and the banner follows; narrow the window and the framed banner still covers its strip. Right-click the ribbon's nexus photo → Add Photo → pick a file → the picker opens on it as a circle; Save; the ribbon, the nav list, the settings header, and the homepage title all show that framing, `settings.json`'s `profile_image` names the adopted file, and no `nexus-icon.png` was minted. `rg -F PhotoCropModal Pommora/src` → 0.

**Forced By**

- Every stored image field holds `[[Name.ext]]`, never a path → the crop key is what resolution answers — the nexus-relative path for a file, the raw string for a web address — spelled **once** in `shared/` (`cropKeyFor`), fed by `assetFilePath` main-side and `resolveAssetValue` renderer-side; `main` imports nothing from `@renderer`, so the web-address test leaves `assetUrl.ts`.
- `coverStyle`'s fill axis is chosen from `boxAspect`, and the banner strip and the card thumb change ratio with the window → the cropped path **observes** its box (`ResizeObserver`, the `PaneSlider.tsx:72` shape); no seat passes a `boxAspect` to `AssetImage`; the uncropped path needs no box.
- Neither card `<img>` carries a className; `card-tokens.css:23` (`.page-card-thumb img`) is the only rule sizing them → `AssetImage` carries one `fill` class on both paths, which subsumes `Banner.css:14-19`, `Styles.css:206-211`, `nexusHeader.css.ts:24-29`, and the sizing halves of `settingsPane.css.ts:100-105` and `entityGlyph.css:1`.
- `useNavThumbnails.ts:21` queries `.banner-img` to pick the capture's mask fill → the banner classNames survive as DOM hooks on whatever element `AssetImage` renders. `:27-33` awaits every `<img>`'s `decode()` before a shot; while an aspect loads the seat *is* an `<img>`, and the box that replaces it paints from the same cached bytes — nothing further to await.
- `migrateAssets` (`main/assetMigrate.ts:147`) runs at every open and rewrites six stores from `result.moved` → `crops.json` is the seventh; E-7's accepted orphan is for *external* renames only.
- `AssetMap.version` bumps on `change` only → the aspect cache keys by the resolved URL; an external replace-under-the-same-name keeps the old aspect until relaunch — accepted.
- `nexus-asset://` responses carry no CORS header → no canvas reads a served image; the picker paints with CSS.
- `EyeDropper` is `undefined` in Electron 42 (probed) → the Background glyph drives `<input type="color">.showPicker()`; the input stays mounted (`showPicker()` throws off-DOM or outside a gesture).
- React registers `wheel` passively at the root → the zoom wheel is a native listener on the viewport ref with `{ passive: false }` (`OverScroll.tsx:62-71`).
- No write Pommora makes is visible to its own watcher → every `crops.json` writer confirms itself; `routeMutation` sees only `(root, req, reply: MutateOutcome)`, so a banner write's confirmer chains `patchCropsFromDisk` **unconditionally** after its own leaf (the `createContainer` shape at `mutatePatch.ts:180-188`).
- `rmwJsonStrict` always writes → "no write on a no-op" is not a property the store has; the file is rewritten byte-identical.
- `serializeOnFile` keys on the literal path string and is non-reentrant → `NEXUS_CONFIG_FILES.crops` is the only builder, through `updateNexusConfig`.
- `shared/schemas.ts` uses `.catch(undefined)` as its read-side coercer → the crops codec drops a malformed entry the same way, and `readCropLeaves` is one filter.
- `beginPointerGesture` swallows Escape only while `active` and only with `swallowActiveEscape` → the pan sets it; a live pan eats Escape, an idle picker closes on its own listener. `Slider` captures its own pointer and never enters the singleton → a scrub never collides with a pan.
- `pageMetaMenuItems` is switched over by four other menus → Edit Image is its own `CardMenuAction` literal in `cardMenuModel`.
- `GhostSuppress` defaults to a pass-through → `useBannerMenu` consumes it internally.
- `IconPicker` is mounted by each seat on an `open` prop the hook drives → `ImagePicker` takes `open`; the hooks return state, never JSX.
- `AccessoryButton.icon` is `IconName`-typed → `rotate-ccw` and `pipette` join the registry.
- Sapphire's `startPan` discards a mid-drag zoom → `panDelta` reads the live zoom and anchors on the gesture-start crop plus the total delta.
- `add` and `edit` on the banner menu are one bit (`!value` / `!!value`) and every caller becomes the hook → Edit is offered unconditionally in the non-Add branch; the channel's arg type is untouched.

**Inherited Reasoning**

- A baked derivative per seat · per-owner keys in frontmatter · `nexus.db` · canvas sampling · the `EyeDropper` API · a per-seat or per-view aspect ratio · a `boxAspect` prop on `AssetImage` · widening `assets:adopt` · `useSyncExternalStore` · `<img>` + `object-position` for the cropped path · a hook returning JSX · a conditional second confirmer through `MutateOutcome` · a `MutationObserver` in the capture gate · Sapphire's border-sample proposal — each rejected, reason in the decision log or the Forced By above. Don't retry them.

**Grounding** *(re-open these; don't cite them)*

- `.claude/Planning/ImagePicker — Decision Log.md` — the ratified spec; its Sources block is the file map.
- `../Sapphire/src/ui/cropGeometry.ts`, `src/ui/cropModal.ts:160-184`, `src/native/coverCrop.ts:56-72, 252-262`.
- `main/readNexus.ts:276-283, 357-358, 611-617, 702` · `main/watchPatch.ts:57, 131-143, 195-201, 253-256, 456-461` · `main/mutatePatch.ts:36-38, 123-201, 231-250` · `main/index.ts:452, 505-525, 749-790, 1630-1640, 1790-1847` · `main/assetMigrate.ts:23-35, 147-210`.
- `main/mutate.ts:99-121, 132-193, 249-259, 460-477, 486-564` · `main/settings.ts:24-31, 116-125` · `main/io/atomicWrite.ts:17-24, 71-89, 125-133` · `main/io/fileLock.ts:7-33` · `main/assetRoots.ts:34-53`.
- `shared/mutate.ts:31, 53-140` · `shared/types.ts:370-379, 403-406` · `shared/schemas.ts:1-14, 25-85` · `shared/schemas.test.ts` · `shared/identityMenus.ts` · `shared/cardMenu.ts` + `main/cardMenu.ts` · `shared/bridge.ts:317-330, 350, 389` · `shared/nexusPaths.ts`.
- `renderer/src/store.ts:202-213, 907-916, 1794-1895` · `renderer/src/assetUrl.ts` · `renderer/src/App.tsx:134` · `renderer/src/Navigation/useNavThumbnails.ts:18-33, 72-74`.
- The ten seats (Decision Log Sources) · `Detail/Banner/useBannerMenu.ts` · `Detail/Views/Cards/CardsView.tsx:102-103, 1010-1031, 1340-1345, 1381-1410, 1413-1451` · `Tabs/NavView.tsx:24-48, 58-62` · `Components/useNexusIcon.ts` · `Sidebar/NexusPhoto.tsx:49-62` · `Sidebar/nexusHeader.css.ts:8-29` · `Components/Detail/SettingsScaffold.tsx:26-38, 57-88` · `Components/Detail/settingsPane.css.ts:100-106` · `Navigation/entityGlyph.css:1-5` · `Detail/Views/useGhostAnchor.ts:22-25, 57-60, 166-176`.
- `DesignSystem/Components/PhotoCropModal/*` · `DesignSystem/Interactions/gesture.ts:10-52, 180-186, 219-227` · `Embeds/ConnectionHoverCard.tsx:150-199` · `DesignSystem/Interactions/OverScroll/OverScroll.tsx:60-72` · `DesignSystem/Components/PaneSlider/PaneSlider.tsx:68-76` · `DesignSystem/Components/Controls/Slider/Slider.tsx:13-33, 74-80` + `Components/Detail/ViewSettings.tsx:209-220` · `DesignSystem/Components/Controls/Button/Button.tsx:9-34` + `button.css.ts:52-89` · `DesignSystem/Components/Menu/Menu.tsx:158-193` + `menu.css.ts:178-181, 237-239` · `DesignSystem/Components/Fields/InputField.tsx` · `Settings/AssetDirectoryRow.tsx` · `DesignSystem/Elements/NavTrail/NavTrail.tsx:80-84` · `DesignSystem/Symbols/index.tsx:83-168, 231-238` · `DesignSystem/Tokens/card-tokens.css:23-44` · `NavWindow/navGallery.css:5, 62-68` · `Embeds/tileWarm.ts` · `DesignSystem/Showcase/leaves/ComponentsLeaf.tsx:11-85`.
- `.claude/Guidelines/Data-Layer.md` · `Cohesion-Rulings.md` · `Adversarial-Review-Log.md` · `../../.claude/references/History-Format.md` · `Context-Format.md` · the `/handoff` skill.

**Environment**

- **Plan directory:** `.claude/Planning`. **Spec input:** the decision log. **`<base>`:** the HEAD hash recorded in Progress before Task 1's first edit; every gate scopes `<base>..HEAD` to the phase's paths.
- **Explorer:** `Explore`. **Simplification:** `code-simplifier`, then `comment-killer-agent`. **Code reviewer:** `feature-dev:code-reviewer`. **Attack reviewer:** `build-breaking-agent`. **Neutral verifier:** `general-purpose`, handed the claim alone. The closing pass is `/closeout`; the session record is `/handoff`.
- **Gates**, from `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint` · `npm run build`. Exit codes read directly. Biome formats every write through the PostToolUse hook; a shell-driven edit runs `npm run format`.
- **Screenshots:** the running dev app (`env -u ELECTRON_RUN_AS_NODE npm run dev` from `Pommora/`; a main-process change needs a restart), captured through `webContents.capturePage` over the Chrome DevTools Protocol on a debugging port this session launched, saved under the scratchpad and read back with the Read tool. Never attach to a port another session owns.
- **Rules directory:** `.claude/Guidelines`.

**Shapes:** additive · removal · refactor · user-visible

**Global Constraints (every task inherits these)**

- Gates as above. A red gate is attributed to its paths before it's believed — a parallel session commits to this branch.
- **Stage explicit paths. Never `git add` a directory, never `git stash`.** Read `git diff --cached --name-only` before every commit; Nathan's hook pre-stages his own doc edits — commit them along, never reset them out.
- Main owns the filesystem; the renderer holds nexus-relative paths and stored values only. Every channel is declared once in `shared/bridge.ts`; IPC returns `Result`, never throws.
- **Reusability first:** before any new symbol, search for what exists; tokens from `DesignSystem/Tokens` only; no new keyframes, scrim, slider, drag primitive, resolver, validator, or writer where one exists.
- **Comments are why-only and near zero.** None narrates, names a value its declaration holds, claims a feature's state, or labels anything pending. A correction to something obvious is written as if it was always intended. `KNOB` markers survive.
- No layout read on a high-frequency path: the paint path measures nothing; the cropped path observes; the pan measures the frame once at gesture start.
- No keyboard shortcut is added without sign-off.
- One commit per task, boxes ticked in the same commit, `type(scope): sentence`. Every derivation is re-run against its control before its task edits; a diverged count rewrites the plan and is logged.
- **Phase gate, in this order and never inverted:** simplification (`code-simplifier`, then `comment-killer-agent`, against `<base>..HEAD` scoped to the phase's paths) → verification (gates; `feature-dev:code-reviewer`; `build-breaking-agent`, same range) → every concern fixed → continue. Phases 2, 3 and 4 additionally require a **screenshot of the running app** captured, read back, and its path recorded in the Log before the gate ticks.
- **After Phase 5's own gate, the whole diff gets a second full pass:** simplification and both reviews over `<base>..HEAD` unscoped, `/closeout`, the Delivery Claim, the neutral verifier, then the attack. Nothing pending, nothing deferred, nothing "for a later session."
- Out of scope everywhere: page-capture thumbnails and `thumbnails.ts`; `assets:adopt` and its bridge entry; `PageMetaAction`; Sapphire's tree; rotation, filters, per-view fit settings.

**Made False** *(each rewrite lands in the commit that falsifies it)*

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `Features/ArchitecturePM.md:79` `.nexus/` layout | no `crops.json` in the listing | `crops.json` exists | 2 |
| `Features/PagesPM.md:21` | `cover — the page's in-detail banner` | a crop keyed by the image frames it | 3 |
| `Features/ConfigurationPM.md:203` Profile | "its image and icon are written from the ribbon's identity menu" | the image is a path write, framed by a crop | 6 |
| `Features/DesignSystemPM.md:206` GlassWindow row | "the crop modal" | it's the image picker | 7 |
| `Features/DesignSystemPM.md:287` Pickers table | no `ImagePicker` row; no `AssetImage` row | both exist | 7 |
| `Planning/Buttons-Spec.md:41, 51, 62` | "the PhotoCropModal pair … the app's only accent-filled button" / "Cancel · Choose" / the move list | Save is `tinted`; the component is `ImagePicker` | 7 |
| `Features/CardViewPM.md:28` Card Image, the band-menu sentence | "Add when the page has no cover, Change / Remove when it does" | Edit joins the band menu | 8 |
| `Features/CardViewPM.md:28` the card-menu list · `:102` | "Open · Rename · Edit Icon …"; "Fit Image / Reposition … v1 is fill-crop" | Edit Image joins the card menu; the prospect ships | 9 |
| `ContextPM.md:5, 11, 48` | the Part 3 paragraph, the unchecked Part 3 line, the Files & Assets line | Part 3 ships | 10 |

**Dead Vocabulary** *(scope `Pommora/src`, `.claude/Features`, `.claude/Planning/Buttons-Spec.md`, `ContextPM.md`)*

- `PhotoCropModal` → 0 · `nexus:imageData` → 0 · `readImageData` → 0 · `decodeImageDataUrl` → 0 · `writeNexusIcon` → 0 · `pickedImagePaths` → 0 · `IMAGE_DATA_MAX` → 0 · `NEXUS_ICON =` → 0 · `Move and Scale` → 0.
- `dataUrl` → 2. Legitimate hits: `Embeds/WebpageEmbed.tsx:128, 132`.
- Control: `adoptFile(` → 23 at planning time. Zero here means the sweep never ran.

**Hazard Window:** Task 6 changes `setProfileImage`'s request shape; between its `shared/mutate.ts` edit and its `useNexusIcon.ts` edit the type gate is red by design. Both land in Task 6's one commit; no task runs between them.

---

### Phase 1 — The model and the store, proven before any seat paints

#### Task 1: The crop model — geometry, codec, and the one key rule

**Requirement:** 1

**Why:** Every surface must produce byte-identical framing from one function, or the picker is a liar. Sapphire's module is that function; it lives in `shared/` because main needs the bounds and the renderer needs `coverStyle`. `panDelta` comes along so the gesture is arithmetic on a snapshot. The codec joins `shared/schemas.ts` because that file *is* the type-and-validator source; the key rule is written once in `shared/` because two processes resolve images and neither may import the other.

**Files:**
- Create: `shared/cropGeometry.ts` — `CoverStyle`, `DEFAULT_CROP`, `MIN_ZOOM = 0.25`, `MAX_ZOOM = 4`, `clampZoom`, `coverStyle`, `panToCrop`, `panDelta`; imports `Crop` from `./schemas`.
- Modify: `shared/schemas.ts` — `crop = z.object({ x: z.number().finite(), y: z.number().finite(), zoom: z.number().finite(), color: z.string().optional() })`; `Crop = z.infer<typeof crop>`; `cropsFile = z.looseObject({ byImage: z.record(z.string(), crop.optional().catch(undefined)).optional().catch(undefined) })`.
- Modify: `shared/nexusPaths.ts` — `WEB_ADDRESS` (moved from `renderer/src/assetUrl.ts:20`) and `cropKeyFor(rel: string | null, raw: string): string | null` = `rel ?? (WEB_ADDRESS.test(raw.trim()) ? raw.trim() : null)`.
- Modify: `renderer/src/assetUrl.ts` — imports `WEB_ADDRESS`.
- Test: `shared/cropGeometry.test.ts`.

**Interfaces**
- `coverStyle(crop, imageAspect, boxAspect): CoverStyle | null` — aspects height ÷ width; null where either is unusable; `backgroundSize` `${zoom*100}% auto` when `imageAspect > boxAspect` else `auto ${zoom*100}%`; `backgroundPosition` `${x*100}% ${y*100}%`; `backgroundColor` `crop.color ?? ''`.
- `panToCrop(crop, dx, dy)`; `panDelta(anchor, liveZoom, imageAspect, boxAspect, boxW, totalDx, totalDy): Crop` — overhang from the *live* zoom and `boxW` (`boxH = boxW × boxAspect`), position from the *anchor* plus the *total* delta; a zero overhang leaves that axis untouched.
- `cropKeyFor(rel, raw)`.
- Assumed by: Tasks 2–5, 7–9.

**Failure half:** `zoom` NaN → 1; out of bounds → clamped; zero or negative `imageAspect` → null; equal aspects take the height branch; `cropKeyFor(null, '')` → null.

**Must agree:** `coverStyle(DEFAULT_CROP, a, b)` is `cover` centered for every `a`, `b` — one test across portrait, square and landscape at aspects 1, 230/900, 104/180.

**Steps:**
- [x] Port; add `panDelta`; the codecs; the key rule; move `WEB_ADDRESS`.
- [x] Tests: both fill branches; the equal-aspect boundary; `zoom` out of bounds; a zero aspect; `panToCrop` clamping at both ends; the Must-agree table; `panDelta` — anchor zoom 1.5, live zoom 2 moves by `totalDx / overhang(2)`, and a total delta back to 0 returns exactly the anchor; `cropKeyFor` for a rel, a URL, and neither.
- [x] Gates green. Commit: `feat(shared): the crop model — a focal point and a zoom, one producer of the paint`

#### Task 2: `.nexus/crops.json` as the `crops` leaf

**Requirement:** 2

**Why:** A crop in the tree reaches every seat the way a homepage banner does — one subscription, one watcher case, one confirmer — and needs no push channel. The homepage leaf is the template line for line.

**Files:**
- Modify: `main/paths.ts` — `crops: 'crops.json'` in `NEXUS_CONFIG_FILES`.
- Modify: `shared/types.ts` — `crops: Record<string, Crop>` on `NexusTree` beside `homepage`.
- Modify: `main/readNexus.ts` — `readCropLeaves(config)` beside `readHomepageLeaves`: `Object.fromEntries(Object.entries(cropsFile.parse(config).byImage ?? {}).filter((e): e is [string, Crop] => !!e[1]))`; one more `readConfig(...)` in the open-time `Promise.all`; `crops: readCropLeaves(cropsConfig)` in the assembly.
- Modify: `main/watchPatch.ts` — `| { kind: 'crops-leaf' }`; the classifier line beside the homepage one; `case 'crops-leaf': return patchCropsFromDisk(root)`; `patchCropsFromDisk(root): Promise<'ok' | 'refresh'>` cloned from `patchHomepageFromDisk`.
- Modify: the four tree fixtures — `shared/treePatch.test.ts`, `renderer/src/store.test.tsx`, `renderer/src/selection.test.ts`, `renderer/src/Navigation/testTree.ts` — `crops: {}`.
- Modify: `.claude/Features/ArchitecturePM.md:79` — `crops.json ← per-image framing (focal point, zoom, background), keyed by the image`.
- Test: `main/watchPatch.test.ts` beside the homepage assertions.

**Derivation**
- `rg -F "homepage-leaf" Pommora/src` → 4; `rg -F "homepage: readHomepageLeaves" Pommora/src` → 2; `rg -F "homepage: {" Pommora/src --glob '*.test.*' --glob 'testTree.ts'` → 4. Control: `rg -F "readHomepageLeaves" Pommora/src` → 4.

**Failure half:** file absent → `{}`; `byImage` missing or not an object → `{}`; an entry failing the codec → dropped, the rest kept.

**Must agree:** walk and patch decode through one `readCropLeaves`; `stabilize(walked, live)` is identity after a crops write (the pattern at `watchPatch.test.ts:102-103`).

**Steps:**
- [x] Failing test: `crops.json` with one valid and one malformed entry → `live.crops` holds the valid one; `classifyEvent` answers `crops-leaf`; `stabilize(walked, live)` is `live`.
- [x] The edits; the fixtures; the doc line; gates green.
- [x] Commit: `feat(nexus): crops.json rides the tree as a leaf`

#### Task 3: `updateCrops` — the one writer; `setCrop`; the orphan; the migration

**Requirement:** 2

**Why:** Three things write `byImage` — a Save, a replaced image, a migration — and one owner of the nested merge keeps them from spelling it three ways. It is `updateSettings` with the file as a parameter. `dropReplacedAsset` already holds the exact path being removed, which is the key; `migrateAssets` already hands over `result.moved`.

**Files:**
- Modify: `main/settings.ts` — `updateNexusConfig(root, file: keyof typeof NEXUS_CONFIG_FILES, mutate)` extracted from `updateSettings`; `updateSettings` its `'settings'` partial; `updateCrops(root, edit: (byImage: Record<string, unknown>) => Record<string, unknown>)` owning the `byImage` merge on `writePersonalization`'s shape (`settings.ts:116-125`).
- Modify: `main/mutate.ts` — the `setCrop` arm: `key = cropKeyFor(await assetFilePath(root, req.image), req.image)`; null → `fault('That image can’t be framed.')`; `updateCrops(root, b => setOrDrop(b, key, req.crop && { ...req.crop, zoom: clampZoom(req.crop.zoom) }))`; `dropReplacedAsset` gains `await updateCrops(root, b => setOrDrop(b, prev, null))` after the `rm`.
- Modify: `main/assetMigrate.ts` — after the move loop, `updateCrops(root, b => …re-keyed by result.moved…)` beside `evictThumbnails`, each `from` rel to the rel the loop computed for its destination.
- Modify: `shared/mutate.ts` — `| { op: 'setCrop'; image: string; crop: Crop | null }`.
- Modify: `main/mutatePatch.ts` — `case 'setCrop': return patchCropsFromDisk(root)`; the `setBanner` and `setProfileImage` arms chain `patchCropsFromDisk(root)` unconditionally after their own confirmer, in the `createContainer` shape.
- Modify: `.claude/Features/PagesPM.md:21` — one clause: `cover` may be framed by a crop keyed to the image.
- Test: `main/mutate.test.ts` beside the `setBanner` battery; `main/assetMigrate.test.ts` one re-key case.

**Interfaces**
- `mutate({ op: 'setCrop', image, crop })` — `image` the stored value verbatim; `crop: null` deletes.
- Assumed by: Tasks 6, 7, 8.

**Failure half:** an unresolvable or ambiguous name → refused, nothing written; `null` on an absent key → the file rewritten byte-identical; the last key deleted → `{ byImage: {} }`; a foreign top-level key → preserved; `crops.json` unreadable → the write fails as the settings write fails.

**Negative control:** with the `updateCrops` call in `dropReplacedAsset` removed, "replacing a page's cover clears the old cover's crop" goes red; restored, green — and the same test asserts the *new* cover's key is untouched.

**Must agree:** `cropKeyFor(await assetFilePath(root, v), v)` equals `cropKeyFor(resolveAssetValue(v, map).rel, v)` for `[[Name.png]]` under one `liveAssetMap`.

**Steps:**
- [x] Failing tests: set → the key at the resolved path with the clamped zoom; an ambiguous name → refused; null → key gone, foreign key kept; the negative-control pair (proven red without the guard); the Must-agree comparison (main-side; renderer-side in Task 4); a URL value keys raw; the migration re-keys a moved file.
- [x] Implement; gates green. Commit: `feat(nexus): one writer for crops.json — Save, a replaced image, and the migration`

#### Gate 1
- [x] Simplification then verification against `<base>..HEAD` scoped to `shared/cropGeometry*`, `shared/schemas*`, `shared/nexusPaths.ts`, `shared/mutate.ts`, `shared/types.ts`, `main/readNexus.ts`, `main/watchPatch.ts`, `main/mutate.ts`, `main/mutatePatch.ts`, `main/settings.ts`, `main/assetMigrate.ts`, `main/paths.ts`.
- [x] Every concern fixed. Progress hashes filled in.

**Gate 1 record:** `code-simplifier` folded one nested ternary → if/else in `mutatePatch.ts` (−1 line). `comment-killer` corrected one stale docblock (`updateNexusConfig` still said "settings" after genericization). `feature-dev:code-reviewer`: clean, 0 findings. `build-breaking-agent`: 0 High, 1 Medium (fixed), 4 Latent (ratified/unreachable), 9 killed. The Medium — `dropReplacedAsset` and the migration re-key wrote `crops.json` strictly *after* irreversible disk steps, so a corrupt `crops.json` failed the banner/profile op or 404'd migrated banners where the read path shrugs it off — is fixed with a best-effort `.catch` on both secondary writes (`setCrop`'s own write stays strict), proven by a regression test red-without/green-with. L1 (ambiguous-basename Save) and the below-1 pan-direction check routed to Open Against Later Tasks for Task 7.

---

### Phase 2 — One seat, painted once

#### Task 4: `AssetImage` and the aspect cache

**Requirement:** 3

**Why:** Ten places draw a stored reference with their own `<img>`; a crop can reach none of them. One component that resolves the value, reads the crop, and paints through `coverStyle` when — and only when — a crop exists is the feature's whole consumer side. The gate is Sapphire's. The fill class is the component's because two seats have none of their own and the rest have copies. The cropped path observes its box because the box's ratio picks the fill axis and moves with the window.

**Files:**
- Create: `DesignSystem/Components/AssetImage/AssetImage.tsx` — `AssetImage({ value, className?, style?, fallback?, preview? })` and `cropFor(value, map, crops): Crop | undefined` (`resolveAssetValue` → `cropKeyFor` → `crops[key]`).
- Create: `DesignSystem/Components/AssetImage/imageAspect.ts` — `aspectFor(url): number | null | undefined`, `subscribeAspect(fn)`, one rAF-coalesced notify (`tileWarm.ts:37-46`), `useImageAspect(url)`.
- Create: `DesignSystem/Components/AssetImage/assetImage.css.ts` — one `fill` class: `display: block; width: 100%; height: 100%; objectFit: cover; objectPosition: center; WebkitUserDrag: none; backgroundRepeat: no-repeat`.
- Test: `DesignSystem/Components/AssetImage/AssetImage.test.tsx`.

**Interfaces**
- `crop = preview ?? cropFor(value, map, tree.crops)`; **a crop, a resolved aspect, and a measured box** → `<div className={cx(fill, className)} style={{ backgroundImage, ...coverStyle(crop, aspect, boxAspect) }}>`; **anything else** → `<img className={cx(fill, className)} src loading="lazy" onError → fallback>`; `aspect === null` → `fallback`. The `ResizeObserver` rides a **ref callback** bound to both branches, so it re-observes across the `<img>` → `<div>` swap and disconnects on unmount (a `useRef` + mount effect would observe the first node forever). The `onError` latch resets when the resolved URL changes — the `lastSrc` reset at `CardsView.tsx:1449-1452`, now the component's.
- Assumed by: Tasks 5, 7 (`preview`, `cropFor`), 8.

**Failure half:** `value` empty/unresolved → `fallback ?? null`; the cropped image fails → `fallback`; before the observer's first measure the `<img>` path holds one more frame; a broken image replaced by a good one repaints (the latch reset).

**Must agree:** the picker paints its frame through this component with `preview` — one test asserts the div's inline style equals `coverStyle(preview, aspect, boxAspect)`.

**Steps:**
- [ ] Failing tests: no crop → an `<img>`; a crop under the resolved key → a div whose inline style equals `coverStyle(...)`; `preview` overrides; a failed load → `fallback`; the cache keys by URL and notifies once per frame for two resolves.
- [ ] Implement; gates green. Commit: `feat(design-system): AssetImage — a stored image, painted through its crop when one exists`

#### Task 5: The ten seats

**Requirement:** 3

**Why:** `card-tokens.css:23` top-anchors and zooms every `<img>` in a thumb — written for captures, catching covers by accident; re-anchoring it on a capture-only class lets covers render centered through `fill`. Every other seat keeps its `useAssetUrl` line — each gates a whole layout branch on it (photo vs glyph, banner vs empty) — and swaps only its `<img>`; `EntityGlyph` keeps its inline pixel size via `style`; the page card's branch lives in `CardFace`, which gains `cover` as a prop through its `memo` boundary. The `img` rule bodies die with the swaps; the banner classNames survive as the capture's DOM hooks.

**Files:**
- Modify: `DesignSystem/Tokens/card-tokens.css:23` — `.page-card-thumb.is-capture img, .nav-gallery-thumb img`.
- Modify: `Detail/Views/Cards/CardsView.tsx` — set card: `<AssetImage value={set.banner} fallback={placeholder} />` and its `failed` latch deleted; page card: Cover → `<AssetImage value={cover} fallback={placeholder} />`, Preview → the existing `<img src={thumbSrc}>` inside `.page-card-thumb.is-capture` with the `failed` / `lastSrc` latch kept there.
- Modify: `Detail/Banner/Banner.tsx` (strip and `homeIcon`), `MarkdownPM/PageHeader.tsx`, `Embeds/PageEmbed.tsx`, `Tabs/NavView.tsx` (`value={ownBanner ?? homeBanner}`), `Sidebar/NexusPhoto.tsx`, `Navigation/EntityGlyph.tsx`, `Components/Detail/SettingsScaffold.tsx` — `<img …>` → `<AssetImage value className style />`; every `useAssetUrl` line that still gates a layout branch stays.
- Delete rule bodies: `Detail/Banner/Banner.css:14-19`, `MarkdownPM/Styles.css:206-211`, `Sidebar/nexusHeader.css.ts:24-29` (`photoImg`), the sizing half of `Components/Detail/settingsPane.css.ts:100-105` (keeps `borderRadius`), the `object-fit` of `Navigation/entityGlyph.css:1-5` (keeps `flex` and `border-radius`).

**Derivation**
- `rg -F ".page-card-thumb img" Pommora/src` → 1; `rg -F "--cover-zoom" Pommora/src` → 3; `rg -F 'className="banner-img"' Pommora/src` → 2; `rg -F 'className="mdpm-banner-img"' Pommora/src` → 2; `rg -F "'.banner-img'" Pommora/src` → 1 (`useNavThumbnails.ts:21`, survives). Control: `rg -F "useAssetUrl(" Pommora/src` → 10 before, **9** after (only the set card's line dies).

**Failure half:** a seat whose value clears mid-session falls to its existing empty branch, untouched; a broken image replaced by a good one repaints (Task 4's latch reset).

**Survivors:** `--cover-zoom`, `object-position: top`, `transform-origin: top left`, `-webkit-user-drag: none` on captures; `NavGallery.tsx:135` untouched; the circular seats' radius.

**Steps:**
- [ ] Edits; the CardsView tests that assert an `<img>` in Cover mode inverted; gates green.
- [ ] Commit: `refactor(seats): every stored image paints through AssetImage; the capture rules keep to captures`

#### Gate 2
- [ ] Simplification then verification against `<base>..HEAD` scoped to `AssetImage/`, the nine seat files, `card-tokens.css`, the five stylesheets.
- [ ] `rg -F "<img" Pommora/src/renderer` → the captures, `WebpageEmbed`, `PhotoCropModal`'s own (dies in Task 7), `AssetImage`'s plain path; count in the Log.
- [ ] **Screenshot:** a Collection banner, a Cover-mode cards view, the ribbon — every seat renders; Cover-mode cards and set banners now centered (the one-time reframe). Path in the Log.
- [ ] Progress hashes filled in.

---

### Phase 3 — The icon on the model, then the picker

#### Task 6: The nexus icon joins the model; the byte pipeline dies

**Requirement:** 4

**Why:** The one flow that carries bytes over IPC exists only because the icon baked its crop. On the path model `setProfileImage` is `setBanner`'s navview arm with a different field, and everything behind `nexus:imageData` has nothing left to vary. Landing this before the picker leaves a valid resting state: Add Photo sets the photo, and nothing offers an editor until Task 7 mounts one.

**Files:**
- Modify: `shared/mutate.ts` — `{ op: 'setProfileImage'; source: string | null }`.
- Modify: `main/mutate.ts` — the arm on the navview shape (`prev` → `adoptFile(root, source, { allow: 'image' })` → `updateSettings(setOrDrop(...'profile_image', adopted))` → `dropReplacedAsset`); delete `decodeImageDataUrl`, `NEXUS_ICON`, `writeNexusIcon`; drop the `atomicWriteBinary` import if unused.
- Modify: `main/index.ts` — delete `pickedImagePaths`, `readImageData`, `IMAGE_DATA_MAX`, the `nexus:imageData` handler; `pickFilePath` keeps `pickedPaths` only.
- Modify: `shared/bridge.ts` — delete `nexus:imageData`; `preload/index.ts` — delete `imageData`.
- Modify: `Components/useNexusIcon.ts` — `cropImage`/`setCropImage`/`confirmCrop` → `editing`/`openEditor`/`closeEditor`; `addPhoto`: `pickFile()` → `mutate({ op: 'setProfileImage', source })` → `openEditor()`; `removePhoto` and `selectGlyph` → `source: null`; `onSave = crop => mutate({ op: 'setCrop', image: profileImage, crop })`.
- Modify: `Sidebar/NexusPhoto.tsx`, `Components/Detail/SettingsScaffold.tsx` — the `PhotoCropModal` mount deleted (Task 7 mounts the picker).
- Modify: `.claude/Features/ConfigurationPM.md:203` — one sentence.
- Test: `main/mutate.test.ts:505-555` replaced by the `setBanner`-shaped profile battery: adoption lands under the asset root and names it; a replaced `.nexus/assets` file is deleted, one under the configured root is not; `null` clears; a non-image is refused.

**Derivation**
- `rg -F "'nexus:imageData'" Pommora/src` → 3 → 0. Control: `rg -F "'nexus:pickFile'" Pommora/src` → 3.

**Failure half:** a nexus whose `profile_image` names the old baked `nexus-icon.png` → identical under `DEFAULT_CROP`; Add Photo cancelled → nothing written; adoption refused → the existing error surface.

**Negative control:** "a replaced profile image under the configured root survives" goes red if `dropReplacedAsset` receives the raw path instead of `assetFileToDelete`'s answer.

**Steps:**
- [ ] Replacement tests; the edits in one commit (the hazard window); gates green.
- [ ] Commit: `refactor(identity): the nexus photo is a path and a crop; the byte channel is gone`

#### Task 7: `PhotoCropModal` becomes `ImagePicker`

**Requirement:** 4, 5, 7

**Why:** The picker stops rasterizing. Its frame is an `AssetImage` filling the viewport with a `preview` crop, so it shows the seat's exact paint; every line of canvas, `nat`, `imgLeft`, `OUTPUT` and `choose()` deletes rather than generalizes. Panning rides the app's one gesture primitive with `panDelta`; zoom rides the house `Slider` and a native wheel; the shape is the ring's radius; the footer is the path-echo recipe two settings fields share. `open` is the contract every picker in this codebase has. The glyphs, the Showcase mount and the ledger rows land here because this is the commit that makes them true.

**Files:**
- Rename (`git mv`): `DesignSystem/Components/PhotoCropModal/PhotoCropModal.tsx` → `DesignSystem/Components/ImagePicker/ImagePicker.tsx`; `photoCropModal.css.ts` → `imagePicker.css.ts`.
- Rewrite `ImagePicker.tsx` — props `{ open: boolean; value: string; shape: 'circle' | 'rect'; boxAspect: number; onCancel: () => void; onSave: (crop: Crop) => void | Promise<void> }`; `open === false` → null; state `draft: Crop` (reset from `cropFor(value, map, tree.crops) ?? DEFAULT_CROP` whenever `open` flips true **or `value` changes while open** — a Change Photo opens before main's confirming push lands the new reference), `busy`, `dragging`; the frame geometry is shape-split (the 08-25 ruling): **`rect`** — the viewport **is** the frame, `FRAME_W` (KNOB, 280) × `round(FRAME_W × boxAspect)`, ring at inset 0, radius `12px` (KNOB), no surround; **`circle`** — the current geometry kept, a `220` (KNOB) circle centered in the `280` viewport, radius `50%`, the masked-surround blur retained. `<AssetImage value preview={draft} />` is the frame's first child (it fills the `220` circle for `circle`, the viewport for `rect`); pan: `usePointerGesture` with `activation: 0`, `capture: true`, `swallowActiveEscape: true`, `onActivate` snapshotting `{ anchor: draft, boxW: frame.getBoundingClientRect().width, sx, sy }` — **the frame** `coverStyle` paints, which is the viewport for `rect` and the `220` circle box for `circle`, never the `280` viewport for a circle — and setting `dragging`, `onDragMove` → `draft = panDelta(anchor, draft.zoom, aspect, boxAspect, boxW, ev.clientX − sx, ev.clientY − sy)`, `onDrop` a no-op, `teardown` clearing `dragging`; zoom: `<Slider value={draft.zoom} min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} ariaLabel="Zoom" onInput onCommit format={v => `${v.toFixed(2)}×`} />` and a native `wheel` listener on the viewport ref, `{ passive: false }`, `draft.zoom = clampZoom(zoom × exp(−deltaY × (ctrlKey ? PINCH_RATE : SCROLL_RATE)))` with `preventDefault` (rates KNOBs); corner glyphs: `<AccessoryButton icon="rotate-ccw" size="control" ariaLabel="Reset" className={s.cornerGlyph} onClick>` and its `pipette` twin (`Menu.tsx:158-193`, the one named member of the ghost family) — Reset → `DEFAULT_CROP`, Background → `colorInput.current.showPicker()` in a try; a visually-hidden `<input type="color" value={draft.color ?? '#000000'} onInput>` always mounted; error: `useImageAspect(url) === null` → the `message` span, Save disabled; footer inside `actions`: `<Button type="filled" label="Cancel">`, `<InputField chrome="bordered" capped leading={<Icon name="image" size="body" />}><NavTrail segments={pathSegments(rel)} /></InputField>` (`rel` the resolved asset path, or the raw URL), `<Button type="tinted" label="Save" disabled={busy || aspect == null}>`; Escape → `onCancel` (existing listener, gated on `open`); backdrop click → `onCancel`.
- `imagePicker.css.ts` — delete `slider`, `title`; keep `surround` (circle only); `ring` radius becomes shape-driven (`50%` for circle, `12px` for rect); add `cornerGlyph` (composes `accessoryButton`; `&&&` `color: c.label.secondary`), `colorInput` (visually hidden, in the DOM), `actions > :nth-child(2) { flex: 1 }`.
- Delete: the header comment; `OUTPUT`; `imgRef`, `nat`, `offset`, `drag`, the pointer handlers; `choose()`; the `<img>`; the range input; the title. The surround, `VIEWPORT`, `CIRCLE`, `RADIUS`, `INSET` survive for the circle shape.
- Modify: `DesignSystem/Symbols/index.tsx` — `'rotate-ccw': RotateCcw`, `pipette: Pipette`.
- Modify: `shared/identityMenus.ts` — `NexusIconAction |= 'editPhoto'`; `main/index.ts` `nexus:iconMenu` — `Edit Photo` when `hasPhoto`; `Components/useNexusIcon.ts` — `editPhoto` → `openEditor()`.
- Modify: `Sidebar/NexusPhoto.tsx`, `Components/Detail/SettingsScaffold.tsx` — `<ImagePicker open={editing} value={profileImage} shape="circle" boxAspect={1} onCancel={closeEditor} onSave />` beside their `IconPicker`.
- Modify: `DesignSystem/Showcase/leaves/ComponentsLeaf.tsx` — one `<PopupButton label="ImagePicker">` on a bundled sample, a second button toggling `circle` / `rect` 3:1.
- Modify: `.claude/Features/DesignSystemPM.md` — Pickers row `| ImagePicker | \`ImagePicker\` | Frames a stored image — a focal point and a zoom — as a circle or a rect cut to its seat. |`; the GlassWindow row's "the crop modal" → "the image picker"; one `AssetImage` row in the table its folder belongs to: `| AssetImage | \`AssetImage\` | The one element that draws a stored image, through its crop when one exists. |`.
- Modify: `.claude/Planning/Buttons-Spec.md:41, 51, 62` — the name and the pair.
- Test: `DesignSystem/Components/ImagePicker/ImagePicker.test.tsx` — Reset restores `DEFAULT_CROP`; a ctrl-wheel multiplies zoom and clamps; Save calls `onSave` with the clamped draft and is disabled while the aspect is null; Escape cancels when idle; the colour input's `input` event lands on `draft.color`.

**Derivation**
- `rg -F "PhotoCropModal" Pommora/src` → 5 → 0. Control: `rg -F "GlassWindow" Pommora/src` → 12.

**Interfaces**
- `ImagePicker({ open, value, shape, boxAspect, onCancel, onSave })`. Assumed by: Tasks 8, 9.

**Failure half:** `value` unresolvable → the error state, Save withheld; `showPicker()` throwing → caught; `onSave` rejecting → `busy` clears, the picker stays open.

**Survivors:** `backdrop`, `panel`, `viewport`, `grabbing`, `message`, `actions` — reused as they stand; `surround` and the circle's `VIEWPORT`/`CIRCLE`/`RADIUS`/`INSET` constants for the circle shape (the 08-25 ruling). The circle surround is a decorative blurred copy of the same image — it needs an image source (a plain `<img src={url}>` or a `background-image`, no `coverStyle` alignment) since the old modal fed it from the deleted `<img>`; it does not track the crop.

**Steps:**
- [ ] `git mv`; rewrite; the glyphs; the mounts; the Showcase; the docs; tests; `npm run build` 0 and gates green.
- [ ] Commit: `refactor(design-system): PhotoCropModal becomes ImagePicker — the frame is the seat's own paint`

#### Gate 3
- [ ] Simplification then verification against `<base>..HEAD` scoped to `ImagePicker/`, `Symbols/index.tsx`, `ComponentsLeaf.tsx`, `useNexusIcon.ts`, the two mounts, `main/mutate.ts`, `main/index.ts`, `shared/bridge.ts`, `preload/index.ts`, `shared/mutate.ts`, `shared/identityMenus.ts`.
- [ ] **Screenshot:** the picker open on the ribbon photo (circle) and, from the Showcase, a rect frame — corner glyphs, slider readout, path echo, Cancel/Save. Path in the Log.
- [ ] Live checks in the Log: Escape mid-drag keeps the picker open with the pan reverted; Escape idle closes it; ctrl-wheel zooms and the pane behind does not scroll; Background opens the macOS colour panel; Add Photo → picker → Save frames all four icon seats; `settings.json` names the file; no `nexus-icon.png` minted.
- [ ] Progress hashes filled in.

---

### Phase 4 — The entry points, each landing once

#### Task 8: `useBannerMenu` mirrors its channel and owns the editing state

**Requirement:** 6

**Why:** Edit lands once only if the hook is the one place a banner menu pops. Today the three hand-spelled flows each pass an option the bare hook can't express and the two card ones wrap the pop in `GhostSuppress`. Widening the hook to its channel's options and consuming the Context inside it makes the fold three deletions; the picker mounts in each seat on `open`.

**Files:**
- Modify: `shared/identityMenus.ts` — `BannerMenuAction = 'change' | 'edit' | 'remove'`.
- Modify: `main/index.ts` `nexus:bannerMenu` — `Edit ${noun}` between Change and Remove in the non-Add branch.
- Modify: `Detail/Banner/useBannerMenu.ts` — `useBannerMenu(path, kind, { value, frame, noun?, noRemove?, onDone? })` with `frame: RefObject<HTMLElement | null>` (the seat's banner element); `add = !value`; `useContext(GhostSuppress)` wraps the pop; `'edit'` → `openEditor`, which reads `frame.current.clientHeight / clientWidth` once and stores it as `boxAspect`; `onSave = crop => mutate({ op: 'setCrop', image: value, crop }).then(ok => ok && onDone?.())`; returns `{ openMenu, addOrChange, editing, openEditor, closeEditor, boxAspect, onSave }`.
- Modify: `Banner.tsx`, `PageHeader.tsx`, `PageEmbed.tsx`, `NavView.tsx`, the `CardsView` set card and page card — each adds a `useRef` on its banner element and passes `{ value, frame, … }` (NavView `value: ownBanner ?? homeBanner`, `noRemove: !ownBanner`; the page card `noun`, `onDone: onRefreshValues`), deletes its hand-spelled block where it had one, and mounts `<ImagePicker open={editing} value shape="rect" boxAspect onCancel={closeEditor} onSave />`.
- Modify: `.claude/Features/CardViewPM.md:28` — the band menu sentence.
- Test: `Detail/Banner/useBannerMenu.test.tsx` — `'edit'` sets `editing` and stores `boxAspect`; `onSave` writes `setCrop` with the seat's stored value; the ghost wrap is called.

**Derivation**
- `rg -F "window.nexus.bannerMenu(" Pommora/src` → 4 → 1. Control: `rg -F "useBannerMenu(" Pommora/src` → 4 → 7.

**Failure half:** `value` present but unresolvable → Edit offered, the picker opens into its error state; NavView with no banner of either kind → Add only.

**Steps:**
- [ ] Failing hook test; edits; the inline CardsView tests inverted; gates green.
- [ ] Commit: `refactor(banner): one hook pops every banner menu, and Edit lands in it`

#### Task 9: Edit Image on the card menu

**Requirement:** 6

**Why:** Nathan's call — the card's own right-click reaches the framing without aiming at the band. It's a separate literal so the four other menus over `PageMetaAction` stay untouched, authored in the pure model so the shared test can see it, and gated on Cover mode with a cover because a Preview thumb is a capture.

**Files:**
- Modify: `shared/cardMenu.ts` — `CardMenuAction |= 'image:edit'`; `CardMenuContext.editableImage?: boolean`; `cardMenuModel` emits `{ label: 'Edit Image', action: 'image:edit' }` as a leading item when `ctx.editableImage`; `main/cardMenu.ts` maps it like any other.
- Modify: `CardsView.tsx` `onCardContextMenu` — `editableImage: banner === 'cover' && !!cover`; `'image:edit'` → the page card's `openEditor`.
- Modify: `.claude/Features/CardViewPM.md:28, 102` — the card menu list; the Prospect resolved.
- Test: `shared/cardMenu.test.ts` — the item only with `editableImage`.

**Steps:**
- [ ] Test, edits, gates green; commit `feat(cards): Edit Image on the card menu`

#### Gate 4
- [ ] Simplification then verification against `<base>..HEAD` scoped to Phase 4's files.
- [ ] **Screenshot:** a framed Collection banner with a zoomed-out background; the same image as a Cover-mode card; a card's menu showing Edit Image. Paths in the Log.
- [ ] The acceptance criterion, in full, against the live nexus; each clause ticked in the Log.
- [ ] Progress hashes filled in.

---

### Phase 5 — The record

#### Task 10: `ContextPM`, History PM-115, Handoff

**Requirement:** 7

**Files:**
- `ContextPM.md` — the Part 3 paragraph (`:5`) rewritten to done; the Part 3 line (`:11`) ticked; the Files & Assets line (`:48`) closed; **Recent Work** phrases the ImagePicker as complete and awaiting Nathan's live verification.
- `HistoryPM.md` — index row and a BRIEF entry **PM-115 — The ImagePicker**, per `History-Format.md`: this completes the three-part file-based arc.
- `HandoffPM.md` — rewritten for this session per `/handoff`.

**Steps:**
- [ ] Edits; commit `docs: PM-115 — the ImagePicker completes the file-based arc`

#### Gate 5 — the phase, then the whole
- [ ] Phase 5's own pass: every Made False row's new sentence quoted in the Log beside the code line it describes.
- [ ] **The full-range pass:** `code-simplifier` and `comment-killer-agent` over `<base>..HEAD` unscoped; every fold applied; gates green; `/closeout` over the whole diff.
- [ ] Delivery Claim written; `general-purpose` verifier handed the claim, the spec, this plan, and the full range — "is this true?"; a no is fixed and re-claimed.
- [ ] `build-breaking-agent` on the full range after a clean yes; every finding fixed.
- [ ] Dead Vocabulary sweep at zero against its control; counts in the Log.
- [ ] Lessons routed to `.claude/Guidelines`; Log's Closeout written; pushed to origin with explicit paths.

---

## Implementation Log

### Progress
- [x] **Phase 1** — the model and the store · base `fc4f89ad8623724509f29528106b2242f00269f5`
  - [x] Task 1 — the crop model · `163d2646`
  - [x] Task 2 — the crops leaf · `94f5d3d9`
  - [x] Task 3 — updateCrops, setCrop, the orphan, the migration · `9ef8d1cc`
  - [x] Gate 1 — simplification (1 fold), comment-killer (1 stale docblock), reviewers (0 High; 1 Medium fixed) · `cae60050`
- [ ] **Phase 2** — one seat, painted once
  - [ ] Task 4 — AssetImage · `<commit>`
  - [ ] Task 5 — the ten seats · `<commit>`
  - [ ] Screenshot · `<path>`
- [ ] **Phase 3** — the icon on the model, then the picker
  - [ ] Task 6 — the icon on the model · `<commit>`
  - [ ] Task 7 — ImagePicker · `<commit>`
  - [ ] Screenshot · `<path>`
- [ ] **Phase 4** — the entry points
  - [ ] Task 8 — useBannerMenu · `<commit>`
  - [ ] Task 9 — Edit Image · `<commit>`
  - [ ] Screenshot · `<path>`
- [ ] **Phase 5** — the record
  - [ ] Task 10 · `<commit>`
  - [ ] The full-range pass · `<commit>`

### Rulings
- **A-4 (Nathan, 08-25):** The frame is the viewport for `rect`; `circle` keeps `PhotoCropModal`'s current geometry (a 220 circle in the 280 viewport with the masked-surround blur, radius 50%). Split is display-only — one crop model, `coverStyle` against the circle's 220 box or the rect's own box. Folded into the Ruling paragraph, A-4, and Task 7 in the ratification commit; the surround and the circle constants are Survivors rather than deletions.
- **A-5 revised (Nathan, 08-25):** The footer path field is no longer a read-only echo — it gains a trailing action that reopens the OS file explorer (`AssetDirectoryRow`'s affordance; reuses `pickFile()`) and accepts a **paste** of an image. Both re-pick the picker's image → adopt → the seat's set op → reframe on the new `value`. Paste writes the pasted bytes as a normal asset file (Electron `clipboard.readImage()` main-side, or a copied file by path); it keeps the crop separate and does **not** revive Task 6's deleted crop-baking byte channel. Scope lands in Task 7 (footer field) with a narrow adopt-from-clipboard channel; exact seat wiring settled when Task 7 is built. Anticipated already by Task 7's draft-reset-on-`value`-change.
### Open Against Later Tasks
- **Task 7 (Gate 1 attacker, L1):** Cropping an image whose basename is duplicated elsewhere under the asset root — main's `cropKeyFor` faults (`AMBIGUOUS` → null) while the renderer's `resolveAssetValue` picks a first-sorted rel. Save must fault visibly, not silently no-op. Consistent with the ratified "a name several files answer to names none of them"; verify at the picker.
- **Task 7 (Gate 1 attacker, Unknown):** Below-1 zoom exposes the underfill regime (`MIN_ZOOM 0.25`, intended per C-1). Verify the pan direction still reads correctly when the image is letterboxed on its background; the math matches CSS background-position underfill, but confirm it in the live check.
### Deviations
- **Task 1 — `.finite()` dropped.** The plan's `z.number().finite()` becomes `z.number()`: zod 4.4.3 rejects `NaN`/`Infinity` from `z.number()` natively (Build-Gotchas), so `.finite()` is redundant and its API is gone in zod 4.
- **Task 1 — `WEB_ADDRESS` is the current `SCHEMED`.** The web-address regex the plan names `WEB_ADDRESS` lives today as `SCHEMED = /^[a-z][a-z0-9+.-]*:/i` in `assetUrl.ts:20` (2 uses). It moves to `shared/nexusPaths.ts` as `WEB_ADDRESS`; `assetUrl.ts` imports it. `cropKeyFor`'s web test is the same regex `resolveAssetValue`'s external branch uses — not a second, narrower one.
- **Task 7 — pan `boxW` reads the frame, not the viewport (08-25 ruling consequence).** Under the split, the circle's frame is the 220 box while the viewport is 280; `panDelta`'s `boxW` must be the frame `coverStyle` paints or the circle's overhang is wrong by 280/220. Plan text corrected at ratification.
- **Task 3 — the must-agree is split across two test files.** A single test importing both main's `assetFilePath` and the renderer's `resolveAssetValue` can't typecheck — `@renderer` isn't on the main tsconfig's paths (the process boundary). The main-side half (`assetFilePath` → `cropKeyFor` → the rel) lives in `mutate.test.ts`; the renderer-side half (`resolveAssetValue` → `cropKeyFor` → the same rel) lands in Task 4's `AssetImage.test.tsx`. Both feed the one `cropKeyFor`, so the agreement holds.
### Lessons
### Sequenced After
- Sapphire reading `.nexus/crops.json` as its crop source.
- The file property's chip opening the picker.
- Pruning crops whose image no longer resolves (external deletes).
- In-place framing on the banner itself.
### Closeout
