#### Corpus Walk Deferrals: Scope

**Date:** 09-07-2026
**Scope:** Four items held back from the Index Extension process, whose 8.x numbering they keep, carrying three finding IDs between them — R-39 (8.6), R-41 (8.8), and R-38 d/e (8.5); 8.3 has none. The codebase audit files all three under Topic 11, Remaining Wide Walks. Each answers a narrow question with a wide walk on a hot path; each was deferred because it needs a design call, not just code. This doc frames each as what it is, the walk it runs, the narrow answer sitting nearby, and the decision it turns on.

##### The Shape Of It

Two of the four are one decision seen from two places. `Core/Nexus/treeIndex.ts` opens with a contract: one walk per tree, every lookup a lazy projection keyed on tree identity, and a new lookup joins that walk rather than starting its own. A real tree change produces a new tree object, so every projection's identity cache misses at once and the single walk re-runs. That model is cheap on a small nexus and correct everywhere. It is also the obstacle: **8.6** is the title map updating incrementally instead of rebuilding, and **8.8**'s per-frame churn is driven by the connection identity that turns over on every one of those rebuilds. Incrementalizing the title map in isolation breaks the "one walk" invariant for the other nine projections.

So **8.6 is the keystone** for 8.8. Its decision — stay rebuild-on-identity, or move the whole tree index to carry-forward-with-deltas — sets the model 8.8 folds into.

**8.3 no longer folds into it.** `treeIndex.ts` resolves icons and trails through `@pommora/uix`, which makes it renderer-only, and the engine/renderer split now enforces that at the type gate. The walk 8.3 names — `indicesOf` in `valuesChanged.ts` — is reached from the host's settle path (`Desktop/FileWatch/watcher.ts` → `Core/Nexus/watchSettle.ts` → `pageIdIndex`), on the engine side of that line. An engine module importing `treeIndex` is a compile error, so `byPath`/`byId` cannot become projections of the tree index under any model 8.6 picks. 8.3 stands on its own, and its narrow answer — carry the ids out of the patch outcome, where they are already in hand — is the only one of its two options still open. That makes it independent, and cheaper than the doc first framed it.

**8.5** is independent too: it lives in the agenda-folder classifier, touches neither the tree index nor the title map, and is two small correctness calls.

| Item | Finding | Where | Depends on |
| --- | --- | --- | --- |
| 8.6 | R-39 | `Core/Nexus/treeIndex.ts` | — (keystone for 8.8) |
| 8.8 | R-41 | `Core/MarkdownPM/decorations.ts` | 8.6 |
| 8.3 | — | `Desktop/FileWatch/watcher.ts`, `Core/Nexus/watchPatch.ts`, `valuesChanged.ts` | — (engine side) |
| 8.5 | R-38 (d)(e) | `Core/Nexus/folderKind.ts`, `Desktop/FileWatch/watcher.ts` | — |

##### 8.6 / R-39 — The Title Map Rebuilds Wholesale · Keystone

**Where.** `treeIndex.ts:249-253` `pageIndexOf` calls `buildPageIndex` (`Core/MarkdownPM/Links/connectionsApi.ts:67-104`), which builds the `byTitle` map over the tree's page records (O(all nodes)). `Core/Session/pageConnections.ts` reads it through `connectionsFor` inside `useMemo(…, [tree, …])`, so the lazy build fires eagerly on the first render after every tree change, per mounted editor.

**Now.** Every projection is WeakMap-cached on tree identity. A real tree change produces a new tree object, the cache misses, and the walk plus `buildPageIndex` rebuild. The waste is that most tree-identity changes touch zero page titles: `container-meta`, `space-meta`, `settings-leaf` (an accent or personalization write spreads `{...t}` at `watchPatch.ts:374-389`), `homepage-leaf`, and `crops-leaf` all mint a new identity while the title map is unchanged. Most invalidations are false. A `page-upsert`, the one event that can change a title, changes at most one.

**Narrow answer.** None exists today; the index is rebuild-only. An incremental path would carry `byTitle`/`byPath` across tree versions and apply a per-patch delta — add or remove one page from its normalized-title holders list.

