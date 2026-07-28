# Open Code Findings

Verified against the code, not yet acted on. Each carries the `file:line` it was confirmed at —
re-ground it before acting. Landed items are deleted rather than marked.

## Latent

- **`deleteAgendaItem` ignores the user's trash mode.** `crud/agendaEntity.ts` hardcodes
  `trashWithTimestamp`, so a "system trash" setting won't apply once the agenda write path is wired.
  Test-only callers today.

- **`trashMode` has no renderer writer.** Live in main and settable only by hand-editing
  `pommora.json`; absent from Settings.

- **`PommoraError.code` can't reach the renderer.** The boundary flattens to `.error.message` at 31
  sites in `main/index.ts`, so the closed `ErrorCode` union is unreachable client-side. It IS
  consumed main-side, at `mutate.ts` (the `'exists'` retry) and `crud/contextWrite.ts`
  (`'not-found'`). Carrying `code` across the wire changes renderer types — a decision, not a fix.

- **`TableView.tsx` back-solves the zoom factor** from `getBoundingClientRect().width / width` during
  a resize — the layout-read anti-pattern the same file names a few hundred lines earlier. One
  `resolvedZoom(gridEl)` closes it.

- **`lossy-change-requires-confirmation` fires only on a test-only path.** `crud/schema.ts` produces
  it via `changePropertyType`, reachable only through `changeAgendaPropertyType`, whose four exports
  have no production callers. Meanwhile `main/index.ts` accepts `opts` there and discards it.
  Test-pinned rather than dead — deleting changes what tests assert.

## Adjudication needed

- **The agenda's built-in Status is not a one-line seed.** `main/properties/schema.ts` rejects any
  reserved id at add-time, so `addAgendaProperty` would refuse `_status`. Needs a seed path past the
  validator plus a guard in the delete path.

- **Icon Picker key collision.** The picker draws from `ALL_ICONS` while `Icon` resolves
  curated-first, so picking Lucide's Table or Lock renders Pommora's glyph instead of the one shown.

- **Sub-Set openability.** The sidebar says expand-only; search, Back-nav and DetailPane all open a
  Sub-Set as a full container view.

- **The colour-ordering line cut from DesignPM** ("fills heaviest, strokes lighter, text-washes
  lightest") contradicted the token opacities — separators sit above the top fill step. Deleted
  rather than restated; confirm whether that ordering is real intent expressed another way.
