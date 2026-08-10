## Quick Capture

> **Unbuilt — a design, not a record.** Everything below describes the intended shape.

A lightweight surface for adding **Pages, Tasks, and Events** from outside the main window, in the Things 3 / Drafts idiom — another entry point onto the existing data layer rather than a parallel one, using the same create operations and property surfaces the main app uses. Capture is title-and-properties first, not a body editor; prose continues in the main window.

### The Courier Model

Every Pommora write goes through the main process's atomic-write path (→ [[ArchitecturePM]]), so Quick Capture is a surface inside that process rather than a second binary. Any external source acts as a **courier** — it gathers a payload and hands it to the running app, which performs the write. The courier never writes to the Nexus itself.

### Capture Flow

1. **Pick kind and scope** — a Page picks its Collection (optionally a Set); a Task or Event is top-level.
2. **Fill the entity** — a title plus the schema's property fields, shown as a compact subset with a "show all" affordance.
3. **Save** — the entity lands in the Nexus immediately.

### Web Capture Routes

Capture extends to web clipping — a page's title, URL, description, and selected text into a new Page or a Task / Event. The clipper is always a courier handing its payload to the running app. Candidate routes can coexist: a browser extension over native messaging, a system share target, or a `pommora://capture?…` URL.

### Pending

- **The entry surface** — the open design decision: a global shortcut, a tray-based popover, or a launch-at-login background agent, paired with the web-capture courier route. Capture while the app is fully quit stays out of scope — a headless writer would reintroduce the multi-process problems the courier model avoids.
- **Scope** — whether Quick Capture ships Page-only or waits on the Agenda write path is unruled. Pages have a create operation; Tasks and Events don't, so capturing them is gated on the agenda write path being built. The generic `.md` writer carries no Collection assumptions — what it waits on is Agenda's shape.