**The decision.** Keep whole-rebuild, or thread an incremental index through `patchLiveTree`. The obstacle is the `treeIndex.ts` "one walk" contract: incrementalizing only the page index breaks that invariant for the nine sibling projections (`nodes`, `resolve`, `reconcile`, `search`, `pages`, `pagesById`, `containers`, `navKeys`, `ancestry`). So the real question is not "incrementalize the title map" but "does the tree index move from rebuild-on-identity to carry-forward-with-deltas as a whole." That is why it gates the other two.

**Blast radius.** `resolveConnection` (`treeIndex.ts:280`) → `connectionMenu.ts`, `linkResolve.ts`; `connectionsFor` → `pageConnections.ts`, feeding decorations, embeds, and table cells; and `candidates()` autocomplete reads the same map.

##### 8.3 — Watcher Id Resolution Walks The Tree · Independent

**Where.** Two walks on the settle path (`watcher.ts:87` `settle`): (a) `valuesChanged.ts:31-49` `indicesOf` recursively walks every collection, set, and page to build `byPath`+`byId`, reached through `watchSettle.ts:60`; (b) `watchPatch.ts` `containerAt`/`findSpace` inside `classifyEvent`, a recursive walk per event.

**Now.** `indicesOf` is WeakMap-cached on tree identity, but `valueChangesOf` is handed the tree taken *after* `applyWatchEvents`, and every patched batch installs a new tree object — so the cache misses cold every batch and walks O(pages) to resolve what is typically one id. Separately, `classifyEvent` runs at three sites per batch (`watchPatch.ts:194`, `watchSettle.ts:63`, `watchSettle.ts:83`); `applyWatchEvents` computes the classification but returns only `'patched' | 'refresh'`, so two of the three passes recompute a discarded result.

**Narrow answer.** The id is already in hand at patch time and dropped — `patchPageFromDisk` holds `record.node.id` (`watchPatch.ts:268`) and `existing.id` (`:272-273`). Surfacing it means widening the `applyWatchEvents`/`applyOne` return shape to carry the touched ids out. Cached O(1) resolvers already sit beside it (`liveIdOf`/`livePathOf`, `valuesChanged.ts:60-68`) but read the same cold index.

**The decision.** Carry the post-patch ids out of the patch outcome, where they are known at write time and cost no index at all. The alternative — reading them from a tree index — is closed: `indicesOf` runs on the engine side, `treeIndex` is renderer-only, and the split is enforced at the type gate. So this is a shape question about `applyWatchEvents`/`applyOne`'s return, not a model question, and it waits on nothing. The three-classify half is the **same mechanism 8.5(e) raises** — resolve them together.

