## PM-110 Web Layer Follow-Ons — Task List

The four asks that landed after PM-108 closed. Tracked here because they arrived as live direction rather than through a spec cycle; each is small enough to carry its own verification, and the arc closes with `/closeout`.

### Tasks

- [x] **1 — Webpage settings consolidate under Interface.** Open Links In Pommora and Webpage Zoom both live in an Interface ▸ Webpages section; Files & Links keeps its markdown-link settings and Pages & Editor its editor toggles. ConfigurationPM and WeblinkPM's pointer follow.
- [x] **2 — A custom webpage zoom.** Double-clicking the zoom control opens it for a typed percent, coerced through the existing clamp; the control displays the real value rather than the nearest step.
- [ ] **3 — Tab warmth: an open tab's embeds stay alive.** A tab switch destroys the editor today, which tears down every guest, so a webpage tile reloads cold and loses its site state. The chosen shape (Nathan's call) is the **keep-alive host**: a capped set of recently-active tabs keep their detail surface mounted and hidden rather than unmounted, so the guest's DOM node — and its process — survive the switch. Guests survive `visibility: hidden` and die on `display: none`, which is the constraint the hiding mechanism has to respect.
- [ ] **4 — Hover previews scroll.** The card's shield owns every pointer event so the leave lifecycle keeps running; the wheel forwards to the guest through main rather than the shield surrendering the pointer, so the card stays inert to clicks while scrolling like a page card does.
- [ ] **5 — `/closeout` the arc.** The feature doc is now `WebviewPM.md` (Nathan's rename); every wiki-link and the codebase map follow it.

### Verification

- Gates from `Pommora/`: `npm run typecheck` · `npx vitest run` · `npm run lint`, exit codes read directly.
- Task 3 is the one with a real regression surface: tab switching, memory under many open tabs, and the editor state cache it partially supersedes.
