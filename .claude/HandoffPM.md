## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** 371a6d22-5682-491c-ab8e-75a30b833e22
**Dates:** 08-18-2026 → 08-19-2026
**Model:** Opus 5

**PM-108 Webpage Integration — built, gated, and closed; what remains is Nathan's own eyes.** The session ran the whole arc from spec to closeout: the decision log, the implementation plan and its attack round, then seven phases delivering live websites inside Page bodies, an in-app browser, one remembered web session, and website hover previews.

The shape that emerged is one governor and many surfaces. `main/webGuests.ts` owns what an attach may be, which session guests live on, where their popups go, and how they track host zoom; the tile, the browser, and the hover card each attach under those rules and carry none of their own. On the renderer side, `openWebLink` is the single adjudicator every external link passes through, so the Open Links In Pommora preference cannot be honored in one place and missed in another. The editor half is a grammar: a lone markdown link line carrying an explicit scheme forms a tile once the selection departs it, and the document bytes stay plain CommonMark.

Three directives redirected the build mid-flight and are recorded as deviations rather than drift. **Accounts were built whole and dissolved the same night** — "no account in-app, it just remembers" — so the partition simply persists and there is no settings surface at all. **The browser chrome** went through five iterations against live screenshots; the resting shape is a reserved strip that paints nothing with the page flowing beneath it, and the Safari treatment Nathan actually wants is logged as a Known Issue with the reason it can't be reproduced literally over a webview (a guest scrolls internally, so host chrome never sees its content pass under, and a backdrop filter cannot sample guest pixels). **The parting frame** — a clipped tile keeps its last captured frame instead of going blank.

Two dead ends cost real time and are worth not repeating. The spec wanted the hover card's guest mounted hidden and bloomed on load; Chromium defers guest attach inside hidden subtrees erratically — observed at four seconds, or never — so the shipped model mounts the guest **visible** behind an opaque cover that lifts on load. And React only serializes *string* values for attributes it doesn't recognize, so a bare boolean `allowpopups` never reached the attach and every guest popup died silently inside Blink; the empty-string cast is load-bearing, not a style choice.

The closing pass ran a fresh-context simplifier plus a full review over `f9ca6aa8..HEAD` and found the arc at its floor: three cosmetic edits, **net −3 code lines**, nothing behavioral. It did surface one real defect outside PM-108 — Appearance ▸ Accent Color never reflected the stored accent and couldn't be cleared, because `readPersonalization` omitted the key by design while the row read it. Fixed at `50f581a3` by resolving accent inside `readPersonalization` and deriving `tree.accent` from it, so the row and the paint now have one source. Gates green throughout: typecheck 0, **2956 tests / 255 files**, lint clean with zero warnings.

#### Completion Criteria

- [x] **The grammar and its claim** — a lone scheme-carrying link line forms a tile on selection departure; the on-disk bytes stay CommonMark; duplicates allowed, heights persisted per host and address.
- [x] **One governor** — attach validation, popup routing, and zoom stamping live in a single main-process module; no surface carries its own rules.
- [x] **One adjudicator** — every external open (editor, both table paths, tile title, guest popup) routes through `openWebLink` and honors the preference.
- [x] **Engagement and retention** — a tile is inert until clicked in; guests scrolled out hide rather than unmount under a capped LRU; a clipped tile keeps its last frame; failure tears the guest down and retries in front of the user.
- [x] **The browser and the hover card** — a floating browser with truthful back/forward and a live title; website links preview live, inert, and edge-to-edge.
- [x] **Docs reconciled** — WeblinkPM written whole, Web-Guests.md added, and MarkdownPM/ConnectionsPM/ConfigurationPM/PagePreviewPM corrected.
- [x] **The arc reviewed at its floor** — a fresh-context simplification and review round returning no behavioral findings, with every candidate ruled against the plan's standing adjudications.
- [ ] **Nathan's walkthrough** — the tile lifecycle, the grip, the browser, and hover previews seen running; ⌘± zoom stamping and trackpad feel, neither of which CDP can drive.
- [ ] **Sign-in persistence proven** — sign into a site in any surface, relaunch, still signed in. Credentials are never Claude's to enter.
- [ ] **Two design verdicts** — the browser chrome's resting band, and the Pages & Editor ▸ Webpages rows.

#### Next Session

- **Take the three verdicts** — the two designs above plus the ungated guest-popup ruling (scripted popups ride the open-link chain with no user-gesture gate; acceptable for trusted embeds, ungated by decision pending his word).
- **Appearance is one row closer.** The accent row now works; connection color and external link color already did. What's left unbuilt there is default icons per kind and the default view scale.
- **Static table cells arm page hovers but not site hovers** — `TableView.onLinkOver` reads `data-conn-title` only, so the site route needs URL derivation at the wrap-delegated hover site. A parity fixlet with its own small design.
- **The `md-connection-resolved` literal sits at six read sites** — the `MD_LINK_CLASS` treatment fits it the day any of them changes.
- **Session Roaming** — the spec's committed follow-up cycle (a passphrase-encrypted cookie vault), and the Prospects behind it: a dashboard `webpage` BlockEntry, per-account partitions, and an off-screen snapshot warm-cache.

#### Feedback

- "THe simplification pass MUST be done with a lense of looking at docs, additional features, and outside mechanisms to scope what is and isnt able to be removed, touched, or flagged as risk of future tech-debt."
- "no i ment the toolbar should just be see-through but still above" / "look at how safari does it… our own preview pages do this too, they add toolbar space, but that space is transparent against the real page" — effect words are literal; build the reference, don't reinterpret it.
- "make sure all trial and error adjustments and css hand-rolling is cleaned up during the final phase"
- "and please screenshot these attempts" — a design iteration without an image isn't a presented iteration.
- "dont get distracted. Fold my requests as approprite"

