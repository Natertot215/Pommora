## Handoff — Pommora

> **User Prompt:** *"Execute `ImagePicker — Implementation Plan.md` end to end, overnight, unattended… Zero pending items. Zero concerns carried."* — then, the same session: the A-4 shape ruling (*"rounded photo keeps its current shape → otherwise it re-designs to look like the image"*), the A-5 footer revision (*"the input field uses the same trailing icon to reopen the file explorer… pasting an image into the field must also work"*), and *"remove comments."*

#### Current Focus

**Session ID:** 80a10e7b-1f2a-4d86-a973-10f5f6ea1333
**Dates:** 08-24-2026 → 08-25
**Model:** Opus 4.8

**Part 3 of the file-based arc — the ImagePicker — shipped end to end, unattended.** Ten tasks across five phases, each phase gated by simplification → comment cleanup → the four gates → a correctness review → a break-attempt, every concern verified against the code and closed before the next phase opened. The crop surface widened past the nexus icon into `AssetImage` (the one component every stored image paints through) and `ImagePicker` (the one editor that frames one). A crop is a focal point and a zoom in `shared/cropGeometry.ts`, whose `coverStyle` is the single paint producer the editor and every seat share; framings ride `.nexus/crops.json` as the `crops` tree leaf, keyed per image, written by the sole `updateCrops` owner and patched live by a watcher blind to its own writes. The nexus photo joined the path-and-crop model every banner used and the whole data-URL/`writeNexusIcon` byte pipeline is gone; a `wasPicked` gate keeps the renderer from naming a path main didn't choose, and `nexus:pasteImage` feeds the clipboard into that same set.

**Awaiting Nathan's live verification.** Every phase was screenshotted in a sandbox instance over CDP against the Test nexus — the circle and rect frames, the ten seats, the framed banner paint proven end-to-end by seeding a real `crops.json` entry — but nothing here has been eyeballed on Nathan's own screen. The A-4 shape split (circle keeps its 220-in-280 geometry with surround blur; rect = the viewport *is* the frame at radius 12) and the A-5 footer (re-pick by dialog or paste) are built to the live rulings and want a look.

#### Completion Criteria

- [x] **One crop model, one paint producer** — `cropGeometry.ts`'s `coverStyle` renders the editor preview and every seat; no seat computes its own fill.
- [x] **One writer, one key, one live patch** — `updateCrops` is the sole writer of `crops.json`, `cropKeyFor` the sole key, the `crops-leaf` watcher the sole live update; each writer self-confirms through `patchCropsFromDisk`.
- [x] **The byte pipeline is gone** — `nexus:imageData`, `writeNexusIcon`, `decodeImageDataUrl`, `NEXUS_ICON`, `pickedImagePaths`, `IMAGE_DATA_MAX` all zero; the nexus photo adopts a path like a banner.
- [x] **Every stored image paints through `AssetImage`** — the ten hand-rolled `<img>` seats replaced, gated on a crop existing so an uncropped seat loads no aspect.
- [x] **Gates green at every commit** — typecheck 0 · biome clean · Vitest green · app + showcase build.
- [ ] **Eyeballed on Nathan's screen** — the two frame shapes, the corner glyphs, the footer's re-pick and paste, the Edit entry from all three menus.

#### Next Session

1. **Reload and eyeball** the ImagePicker end to end — open it from a banner, a card, and the nexus icon; pan, zoom, reset, background; re-pick by dialog and by paste. KNOBs live at the top of `ImagePicker.tsx` (`FRAME_W` 280, `CIRCLE` 220, `RECT_RADIUS` 12, `SCROLL_RATE`, `PINCH_RATE`).
2. **Sapphire reads `crops.json`** — the file uses Sapphire's shape by design; wiring Sapphire to honor it is the Sequenced-After follow-on, untouched here.
3. **Restart the dev server** after pulling — `src/main` changes (the paste channel, the `wasPicked` gate, the deleted byte pipeline) don't HMR and aren't picked up by ⌘R.

#### Feedback

- "Icon picker for the nexus image and rounded photo keeps its current shape → otherwise it re-designs to look like the image." The circle is a fixed portrait frame; the rect is cut to the seat it edits. One editor, two shapes chosen by the seat.
- "The input field uses the same trailing icon to reopen the file explorer as the directory settings option; pasting an image into the field must also work." The footer path echo is an `InputField` with the folder-open trailing action, and it accepts a paste.
- "Remove comments." / "Stop with all the comments." Comments cut to near-zero — a why the code can't show, nothing else. → [[feedback-comment-volume-near-zero]]

#### Session Pointers

- `shared/cropGeometry.ts` — `coverStyle`, `panToCrop`, `panDelta`, `clampZoom` (`[0.25, 4]`), `DEFAULT_CROP`. The one crop math; `Crop` is `{ x, y, zoom, color? }`.
- `main/watchPatch.ts` — the `crops-leaf` WatchClass + classifier + `patchCropsFromDisk`; `main/settings.ts` — `updateCrops` over the extracted `updateNexusConfig`.
- `DesignSystem/Components/AssetImage/` — plain `<img>` with no crop, `coverStyle` div with one; `imageAspect.ts` is the URL-keyed aspect cache (tileWarm shape).
- `DesignSystem/Components/ImagePicker/` — `git mv` from PhotoCropModal; shape-split, `usePointerGesture` + `panDelta`, house `Slider` + non-passive wheel, `repicking` Save-hold cleared on `[value]`.
- `Detail/Banner/useBannerMenu.ts` — the one place `bannerMenu` is called (folded 4→1); `onSave` closes the editor then `setCrop`; `onRepick` calls `onDone` on success so the page-cover Save-hold can't dead-end.
- `main/index.ts` — `pasteImagePath` (clipboard → temp PNG → `pickedPaths`), `wasPicked` in `mutateDeps`, the `Edit` items on the banner and icon menus.
- `Build-Gotchas.md §sandbox` — the `POMMORA_USERDATA` sandbox line and the CDP harness; screenshots this session went through it against the Test nexus (restored after).

#### Working Notes

- A crop key is `cropKeyFor(rel, raw)` — nexus-relative path for a file, raw string for a web address. Every writer resolves the same key or the framing lands under two names.
- `AssetImage` must not load an aspect when there's no crop — the plain-`<img>` path stays allocation-free, which is why the ResizeObserver is on the cropped branch only.
- The `wasPicked` gate is a security seam, not a nicety: the renderer can name any path, so `setBanner`/`setProfileImage` adopt only paths main handed out (a picked file, a pasted temp).
- `@renderer` isn't on main's tsconfig, so a must-agree test spanning both sides splits — main half in `mutate.test.ts`, renderer half in `AssetImage.test.tsx`.
- vanilla-extract rejects a child selector like `& > *:nth-child(2)` and has no `WebkitUserDrag`; use a named class and `draggable={false}`.
