## Handoff — Pommora

> **User Prompt:** Fix audit findings F-614, F-615, and F-616 completely through the `batch-audit` flow, with F-612 and F-613 riding along, each finding closing with a simplification pass and an adversarial pass, a live CDP drive on an isolated build, and the Feature docs, ledger, and Dashboard reconciled.

#### Current Focus

**Session ID:** 27f0745f-0798-4edf-80b7-c59145580d41
**Dates:** 09-28-2026
**Model:** Opus 5.5 orchestrating, with Opus reviewers

**Link values now follow their page wherever they're held, in seven commits, `e605d9b15` through `5003a1c7f`.** A Link property value names a page by title, and it can sit on a page, on a Space, or in a Collection's cache of a removed property.

- **Delete:** a page, Set, or Collection delete clears the Link values naming it from pages and Spaces and records them in the Trash bundle; the notice counts both. A title another page still holds is left alone (F-612). A cache is left as it is until its property is assigned again.
- **Rename:** a page rename rewrites pages, Spaces, tiles, and caches; a heading rename reaches Spaces too, including one only a Space links, and leaves caches as written. A title another page still holds is left alone.
- **Restore:** a returning page, Space, or property drops a Link naming a page that doesn't exist, hands one whose page sits in the Trash to that page's bundle so its restore puts it back, and gives an ID-less page the ID adoption would; values a delete stripped go back onto the page or Space, or into its trashed copy when it sits in the Trash. With **Restore Links On Deletion** off, a page in the Trash counts as still there.
- **Re-assign:** a cached Link naming a page gone leaves the cache, joining that page's bundle when it's in the Trash.
- **Emptying:** giving a bundle up strips any Link still naming its pages unless another page holds that title, and hands the values its record kept to a namesake still in the Trash.
- **Undo (F-615):** a bundle restored or deleted from Settings › Trash spends its delete notice's Undo and the chord once that action lands, so ⌘Z walks on to the act beneath.

The ledger reads 100/556: F-612–F-616 are closed, and F-617 and F-618 are new.

#### Completion Criteria

- [x] Each finding closed with a simplification pass and an adversarial pass, plus a regression audit of the whole arc against `0f52c96d6`, whose three regressions folded (the switch-off loss, the restore-time ID, the uncounted Spaces).
- [x] A live CDP drive on an isolated build: orders (a) and (b), a Set restore, the Space link, F-615's chord after a frame restore and a frame delete, and F-616's rename, park, and re-assign. It caught a Set restore leaving stale values on screen, fixed in `aa06e6b30`.
- [x] Final verification: a neutral verifier passed all five findings with red-with-revert per finding, the helper-placement judge's cycle finding was folded (`propertyCache.ts`), and the outward-cohesion review's duplicate cache walker was folded (`editCacheBlocks`).
- [x] NexusRecordPM, ConnectionsPM, PropertiesPM, and InterfacePM reconciled; the ledger re-anchored.

#### Next Session

- **Nathan's call, F-617:** two same-titled pages both deleted, then the first one deleted is restored from the Trash: the links to their title stay stripped until the second bundle returns. The recommended fix records the rows at the first delete without stripping them.
- **F-618:** Delete All and Restore All walk the whole Trash once per link-carrying bundle; the fix batches the frame's request.
- **Commit `5003a1c7f` carries a peer session's audit batch (F-190/192/193/207/216/246/247/250/302)** beside this session's cache fold; that session was told and lands its remaining deletions under its own message.

#### Session Pointers

- **The return rule:** `reconcilePropertyValue`'s frozen mode and `namesGonePage` in `Core/Properties/propertyValue.ts`; `restoreWorld`, `parkLinks`, and `refillTrashed` in `Core/Trash/holdings.ts`.
- **The cascades:** `deleteCascade` and `renameCascade` in `Core/Nexus/cascade.ts`, with `spaceArm`; `titleHeldOutside` and `titlesOf` in `Core/Nexus/valuesChanged.ts`; the cache edits in `Core/Properties/propertyCache.ts`, gated by `CollectionNode.cached`.
- **The undo spend:** `spendBundle` in `Core/Interface/Confirm/confirmations.ts`, the handle `notifyUndoable` answers, and the frame's `one` and `many` in `Core/Settings/TrashFrame.tsx`.

#### Working Notes

- **Commit paths:** a `git commit --only -- $(git diff --name-only)` swept a peer's 50-file batch into `5003a1c7f`; name your own files.
- **The live build:** a detached worktree whose `node_modules` holds per-entry links to the main checkout's with `@pommora/*` pointing at the worktree's own packages, since a single `node_modules` link makes vanilla-extract resolve the main tree's stylesheets.
