## Handoff — Pommora

> **User Prompt:** *"Execute `ImagePicker — Implementation Plan.md` end to end, overnight, unattended… Zero pending items. Zero concerns carried."* — then, the same session: the A-4 shape ruling (*"rounded photo keeps its current shape → otherwise it re-designs to look like the image"*), the A-5 footer revision (*"the input field uses the same trailing icon to reopen the file explorer… pasting an image into the field must also work"*), and *"remove comments."*

#### Current Focus

**Session ID:** 80a10e7b-1f2a-4d86-a973-10f5f6ea1333
**Dates:** 08-24-2026 → 08-25
**Model:** Opus 4.8

**Part 3 of the file-based arc — the ImagePicker — shipped end to end, unattended.** Ten tasks across five phases, each phase gated by simplification → comment cleanup → the four gates → a correctness review → a break-attempt, every concern verified against the code and closed before the next phase opened. The crop surface widened past the nexus icon into `AssetImage` (the one component every stored image paints through) and `ImagePicker` (the one editor that frames one). A crop is a focal point and a zoom in `shared/cropGeometry.ts`, the one crop math the editor's frame and every seat's paint both derive from — `cropWindow` for the editor, `coverStyle` for a seat; framings ride `.nexus/crops.json` as the `crops` tree leaf, keyed per image, written by the sole `updateCrops` owner and patched live by a watcher blind to its own writes. The nexus photo joined the path-and-crop model every banner used and the whole data-URL/`writeNexusIcon` byte pipeline is gone; adoption runs through `adoptFile`, which takes a picked, pasted, or typed image source and refuses anything it can't name and show, `nexus:pasteImage` still writes the OS clipboard's image to a temp file for it, and a replaced asset moves to the trash rather than a hard unlink.

**Verified on Nathan's screen.** The unified frame — the whole image dimmed and blurred under a sharp ringed crop window (a circle for the nexus photo, the seat's rectangle for a banner or card, the shape carried by the ring's radius) — and the editable footer (re-pick by dialog, typed path, or pasted link) were walked through live and signed off.

#### Completion Criteria

- [x] **One crop model, one crop math** — `cropGeometry.ts`'s `coverStyle` paints every seat and `cropWindow` frames the editor; no seat computes its own fill.
- [x] **One writer, one key, one live patch** — `updateCrops` is the sole writer of `crops.json`, `cropKeyFor` the sole key, the `crops-leaf` watcher the sole live update; each writer self-confirms through `patchCropsFromDisk`.
- [x] **The byte pipeline is gone** — `nexus:imageData`, `writeNexusIcon`, `decodeImageDataUrl`, `NEXUS_ICON`, `pickedImagePaths`, `IMAGE_DATA_MAX` all zero; the nexus photo adopts a path like a banner.
- [x] **Every stored image paints through `AssetImage`** — the ten hand-rolled `<img>` seats replaced, gated on a crop existing so an uncropped seat loads no aspect.
- [x] **Gates green at every commit** — typecheck 0 · biome clean (947) · 3659 tests · app + showcase build.
- [x] **Full-range reviews clean** — the correctness pass and the attacker both found the same Save-hold deadlock (re-picking the already-set image); fixed with the hold releasing on the adopt resolving, plus a below-fill `panDelta` inversion, both with tests (`5881b220`). The verifier returned 8/8 acceptance clauses HOLD.
- [x] **Eyeballed on Nathan's screen** — the two frame shapes, the corner glyphs, the footer's re-pick and paste, the Edit entry from all three menus.
- [x] **Redesign + final review shipped** (`0dad74f8`) — the unified frame, typed-path adoption, trash-move on replace, Edit-above-Change menus, portal-click containment (click/context-menu/pointer-down), and card auto-open, closed by a six-agent pass (two simplify, two correctness + wiring, two break). Both reviewers' one finding — the re-pick Save-hold releasing before the seat's value landed — is fixed: `MutateReply` carries the adopted value and the hold waits for the seat to reach it, a dedup releasing at once. The shared-asset trash and the below-fill-color preview are recorded above as follow-ons.

#### Next Session

1. **Reload and eyeball** the ImagePicker end to end — open it from a banner, a card, and the nexus icon; pan, zoom, reset, background; re-pick by dialog and by paste. KNOBs live at the top of `ImagePicker.tsx` (`FRAME_H` 260, `MIN_W` 220, `MAX_W` 460, `RECT_RADIUS` 12, `SCROLL_RATE`, `PINCH_RATE`).
2. **Sapphire reads `crops.json`** — the file uses Sapphire's shape by design; wiring Sapphire to honor it is the Sequenced-After follow-on, untouched here.
3. **Restart the dev server** after pulling — `src/main` changes (the paste channel, the adoption + trash paths, the deleted byte pipeline) don't HMR and aren't picked up by ⌘R.

#### Sequenced After

