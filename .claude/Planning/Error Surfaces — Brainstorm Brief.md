## Error Surfaces — Brainstorm Brief

A starting point for a brainstorm on giving every error Pommora produces one source that decides how it surfaces: shown to the user, logged, or reflected in a status.

### Where Errors Surface Today

- **The refusal reporter:** `Core/Interface/Notifications/notifications.ts` holds the renderer's reporting helpers. `reportRefusal` posts a refused reply as an in-app error notice, `persist` handles writes nothing waits on and either posts a notice naming what didn't save or logs it for quiet interface chrome, and `notifyReport` posts a one-line batch outcome.
- **Call-site choices:** each caller picks its helper and, for `persist`, whether it's quiet. Settings, footnote visibility, and view options post a notice; folds, embed sizes, table heading columns, the glance size, navigation lists, the layout flags, and the session writer (tabs, windows, tile layouts, and the Matrix) log.
- **Host-side logs:** about forty `console.error` lines across `Core` and `Desktop` record failures in background passes such as the index seed, the repair sweep, remint, and schema replay. None of them reach the user.
- **Status surfaces:** sync carries its own failures in `SyncStatus` (`state: 'error'` with a `why`), which the Settings pane draws.
- **The error envelope:** every host channel answers with a `Result`, and `fault` is the one spelling of an operation that failed. `ErrorCode` in `Core/Contract/result.ts` is the closed set of refusal codes.

### The Idea

One file names every kind of error the app can produce and decides its surface in one table, so a call site reports a kind and never chooses between a notice, a log line, or silence. The reporter's quiet flag and the scattered host logs would both read from it.

### Questions for the Brainstorm

- **The unit of a kind:** whether the table keys on `ErrorCode`, on the operation (a channel or a writer), or on a new closed union of error kinds, and how a kind stays exhaustive as channels are added.
- **Host-side reach:** whether background failures in the host that are logged today belong in the same table, and how a host-side error reaches the renderer's notice when it should, since the host has no notice of its own.
- **Surfaces beyond the notice:** whether status surfaces such as sync's belong to the same source or remain domain-owned, and whether a persistent error log readable inside the app is in scope.
- **Mobile:** the in-app notice was chosen partly because a future mobile host has no native dialogs, so the table should hold without any desktop-only surface.
- **Batch and aggregate reporting:** how a batch (the Trash's restore and empty) and a burst of repeated refusals collapse into one message.
