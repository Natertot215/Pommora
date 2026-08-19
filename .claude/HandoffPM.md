## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** 371a6d22-5682-491c-ab8e-75a30b833e22
**Dates:** 08-18-2026 → 08-19-2026
**Model:** Opus 5

**The web layer's follow-ons, and the tab surfaces that made one of them possible.** PM-108 shipped, closed, and was reviewed at its floor; this stretch is the round of direction that followed it — five changes, each asked for live, each verified in the running app rather than asserted.

**Settings consolidated, then consolidated again.** The webpage preferences moved out of Pages & Editor into Files & Links, and then — on the next reading — into **Interface ▸ Webpages**, where the open-in knob and the webpage scale now sit together. The scale itself stopped being nine fixed steps: a second press on the control opens it for a typed percent, coerced through the existing clamp, and an off-step value takes its own place among the choices so the control reads the real scale rather than the nearest step. The `Number.isFinite` guard on that commit is load-bearing — typed nonsense leaves the stored scale alone rather than silently resetting it to 100%.

**Hover previews scroll.** The card's shield owns every pointer event so the leave lifecycle keeps running; it now passes the wheel down to the guest through a main-process replay (`web:wheel`), which keeps the card inert to clicks while letting a site read past its first screen. Measured inside the guest: `scrollY` 0 → 504 down, back to 48 up, with the host's own scroller unmoved.

**Tab switches stopped reloading pages.** The detail pane used to render exactly one view for one selection, so a switch destroyed the editor and every guest with it. It now hosts page surfaces **per tab**, keyed by tab id, with the unshown ones parked off screen — `translateX`, deliberately not `visibility: hidden` (a hidden subtree keeps guests painting) and never `display: none` (that tears them down). Parked surfaces read as out of view, so their sites pause under the retention that already existed and resume on return. The one non-obvious trap, found live: hosts must render in a **fixed id order**, never active-first, because reordering keyed children moves their DOM and a moved `<webview>` is re-attached — which destroyed the very guest the mechanism exists to keep. Proven by marking a guest in-page and watching the marker survive park → resume; flips also got ~4× faster (~50ms against ~210ms), since the editor no longer rebuilds.

**Edit Link went inline.** The tile's grip menu used to open a picker anchored on the tile, and because the picker's open state was part of the tile widget's identity, merely opening it rebuilt the widget and reloaded the site before anything was typed. It now works like every other Edit Link: the seat un-forms the tile back to its raw address with that address selected, typing replaces it, and leaving the line re-forms the tile — so the site loads once, on submission. A `setWebLinkSeat` effect distinguishes a deliberate seat from a caret that merely happens to be there, which the formation gate alone can't. The height migration the old picker carried is gone with it: a re-aimed tile takes the default height, since a remembered height belongs to an address.

Everything is committed and gated — typecheck 0, **2957 tests / 255 files**, lint clean with zero warnings. One thing worth flagging for the next session: the app died once mid-session with `GUEST_VIEW_MANAGER_CALL: UnknownVizError` in the log. It came back clean and the cause was a second Electron instance fighting for the debug port after a double launch, not the parking work — but that error class is worth recognizing rather than re-diagnosing from scratch.

#### Completion Criteria

- [x] **Webpage preferences under one heading** — the open-in knob and the scale together in Interface ▸ Webpages, with ConfigurationPM and every pointer following them.
- [x] **A typed webpage scale** — a second press opens the control for any percent within the clamp, and the control displays the real value.
- [x] **Hover previews scroll** — the wheel reaches the guest while the card stays inert to clicks, verified inside the guest itself.
- [x] **A tab flip resumes rather than reloads** — a recent page tab's surface is parked, its guests paused, its session and scroll intact on return.
- [x] **Edit Link edits in the line** — the address is selected in place and the site loads only once the line re-forms.
- [x] **The docs say what shipped** — WebviewPM (renamed from WeblinkPM), NavigationPM's new §State Persistence, and the siblings trimmed to pointers rather than restating the tiers.
- [ ] **Nathan's own pass over the five** — the settings placement, the typed-zoom field, the scroll feel, a real tab flip on a page with a live site, and Edit Link from the grip menu.

#### Next Session

- **Watch for `UnknownVizError` on guest teardown.** It appeared during HMR churn with parked guests and again around the instance collision. Benign so far, but if it recurs without a second instance in play, the parking teardown is the first place to look.
- **The height a re-aimed tile loses.** Edit Link inline means a tile pointed at a new address takes the default height. If that reads wrong in use, the fix is a migration at formation rather than a return to the picker.
- **Static table cells still don't arm site hovers** — the same link previews in the body; a parity fixlet with its own small design.
- **`md-connection-resolved` is a literal at six read sites** — the `MD_LINK_CLASS` treatment fits it the day any of them changes.