**Blast radius.** `values:changed` consumers: `flushValueWrites` (`valuesChanged.ts:70`, used for main's own writes via `confirm.ts`), `loadValues.ts`, `fileHistory.ts`, and renderer subscribers (`useBridgeSubscriptions.ts` → `bumpContainerValues`, contract at `bridge.ts:257`). `noteValueWrite` writers: `Trash/spend.ts`, `Nexus/move.ts`, `create.ts`, `Properties/governedWrite.ts`, `governedSweep.ts`.

##### 8.8 / R-41 — The Decoration Set Rebuilds Per Scroll Frame

**Correction to the finding.** The audit reads this as "re-resolves every visible connection." Resolution is cheap: `conn.resolve` is `normalizeTitle` plus a `Map.get` (`Core/MarkdownPM/Links/connectionsApi.ts:78-83`). A resolution cache would memoize a hash lookup and is not worth scoping. The real per-frame cost is elsewhere.

**Where.** `decorations.ts:328-473` `build`, re-run on `viewportChanged` (the scroll trigger) at `:488-491`. Per frame it re-tokenizes the new viewport span (`visibleInlineTokens:277`, whose 2-slot `docSpanTokens` cache misses on every new scroll position), runs `assembleLineIntents` over the viewport, allocates every `Range<Decoration>`, and pays the O(R log R) sort in `Decoration.set(ranges, true)` at `:472`.

**Now.** Version-stable inputs are already cached via `perDoc`/`docCache` — `docScan`, `docLineIntentsOf`, `docSpanTokens`, `docAtomics`. The final `DecorationSet` is not cached; `build` recomputes in full each call because it mixes (doc, span, conn)-stable output with (selection, focus, `linkRest`, `linkTyping`)-volatile output in one `ranges` array. Inline tokens are viewport-scoped by design — scrolling genuinely changes the visible set — so the *set* changing per scroll is correct; rebuilding the *whole* set is not.

**Narrow answer.** The `docSpanTokens` two-slot pattern is the model: cache a stable decoration layer keyed on (doc identity, span key, conn identity) and rebuild only a thin volatile layer for the active token. Any such cache must invalidate on connection change — the plugin's signal is `resolutionNudge` (`decorations.ts:489`), and `conn` identity itself turns over per tree through `pageConnections.ts`. That turnover is the churn **8.6** governs, which is why this follows it.

**Blast radius.** `markdownDecorations` mounts at `MarkdownEditor.tsx:223/229` and `Tables/CellEditor.tsx:115`. `resolutionNudge` is also emitted by `embedWidget.tsx:481`. The `atomic` half of the built result feeds `EditorView.atomicRanges` (`:497`) and seats the caret, so any split must keep `atomic` intact — it is already `perDoc`, not viewport-scoped.

##### 8.5 / R-38 (d)(e) — The Folder Classifier · Independent

Two separate calls, both correctness, neither touching the tree index.

**(d) The existence check.** `folderKind.ts` classifies an agenda folder by whether `_taskconfig.json` / `_eventconfig.json` is present, using `pathExists` — true for a file that exists whether or not it parses. `agendaContext` already holds the parsed sidecars, so the tempting fix is to answer from that map and skip the second disk read. It is not behavior-preserving: `readSidecar` returns null for a missing *and* a malformed sidecar, so a folder carrying a broken `_taskconfig.json` reads as absent from the parsed map, and under adoption that fabricates a Collection — breaking the pinned guarantee at `adopt.test.ts:96`. **Decision:** carry sidecar *existence* alongside the parsed map, so the classifier reads existence from memory without losing the malformed-but-present case, or change the adoption guarantee and its test.

**(e) The shared classification.** `applyWatchEvents` classifies the batch pre-patch; `valueChangesOf` and `tilesChangedIn` classify it post-patch and post-refresh. The three agree on the `'patched'` outcome but diverge on `'refresh'` for an entity present in only one of the two tree states, which changes which `values:changed`/`tiles:changed` pushes fire. **Decision:** is one shared classification acceptable, or must each site classify against its own tree state? This is the same three-classify mechanism **8.3** flags — decide it once, for both.

##### Sequence

1. **8.3 and 8.5 anytime, and together.** Both sit on the engine side, neither waits on a model decision, and they share the three-classify question — decide it once. This is the cheapest work in the set and no longer blocked by anything.
2. **8.6 next.** It is the model decision 8.8 inherits. Building 8.8 before it means building on a shape that may move.
3. **8.8 after 8.6.** The stable decoration layer keys on the connection identity 8.6 governs.

##### Decisions Nathan Owns

- **D-8.6 (keystone):** Does the tree index stay rebuild-on-identity, or move to carry-forward-with-deltas? The rebuild is cheap on a small nexus and correct; the case for change is nexus size and sync churn, so this reads as a "when it starts to hurt" call rather than a now call. 8.8 waits on it.
- **D-8.3:** Widen `applyWatchEvents`/`applyOne` to carry the touched ids out, or keep resolving them by walking. The tree-index option is closed by the engine/renderer split, so this is a return-shape call and needs no ruling from the keystone.
- **D-8.8:** Split the decoration build into a stable (doc, span, conn) layer and a volatile active layer, or leave it monolithic. Follows D-8.6. A resolution cache is not on the table.
- **D-8.5 (d):** Carry sidecar existence separately from the parsed map, or change the adoption guarantee and its test.
- **D-8.5 (e):** One shared watch-batch classification, or one per site. Decided together with the three-classify half of 8.3.