The ImagePicker plan closed; these follow-ons carried past it (its Decision Log and Implementation Plan retired with the arc).

- **Nexus identity in the asset URL** — `nexus-asset://nexus/<rel>?v=<version>` uses a fixed host and a per-nexus version that resets to 0 on open, so two nexuses sharing a rel + version collide in Chromium's image cache *and* the aspect cache. Folding the nexus id into the URL/version fixes both; it predates this work and touches every asset URL, so it stayed out of scope. A latent, pre-existing defect.
- **An optimistic `setProfileImage`/`setBanner` store arm** — the renderer's reference lags the adopt by the confirming push, so Change/Add Photo flashes the old image for a beat. `MutateReply` now carries the adopted `[[Name.ext]]` (the re-pick Save-hold waits on it, so the crop-loss variant is closed); an optimistic store arm patching that reference immediately would remove the cosmetic flash too. Self-correcting.
- **A shared asset trashed out from under another owner** — two banners or covers that adopted the same source file share one minted `.nexus/assets/<name>`; changing one owner trashes that shared file (recoverable in the OS trash) and drops its crop entry, leaving the other's image dangling. `dropReplacedAsset` compares only the current owner's old and new values; a true fix needs a cross-owner reference count, and scanning every banner/cover/profile owner on each replace is the O(N)-on-every-X the perf rule forbids — so the file staying trash-recoverable is the accepted mitigation until a reference index exists. Pre-existing.
- **Pruning crops whose image no longer resolves** — a crop for an externally-deleted image lingers in `crops.json` with nothing to key it to.
- **The file property's chip opening the picker** — a `file` value's chip is a natural fourth entry point into the same editor.

#### Feedback

- "Icon picker for the nexus image and rounded photo keeps its current shape → otherwise it re-designs to look like the image." The crop reads round for the rounded photo and takes the seat's rectangle otherwise; either way the frame sizes to the image's own aspect.
- "The input field uses the same trailing icon to reopen the file explorer as the directory settings option; pasting an image into the field must also work." The footer path echo is an `InputField` with the folder-open trailing action, and it accepts a paste.
- "Remove comments." / "Stop with all the comments." Comments cut to near-zero — a why the code can't show, nothing else. → [[feedback-comment-volume-near-zero]]

#### Session Pointers

- `shared/cropGeometry.ts` — `coverStyle` (seat paint), `cropWindow` + `dragWindow` (the editor's frame and its pan), `panToCrop`, `clampZoom` (`[0.25, 2]`), `DEFAULT_CROP`. The one crop math; `Crop` is `{ x, y, zoom, color? }`.
- `main/watchPatch.ts` — the `crops-leaf` WatchClass + classifier + `patchCropsFromDisk`; `main/settings.ts` — `updateCrops` over the extracted `updateNexusConfig`.
- `DesignSystem/Components/AssetImage/` — plain `<img>` with no crop, `coverStyle` div with one; `imageAspect.ts` is the URL-keyed aspect cache (tileWarm shape).
- `DesignSystem/Components/ImagePicker/` — `git mv` from PhotoCropModal; one unified frame drawing the dimmed image under a sharp ringed crop window (circle vs rect by the ring's radius), `usePointerGesture` + `dragWindow`, house `Slider` + non-passive wheel, EyeDropper background, editable footer field, `repicking` Save-hold released once the seat's value reaches the adopted image (`MutateReply.adopted`), a dedup releasing at once.
- `Detail/Banner/useBannerMenu.ts` — the one place `bannerMenu` is called (folded 4→1); `onSave` closes the editor then `setCrop`; `onRepick` calls `onDone` on success so the page-cover Save-hold can't dead-end.
- `main/index.ts` — `pasteImagePath` (clipboard → temp PNG → `pickedPaths`, which still gates the `assets:adopt` channel), the `Edit` items on the banner and icon menus.
- `Build-Gotchas.md §sandbox` — the `POMMORA_USERDATA` sandbox line and the CDP harness; screenshots this session went through it against the Test nexus (restored after).

#### Working Notes

- A crop key is `cropKeyFor(rel, raw)` — nexus-relative path for a file, raw string for a web address. Every writer resolves the same key or the framing lands under two names.
- `AssetImage` must not load an aspect when there's no crop — the plain-`<img>` path stays allocation-free, which is why the ResizeObserver is on the cropped branch only.
- Adoption is guarded by `adoptFile`, not a picked-path gate: a source the renderer names — picked, pasted, or typed into the footer field — adopts only if it resolves to an image Pommora can name and show, so a bad source changes nothing. A replaced asset moves to the OS trash, so a wrong re-pick stays recoverable.
- `@renderer` isn't on main's tsconfig, so a must-agree test spanning both sides splits — main half in `mutate.test.ts`, renderer half in `AssetImage.test.tsx`.
- vanilla-extract rejects a child selector like `& > *:nth-child(2)` and has no `WebkitUserDrag`; use a named class and `draggable={false}`.
