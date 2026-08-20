## Agenda

```
Agenda
├── Registration
└── Pending
```

The operational layer's calendar-anchored side: two peer entity kinds, **Tasks** (reminder-shaped) and **Events** (calendar-shaped), each a `.md` carrying its kind's id key. Each kind lives in its own singleton folder at the nexus root, discovered by a config sidecar and never by folder name — the folders stay renameable, and a folder carrying an agenda config is not a Collection (→ [[ArchitecturePM]]).

Agenda currently carries no on-disk format, no CRUD, and no read surface — the item format, field vocabulary, ordering, and surfaces are the Agenda rethink's to answer. What holds regardless of the form it takes:

- **Sidecar-declared kind.** A folder's kind is determined by the JSON filename it carries (`_taskconfig.json` / `_eventconfig.json`). A folder the nexus registers is that singleton; one it does not is inert, and neither is ever adopted as a Collection. A registered singleton stamps its own direct members and is flat — nothing below it is walked or stamped.
- **Identity refs.** `NavRef` admits `task` and `event` as bare `{kind, id}` refs, and `navigation.json` persists them. The tab resolver, the pin target, and the favorite add each refuse an agenda kind while nothing routes one, so a stored ref resolves to nothing rather than to a broken destination.
- **The sidebar mode.** Agenda is one of the ribbon's modes, holding its place with an empty state (→ [[SidebarPM]]).
- **Labels.** The `agendaTask` / `agendaEvent` singular-plural pairs are parsed from settings and defaulted; no surface reads them.
- **Inert search rows.** Nav search renders unresolvable hits as non-clickable rows (→ [[NavigationPM]]).

### Registration

Exactly one Tasks folder and one Events folder are canonical, recorded by sidecar id at the nexus level. A hand-made config names an id the record doesn't hold and is inert; a nested one is inert on depth alone. A copy is the harder case, since every duplication mechanism reproduces the id the record keys on — two root folders claiming one record register neither, and a copy filed below the root stays where its owner put it.

A slot whose folder name is already taken goes unregistered — seeding refuses to write an agenda config into a folder that already exists, keeping it from claiming a user's own `Tasks/` of notes. Nothing fills that slot afterward, because nexus creation is the registration record's only writer; adopting or disambiguating such a folder needs a second writer, and what one may do is the Agenda work's call.

### Pending

**The Agenda rethink** — the item format, the field vocabulary, ordering, and every surface. Two decisions are settled and bind that work:

- **Tasks and Events are Markdown.** One `.md` grammar covers all operational content — the body is the description — so agenda items inherit the page writers, the link cascade, and the editor rather than carrying a second serializer. JSON stays for sidecars, configs, and registries.
- **Agenda joins the tree walk.** Its kinds enter as their own top-level branch, giving every Task and Event a record, a navKey, and a search entry. Collection-scoped consumers — connections, embeds, breadcrumbs — stay page-only by kind partition.

**Surfaces** — no selection kind opens a Task or Event, so there is no detail surface, no calendar or date-grouped layout, and no create path. Quick Capture's named blocker is exactly this (→ [[QuickCapturePM]]).

**Built-in Status** — a non-deletable **Status** property on both kinds, tracking the user's engagement rather than the clock; for an Event it stays decoupled from the date math. Its group seed → [[PropertiesPM]].

**EventKit Sync** — the opt-in bidirectional mirror to the system Reminders and Calendar apps. The calendar database is API-only — it consumes constructed objects with typed properties — so sync is a code-level translation layer for whatever Pommora stores on disk, constraining none of the decisions above.