#### Session Pointers

- `.claude/Planning/PM-108 Webpage Integration — Implementation Plan.md` — the authority. §Rulings, §Deviations, §Known Issues and §Open Against Later Tasks are binding adjudications; read them before judging any of this code.
- `.claude/Guidelines/Web-Guests.md` — the six guest traps. Read before touching any web surface; several "obvious cleanups" in this code are these traps.
- `Pommora/src/main/webGuests.ts` — the one governor. `stampGuestZoom` is the zoom seam; `installWebGuests` holds the attach validator.
- `Pommora/src/renderer/src/Embeds/WebpageEmbed.tsx` — the tile. The parting-frame layout effect is the delicate part; `CAPTURE_DEADLINE_MS` is its knob.
- `Pommora/src/renderer/src/Embeds/webRetention.ts` — `WEB_RETAINED_MAX`, how many hidden guests stay alive.
- `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` — `present` is the whole state machine; the site flavor's cover lifts on `siteReady`.
- `Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx` — `WEB_FIT_MARGIN` and `WEB_FULL_RATIO`, the visibility gate's two knobs.
- The CDP driver lives in this session's scratchpad as `cdp.mjs`; the app takes `--remote-debugging-port=9222` and `window.__pommora` is the store.

#### Working Notes

- **Main-process and preload changes need a full dev restart** — neither HMR nor ⌘R picks them up, and a renderer calling a bridge method that doesn't exist yet unmounts the root.
- **Never read a gate's exit code through a pipe.** `vitest | tail` exits with tail's status; it masked a red suite for an entire session.
- **A design stop with the user asleep is still a design stop** — build to the spec, screenshot, and present for the verdict rather than blocking. Both Task 14 and Task 16 shipped that way, and one of them was dissolved on the verdict, which is the mechanism working.
- **The plan file is also a live page in Nathan's nexus.** Stray CDP typing once corrupted its Goal line; drive the editor only on a throwaway page.

#### Changes

**FILES ADDED**

- `.claude/Features/WeblinkPM.md` · `.claude/Guidelines/Web-Guests.md`
- `.claude/Planning/PM-108 Webpage Integration — Decision Log.md` · `— Implementation Plan.md`
- `Pommora/src/main/webGuests.ts`
- `Pommora/src/shared/webpageEmbed.ts` · `webpageEmbed.test.ts`
- `Pommora/src/renderer/src/openWebLink.ts`
- `Pommora/src/renderer/src/Embeds/WebpageEmbed.tsx` · `webRetention.ts` · `webRetention.test.ts`
- `Pommora/src/renderer/src/PagePreview/BrowserWindow.tsx` · `browserWindow.css`
- `Pommora/src/renderer/src/Settings/SettingsRow.tsx`

**FILES MODIFIED**

- `.claude/CLAUDE.md` · `.claude/Features/MarkdownPM.md` · `ConnectionsPM.md` · `ConfigurationPM.md` · `PagePreviewPM.md` · `.claude/HistoryPM.md`
- `Pommora/src/shared/types.ts` · `links.ts` · `bridge.ts` · `cellMenu.ts`
- `Pommora/src/main/index.ts` · `ipc.ts` · `readNexus.ts` · `menu.ts` · `linkTitles.ts`
- `Pommora/src/preload/index.ts`
- `Pommora/src/renderer/src/App.tsx` · `store.ts` · `Embeds/ConnectionHoverCard.tsx` · `embeds.css` · `PageEmbed.tsx`
- `Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx` · `embedRanges.ts` · `embedInsert.ts` · `links.ts` · `decorations.ts` · `blockModel.ts` · `Tables/cellStatic.tsx` · `Styles.css`
- `Pommora/src/renderer/src/Settings/NexusSettings.tsx` · `nexusSettings.css`
- `Pommora/src/renderer/src/Detail/Views/Table/TableView.tsx` · `LinkCell.tsx`
- `Pommora/src/renderer/src/design-system/components/PreviewPane/PreviewPane.tsx` · `previewPane.css` · `Components/EditableInput.tsx`
- *(The session's git window also carries Nathan's own parallel settings and color-ramp commits; those files aren't listed here.)*

**FILES REMOVED**

- None.

**COMMITS**

- ~70 commits across the arc; the plan's §Progress carries the full per-task ledger. The anchors:
- `2c2cc1df` — docs(planning): the PM-108 spec and its implementation plan
- `f46f7e6f` · `8869f7f1` — auto-format becomes built-in; the paste destination guard
- `3ddee5f2` — feat(main): the guest lifecycle module and the shared partition
- `28a555d2` · `de73e16d` · `bf094dc5` — the grammar, the kind-aware claim and formation gate, the live tile
- `ed442782` · `19388798` — engagement and the retention cap; the hover-title and Edit Link arm
- `525666fa` — feat(embeds): a clipped tile keeps its last frame instead of going blank
- `5c572a77` · `779d135d` — the open-in preference and its adjudicator; the in-app browser flavor
- `b9d29aaf` · `fc86d79a` — sessions just remember: the accounts surface and its verb dissolve
- `d40dba70` · `cf391154` — website links arm the hover intent; the card renders websites live and inert
- `7c9c8453` — docs: the web layer documented — WeblinkPM, the guest gotchas, and the touched features
- `e3ae30a7` — refactor(web): the hover card's guest and its shield state their shared box once
- `50f581a3` — fix(settings): the Accent row reads the accent that paints

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
