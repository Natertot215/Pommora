## PM-110 Web Layer Follow-Ons — Task List

The four asks that landed after PM-108 closed. Tracked here because they arrived as live direction rather than through a spec cycle; each is small enough to carry its own verification, and the arc closes with `/closeout`.

### Tasks

- [x] **1 — Webpage settings consolidate under Interface.** Open Links In Pommora and Webpage Zoom both live in an Interface ▸ Webpages section; Files & Links keeps its markdown-link settings and Pages & Editor its editor toggles. ConfigurationPM and WebviewPM's pointer follow.
- [x] **2 — A custom webpage zoom.** Double-clicking the zoom control opens it for a typed percent, coerced through the existing clamp; the control displays the real value rather than the nearest step.
- [x] **3 — Tab warmth: an open tab's embeds stay alive.** A tab switch destroys the editor today, which tears down every guest, so a webpage tile reloads cold and loses its site state. The chosen shape (Nathan's call) is the **keep-alive host**: a capped set of recently-active tabs keep their detail surface mounted and hidden rather than unmounted, so the guest's DOM node — and its process — survive the switch. Guests survive `visibility: hidden` and die on `display: none`, which is the constraint the hiding mechanism has to respect.

  **Shipped:** the detail pane hosts page surfaces per tab, keyed by tab id, with the unshown ones parked off screen (`translateX`, not hidden — a hidden subtree keeps painting, where an off-screen one reads as out of view and pauses under the tile's own retention, which is the pause Nathan asked for). `PageView` takes its tab, its parked flag, and its own page detail, so a parked surface warms and captures under the tab that owns it rather than whichever is active. The page-editor registry publishes only the shown surface's editor. **The one non-obvious trap:** hosts render in a fixed id order, never active-first — reordering keyed children moves their DOM, and a moved webview is re-attached, which ended the very guest the mechanism exists to keep (observed: the marker set inside a guest was gone after one flip; with the order pinned it survives).

  **Measured live:** a guest marked in-page kept its `webContentsId` and its marker across park → resume, wearing `is-retained` while parked. Tab flips also got faster: ~50ms to the second frame after the switch, against ~210ms with parking off — the editor no longer rebuilds.
- [x] **4 — Hover previews scroll.** The card's shield owns every pointer event so the leave lifecycle keeps running; the wheel forwards to the guest through main rather than the shield surrendering the pointer, so the card stays inert to clicks while scrolling like a page card does. Measured in the guest itself: a wheel down took its `scrollY` 0 → 504 and a wheel up returned it to 48, with the host's own scroller unmoved throughout.
- [ ] **5 — `/closeout` the arc.** The feature doc is now `WebviewPM.md` (Nathan's rename); every wiki-link and the codebase map follow it.

### Verification

- Gates from `Pommora/`: `npm run typecheck` · `npx vitest run` · `npm run lint`, exit codes read directly.
- Task 3 is the one with a real regression surface: tab switching, memory under many open tabs, and the editor state cache it partially supersedes.
