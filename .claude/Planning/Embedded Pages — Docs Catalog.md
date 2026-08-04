## Embedded Pages — Falsified-Claims Catalog

The durable record of every documentation claim and code comment the embedded-pages implementation makes false, quote-verified at plan time. Consumed by the plan's Phase 4b/5/6 tasks by item number. Rule: fix or remove, never amend; when an enumeration went incomplete, remove the enumeration in favor of the rule. Re-verify each quote before editing — earlier phases may have consumed items piecemeal.

### Documentation

1. `MarkdownPM.md:95` (Host Services) — "Images, LaTeX, and syntax highlighting are **detected and styled only** — there is no renderer and no injection seam for them." → Page embeds now render; split page embeds (rendered, riding the shared Embed Framework) from image/LaTeX (still styled-only).
2. `MarkdownPM.md:71` (Block Drag) — "The rail grip (paragraph / code / hr / list) is a content-anchored `::before`… the heading chevron, the blockquote's own grip widget, the callout's gutter grip, and the table's heading-row action grip double as drag handles…" → Both enumerations go incomplete. **Ruled: remove the enumerations** — every grip doubles as a drag handle and carries its own menu.
3. `MarkdownPM.md:127` (Deferred) — "**Image + LaTeX** render seams (detected + styled, never rendered)" → "never rendered" breaks over the `![[` class; rephrase: file targets stay inert by failing page resolution; the image seam stays reserved.
4. `SurfacePM.md:25` (Embed Framework) — "…and MarkdownPM's `![[Embed]]` when it arrives." → It arrives; name both as shipped consumers.
5. `SurfacePM.md:61` (Pending) — "**Page banners on embeds** — …toggled from the embed's heading area… the entry's `banner` and `title` stay wired." → The per-embed toggle design is rejected (C-1: the page's own cover decides). Delete the Pending entry; state the shipped rule in the Embed Framework section.
6. `ConnectionsPM.md:13` — "`![[ ]]` isn't a connection — the tokenizer claims it as an image embed — and `{{ }}` renders as written." → "image embed" naming dies; and the rename cascade now rewrites `[[` and `![[` in one sweep. Restate both.
7. `ConnectionsPM.md:53` (Prospects) — "…and transclusion (`![[ ]]`)." → Transclusion ships; drop it from the prospect, keep anchors/wider targets.
8. `ConnectionsPM.md:37` (Autocomplete) — "Typing inside `[[ ]]` filters Pages nexus-wide… Return commits a bare `[[Title]]`" → One panel serves both syntaxes; embed mode adds the dedup filter and commits the embed form.
9. `ViewsPM.md:85` (Prospects) — "Block-host surfaces get embeds — …Page bodies don't." → Narrow to *view* embeds; page embeds → [[MarkdownPM]].

### Code Comments

10. `src/shared/connections.ts:4` ("`![[ ]]` and `{{ }}` are not connections.") + `:21–23` ("excluding `![[ ]]` image embeds. `[[ ]]` is the only connection syntax.") → A parallel embed pattern now lives beside it for the cascade; `![[` still creates no edge. Restate; note the token layer as a pattern consumer.
11. `src/main/connections/scan.ts:2–4` — "`![[ ]]` embeds… are excluded (handled by the pattern)" → The embed-aware sweep exists; name where the edge-exclusion actually lives.
12. `src/main/connections/rewrite.ts:7–9` — "Non-matching links, `![[ ]]` embeds… are left untouched" → Embeds are rewritten; code stays untouched.
13. `imageEmbed` naming family — `detect/index.ts:4` regex · `tokens/index.ts:22` TokenKind · `decorations/intent.ts:106` class map · `Styles.css:331` `.md-image` (+ both test files). → Renamed to embed vocabulary in Plan Task 1.1's single commit.
14. `MarkdownPM/editor/calloutGripMenu.ts:1–5` (+ the `:29` stale-flag comment) — callout-only grip-menu framing → generalized flag + per-grip menu family.
15. `main/editorMenu.ts:20–26` + `:189` — "callout grip" flag comments → any-grip; rename `calloutGripHot` → grip-hot vocabulary.
16. `src/preload/index.ts:197–198` + `bridge.ts:297` + `main/index.ts:1605` — `setCalloutGrip` / `'editor:callout-grip'` naming → rides the same rename. (`calloutMenu` itself stays callout-specific — true.)
17. `MarkdownPM/editor/blockHandles.ts:1–4` ("the rail grip covers paragraph, code, hr, and a list") + `:49–52` ("the host's callout-grip flag") → de-enumerate; "the host's hot-grip flag".
18. `MarkdownPM/index.tsx:166–167, 168–170, 179–180` — rail-handle enumeration + callout-flag comments → generalize alongside the widened predicate.
19. `Tabs/warmCache.ts:1–5` — "Two writers share one key…" → the path-keyed detail slot adds a third writer (pageFlush write-through) and a second key-space; `:42–44` `dropWarmDetail` scope extends to the slot. Header restates both stores.
20. `Detail/pageFlush.ts:1–5` — header gains one line for the write-through duty (borderline; nothing strictly false).
21. `Embeds/PageEmbed.tsx:8–9` — "Header chrome (banner + title) is parked; returns with the ⋮ toggle pass." → C-1 ships the banner-or-breadcrumb display-only header; drop the parking sentence. (First sentence stays.)
22. `Embeds/embeds.css:1–4` — "Header chrome (banner + title) is parked — returns with the ⋮ pass." → Same. (The `:54` "parked-header steady rule" is a different "parked" — the scroll-pinned banner — stays true; never sweep by string-match.)
23. `PagePreview/previewTabStrip.css:1–4` — "…it lives with its component rather than in any one window's shell." → The two-tone crumb rules hoist to `Tabs/tabStrip.css`; header narrows to the title/strip morph.
24. `SurfacePM/surfacepm.css:191–196` — "the handle's menu carries the exact location, so the border only signals 'this is an embed.'" → False for the handle-less MarkdownPM consumer (location = hover breadcrumb). The rationale comment is **rewritten** wherever the shared signal lands, never carried verbatim. Also `:7–8` "blocks sit transparent on the surface" — "the surface" doesn't exist for the new consumer; reword where the moved rules land. The "Nathan tunes these live" KNOB framing travels with the moved rules.
25. `Navigation/NavList.tsx:17–18` — "Shared by the list rows and the gallery cards" → already stale (preview + cards mount it too); restate as the shared icon-and-title crumb any surface mounts.

### Verified Clean (do not touch)

`AgendaPM.md:24` (kind partition) · `PagePreviewPM.md:11` · `MarkdownPM.md:111` (derivation caching) · `MarkdownPM.md:57` + `editor/input.ts:33–35, 55–57` (table fence comments stay table-scoped) · `blockModel.ts` (no exhaustive kind enumeration) · `SurfacePM/README.md` · Guidelines (historical process records) · `.claude/CLAUDE.md`'s Connections paragraph.
