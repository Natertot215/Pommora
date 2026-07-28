### Agenda

The operational layer's calendar-anchored side. Agenda is the parent schema holding two peer entity types, each mirroring an EventKit kind:

- **Tasks** (`.task.json`) — reminder-shaped: `due_at` with its floating and all-day modifiers, a "not before" `start_at`, `completed` + `completed_at`, and `priority`; all optional.
- **Events** (`.event.json`) — calendar-event-shaped: `start_at` + `end_at` (both required to write, lenient on read), `all_day`, `location`, and fixed-time alarms.

> **The on-disk layer only.** The file format and the CRUD behind it are written and tested; no production caller reaches the write path. What ships is a read-only list feeding display-only rows — everything under *Pending* is unbuilt.

Both carry the same property type catalog and the same bracketed Context keys as Pages, with the same property mechanics. The only differences are the on-disk shape and the EventKit target.

Each kind lives in its own singleton folder discovered by a config sidecar; the layout and the discrimination rules are `Architecture.md`'s. EventKit's reminder and event APIs are separate, so the two kinds stay separate singletons rather than sharing one wrapper folder.

### Features

#### II. Shared Fields

Both kinds carry `id`, an optional `icon`, a plain-text `description`, the bracketed Context keys at the JSON root, a `properties` object, `created_at` / `modified_at`, a `recurrence` object that round-trips but is never edited, relative alarm offsets, and `calendar_id` + `eventkit_uuid` for sync state. Foreign keys are preserved by value on every write.

#### II. Schema

Each kind's config sidecar carries `property_definitions` — its own full definitions, deliberately separate from the nexus-wide registry that Collections assign out of. Every definition on an agenda config is user-defined. The catalog → `Properties.md`.

### Architecture

#### II. CRUD

Tasks and Events run through one generic agenda CRUD: create mints a ULID, rename preserves the kind suffix, update merges over the JSON retaining foreign keys, and set-property and set-context each have their own path. The filename is the title, and an Event needs both a start and an end to be written at all.

### Pending

**Agenda Surfacing:** The sidebar's **Agenda mode** renders a read-only list of Tasks then Events over its own channel, which keeps agenda files off the tree walk — but not off every read: opening a navigation surface warms the same snapshot so search can list agenda entries, and the snapshot is re-warmed rather than held across a tree push.

What's pending is interactivity. No selection kind routes an agenda entity, so a sidebar row opens nothing and a search hit renders inert; there's no detail surface and no calendar or date-grouped layout. There's no write channel either — the mutate ops and IPC that would reach the existing CRUD are unbuilt.

**Built-in Status:** A non-deletable **Status** property seeded onto both kinds' schemas, tracking the user's engagement rather than the clock — for an Event it stays decoupled from the date math. Neither half exists: nothing seeds the property when an agenda config is created, and nothing guards it from deletion. Its group seed → `Properties.md`.

**EventKit Sync:** The live, opt-in bidirectional mirror between Agenda entities and the system Reminders and Calendar apps — each kind maps to one EventKit entity by extension, `calendar_id` + `eventkit_uuid` hold the sync state, and the Status groups map onto reminder completion. The on-disk fields are ready; the bridge isn't built.