#### Feedback

- "Actually do the simpler thing and make right-click drag handle edit link just edit the link in line like all other edit link actions" — the second design was the right one; the first answered the letter of the ask and carried a whole singleton with it.
- "no closing lines. Just restate to be true" — a record is amended by making its existing prose true, never by appending what changed since.
- "no new history entry, just my final thoughts on the Webview original entry"
- "also, the drag-handle edit loink should pop from tjhe menu itself, and only re-load the page on submission."
- "make sure all trial and error adjustments and css hand-rolling is cleaned up during the final phase"

#### Session Pointers

- `.claude/Features/NavigationPM.md` §State Persistence — the four-tier map of what Pommora remembers and for how long; the mechanisms stay ArchitecturePM's.
- `.claude/Guidelines/Web-Guests.md` — the guest traps. Read before touching any web surface.
- `Pommora/src/renderer/src/Detail/DetailPane.tsx` — `useHosts` and `WARM_TABS`; the fixed sort order is load-bearing, not style.
- `Pommora/src/renderer/src/Detail/Detail.css` — `.detail-page.is-parked`, the off-screen seat.
- `Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx` — `setWebLinkSeat` and the formation gate that reads it.
- `Pommora/src/renderer/src/MarkdownPM/gripMenuFlow.test.tsx` — the Edit Link seat test, and the harness that stubs the native grip menu.
- `Pommora/src/main/webGuests.ts` — `wheelGuest`, the guest-side wheel replay.
- `.claude/Planning/PM-110 Web Layer Follow-Ons — Task List.md` — what was asked, in order, with what each verification actually showed.
- The CDP driver is this session's scratchpad `cdp.mjs`; `guest.mjs` beside it evaluates inside a guest by URL fragment, which is how guest survival was proven.

#### Working Notes

- **Moving a `<webview>` in the DOM re-attaches it, ending its guest.** Any list that renders guests must keep a stable order; React moves keyed children when their order changes.
- **A hidden subtree keeps guests painting; an off-screen one doesn't.** That difference is why parking translates rather than hides, and it's what makes a parked tab cheap.
- **Lint exits 0 with warnings.** Read the text — a dead const and two unused imports sat behind an exit code of 0 this session.
- **A python edit script that asserts mid-way writes nothing**, which is the desired failure, but the earlier substitutions are lost too — re-run the whole script rather than assuming a partial apply.
- **Two dev launches race for the debug port** and the loser leaves an Electron process holding the app with nothing listening. Kill every `Project Pommora/Pommora/node_modules/electron` process before relaunching.
- **The grip menu is native, so CDP can't click it** — its flows are testable only through the editor harness's `stubEditorBridge`.

#### Changes

**FILES ADDED**

- `.claude/Planning/PM-110 Web Layer Follow-Ons — Task List.md`

**FILES MODIFIED**

- `.claude/CLAUDE.md` · `.claude/HistoryPM.md` · `.claude/Planning/PM-108 Webpage Integration — Implementation Plan.md`
- `.claude/Features/WebviewPM.md` *(renamed from `WeblinkPM.md`)* · `NavigationPM.md` · `ConfigurationPM.md` · `PagePreviewPM.md` · `ViewsPM.md` · `ConnectionsPM.md` · `MarkdownPM.md` · `.claude/Guidelines/Web-Guests.md`
- `Pommora/src/shared/bridge.ts` · `webpageEmbed.ts`
- `Pommora/src/main/index.ts` · `webGuests.ts` · `Pommora/src/preload/index.ts`
- `Pommora/src/renderer/src/Detail/DetailPane.tsx` · `PageView.tsx` · `Detail.css`
- `Pommora/src/renderer/src/MarkdownPM/editor/embedWidget.tsx` · `gripMenu.ts` · `gripMenuFlow.test.tsx`
- `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` · `WebpageEmbed.tsx`
- `Pommora/src/renderer/src/Settings/NexusSettings.tsx` · `Components/Detail/PickerControl.tsx`

**FILES REMOVED**

- None.

**COMMITS**

- `347b90ce` — refactor(settings): the open-in preference sits with the other link settings
- `2f837cb5` — feat(settings): the webpage preferences group under Interface, and the zoom takes a typed scale
- `521f547c` — feat(embeds): a hovered site reads past its first screen
- `03f3fc49` — feat(detail): a recent tab's page surface parks instead of tearing down
- `13de245b` — feat(editor): a tile's Edit Link re-aims the address in the line

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
