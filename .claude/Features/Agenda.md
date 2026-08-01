### Agenda

The operational layer's calendar-anchored side: two peer entity kinds, **Tasks** (reminder-shaped) and **Events** (calendar-shaped), each a `.md` carrying its kind's id key.

> **De-scaffolded.** Agenda carries no on-disk format, no CRUD, and no read surface. The shape it inherited was imported wholesale from the Swift build and never re-chosen, so it was removed rather than built on: every field, the item format, ordering, and the surfaces are open questions that the Agenda rethink answers. What survives is named below — the plumbing that holds for any form Agenda takes.

Each kind lives in its own singleton folder at the nexus root, discovered by a **config sidecar** and never by folder name — the folders stay renameable, and a folder carrying an agenda config is not a Collection. The layout and discrimination rules are `Architecture.md`'s.

### Architecture

#### II. What Holds Regardless of Form

- **Sidecar-declared kind.** A folder's kind comes from the well-known JSON filename it carries (`_taskconfig.json` / `_eventconfig.json`), the same law that declares Collections and Sets. A folder the nexus registers is that singleton; one it does not is inert, and neither is ever adopted as a Collection. A registered singleton stamps its own direct members and is flat — nothing below it is walked or stamped.
- **Identity refs.** `NavRef` admits `task` and `event` as bare `{kind, id}` refs, and `navigation.json` persists them. Three guards keep a stored ref safe while nothing routes it: the tab resolver, the pin target, and the favorite add each refuse an agenda kind, so a stored ref resolves to nothing rather than to a broken destination.
- **The sidebar mode.** Agenda is one of the Ribbon's modes, holding its place with an empty state → `Sidebar.md`.
- **Labels.** The `agendaTask` / `agendaEvent` singular-plural pairs are parsed from settings and defaulted; no surface reads them.
- **Inert search rows.** Nav search renders unresolvable hits as non-clickable rows → `Navigation.md`. Nothing produces them while Agenda is off the tree.

### Pending

**The Agenda rethink.** The item format, the field vocabulary, ordering, and every surface are unanswered. Two decisions are settled and bind that work:

- **Tasks and Events are Markdown.** One `.md` grammar covers all operational content — the body *is* the description — so agenda items inherit the page writers, the link cascade, and the editor rather than carrying a second serializer. JSON stays for sidecars, configs, and registries.
- **Agenda joins the tree walk.** Its kinds enter as their own top-level branch, which is what gives every Task and Event a record, a navKey, and a search entry. Collection-scoped consumers — connections, embeds, breadcrumbs — stay page-only by kind partition, not by new guards.

**Registration.** Exactly one Tasks folder and one Events folder are canonical, recorded by sidecar id at the nexus level. A hand-made config names an id the record doesn't hold, so it matches nothing and is inert; a nested one is inert on depth alone. A *copy* is the harder case, because every duplication mechanism reproduces the id the record keys on: two root folders claiming one record register neither, since no arm may pick between them, and a copy filed below the root stays where its owner put it rather than being carried up.

**A slot whose folder name is already taken goes unregistered.** Seeding refuses to write an agenda config into a folder that already exists, which is what stops it claiming a user's own `Tasks/` of notes; nothing fills that slot afterwards. Adopting or disambiguating it is the Agenda work's call, and needs a second writer to the registration record — today there is exactly one.

**Surfaces.** No selection kind opens a Task or Event, so there is no detail surface, no calendar or date-grouped layout, and no create path. Quick Capture's named blocker is exactly this.

**Built-in Status:** A non-deletable **Status** property on both kinds, tracking the user's engagement rather than the clock — for an Event it stays decoupled from the date math. Its group seed → `Properties.md`.

**EventKit Sync:** The opt-in bidirectional mirror to the system Reminders and Calendar apps. The calendar database is API-only — it consumes constructed objects with typed properties and has no file or key-value ingestion — so sync is a code-level translation layer whatever Pommora stores on disk, and it constrains none of the decisions above.
