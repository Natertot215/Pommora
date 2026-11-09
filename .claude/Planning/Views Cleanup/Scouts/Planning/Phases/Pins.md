### Pins

Every test the planning build added or rewrote as a pin, by task, with the code revert that reddens it. Each ran red at planning; an executor runs the revert again before the task commits, and a reviewer replaying the chain runs them all.

| Task | Test | Reddens When |
|---|---|---|
| 2-3 | `Core/Views/Host/liveView.test.tsx` · "a refused drop that a later write composed over returns its row to its prior slot" | The refusal arm's re-placement in `dropIO(...).persistAfter` (`after`, `back`, and the `persist(back)` call) is removed |
| 2-3 (Phase 2 checkpoint) | `Core/Views/Host/liveView.test.tsx` · "a refused drop leaves a later write that moved the row off its dropped slot as written" | `priorSlotOf`'s gate reverts to `if (at < 0) return undefined`, re-placing the row wherever the live order differs |
| 2-3 (Phase 5 checkpoint) | `Core/Views/Host/liveView.test.tsx` · "a refused drop in a view that never stored its order returns its row to the slot its drop was ranked from" | `persistAfter` reads `view[key]` alone, without `dropIO`'s `prior` |
| 3-1 | `Core/Views/Settings/ViewFrame.test.tsx` · "a 'table' view's Layout row opens the kind's switches 'with the Visibility list above them'" and "a 'cards' view's Layout row opens the kind's switches 'without the Visibility list'" | `ViewEditor`'s Layout routing ignores `presentedKind(view.type).layout.leaf`: every kind sent to the Visibility pane reddens the Cards case, every kind sent to the switches reddens the Table case |
| 3-1 | `Core/Views/Settings/SettingsFrame.test.tsx` · "Visibility is the list alone" | `ViewPane`'s visibility case passes `kindSwitches` as the footer (the Phase 3 checkpoint's fold moved the editor's leaf out of the dispatcher) |
| 3-1 | `Core/Views/Settings/SettingsFrame.test.tsx` · "Layout is the type grid and the kind's switches, without the list" | `kindSwitches` is removed from `LayoutFrame` |
| 3-1 | `Core/Views/Settings/SettingsFrame.test.tsx` · "lists Properties and every view pane" | Visibility is filtered out of `ENTRIES` |
| 5-1 | `Core/Views/Table/cellGestures.test.tsx` · "a create opens its name field on the newborn’s row, empty, before the reply" | `beginNaming` moves back after the reply, into `flight.then(...)` |
| 6-1 | `Core/Views/Pipeline/group.test.ts` › `orderSetTree` · "a custom Set order orders the pages gathered from nested Sets inside one band when nothing sorts them" | The tree ordering is replaced with `let tree = setTree` |
| 6-1 | `Core/Views/Pipeline/group.test.ts` › sub-grouping · "an empty option band shows under a Set while Hide Empty Groups is off, and leaves once it is on" | `bucketBands` drops every empty bucket under a Set |
| 6-2 (Phase 6 checkpoint) | `Core/Views/Bands/bandDrops.test.tsx` › `band reparent` · "a refused nest of a Set group_order never ranked, after another Set write, returns it to the slot its drop was ranked from" | The host's band IO factory stops passing the Set effect's `prior` to `dropIO` |
| 6-2 (Phase 7 checkpoint) | `Core/Views/Settings/GroupFrame.test.tsx` › `GroupFrame lists — dragging in the pane` · "a refused nest of a Set group_order never ranked, after another Set write, returns it to the slot its drop was ranked from" | `GroupFrame`'s band IO factory stops passing the Set effect's `prior` to `dropIO` |
| 7-2 | `Core/Views/Bands/bandZone.test.tsx` · "a band head holds no Tab stop: Tab from a head passes its chevron and New Page by" | `GroupBand.tsx`'s chevron `<button>` and the New Page button's Tab stop are restored |
| 8-2 (Phase 8 checkpoint) | `Core/Tiles/Surfaces/ViewTile.test.tsx` › `ViewTile` · "a lock from another window stops an icon pick already open" | `editViews` gates on the render's `locked` rather than the stored entry's |
| 10-1 | `UIX/Interactions/engine.test.tsx` · "a row that can't lift names no drag gesture, and a row that can does" | `useLineRow`'s description reverts to `INSTRUCTIONS_ID` on every row |
| 10-1 | `UIX/Interactions/engine.test.tsx` · "runs an immovable row's own Space in place of a lift, and its opener on Enter" | `measureLine`'s immovable check is reverted |
| 10-1 | `UIX/Interactions/engine.test.tsx` · "marks a disabled zone on its items from the first render" (the description assertion) | `useDragItem`'s description reverts |
| Final Verification, Wave One | `UIX/Interactions/engine.test.tsx` · "a line list whose focused row unmounts gives its Tab stop back" | `LineHost`'s post-commit effect stops restoring the borrowed Tab stop |
| 10-1 (Phase 10 checkpoint) | `UIX/Interactions/engine.test.tsx` · "an immovable item names no drag gesture, and Space doesn’t lift it" | `lift`'s immovable refusal and `useDragItem`'s description revert, leaving a displace item described and lifting |
