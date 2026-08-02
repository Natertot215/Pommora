### Quick Capture

> **Unbuilt — this is a design, not a record.** No capture pane, no entry point, no capture code exists. Everything below describes the intended shape.

A lightweight surface for adding **Pages, Tasks, and Events** from outside the main window, in the Things 3 / Drafts idiom. It's meant to be another entry point onto the existing data layer rather than a parallel one — the same create operations and property surfaces the main app uses.

Capture is title-and-properties first, not a body editor — prose continues in the main window.

### Features

#### II. Single-Owner Principle

Every Pommora write goes through the main process's atomic-write path. Quick Capture is therefore a surface inside that process, not a second binary: it reuses the live data layer directly, with no second writer to coordinate. Any external source acts as a **courier** — it gathers a payload and hands it to the running app, which performs the write. The courier never writes to the Nexus itself.

#### II. Capture Flow

1. **Pick kind and scope** — a Page picks its Collection (optionally a Set); a Task or Event is top-level.
2. **Fill the entity** — a title plus the schema's property fields, shown as a compact subset with a "show all" affordance since a Collection can carry many.
3. **Save** — the entity lands in the Nexus immediately.

#### II. Web Capture Routes

Capture is meant to extend to web clipping — a page's title, URL, description, and selected text into a new Page or a Task / Event. The clipper is always a courier handing its payload to the running app. Candidate routes can coexist: a browser extension over native messaging, a system share target, or a `pommora://capture?…` URL.

### Pending

**The Entry Surface:** The Electron entry surface is the open design decision — a global shortcut, a tray-based popover (heavier than a native menu-bar item), or a launch-at-login background agent, paired with the web-capture courier route. Capture while the app is fully quit stays out of scope — a headless writer would reintroduce the multi-process problems the single-owner principle avoids.

**Scope:** Whether Quick Capture ships Page-only or waits on the Agenda write path is unruled. Pages have a create operation; Tasks and Events don't — no agenda write path exists — so capturing them is gated on that being built. The generic `.md` writer carries no Collection assumptions, so what it waits on is Agenda's shape, not new plumbing.
