## Pages

```
Pages
├── On-Disk Shape
├── Title + Membership
├── Opening Behavior
├── Outline
├── Pending
└── Prospects
```

A Page is one Markdown file inside a Collection — the operational entity that holds free prose. It is a single Markdown file with YAML frontmatter for identity — keyed via `PageID:` — and property values above a Markdown body, edited in MarkdownPM.[^1] Membership is by location: a file inside a Collection, or inside one of its Sets at any depth, is a Page of that Collection and conforms to that Collection's property schema, with no container field of its own. The body is portable Markdown and accessed via MarkdownPM, which can hold internal and external embeddings, as well as Connections to other Pages.[^2] Per-page interface state — heading folds, the header icon's visibility, per-table heading-column choices, the footnotes override, embedded tile heights and scaling factors — are persisted per-machine in `nexus.db`, and keyed by `PageID:`.[^7]

### On-Disk Shape

The frontmatter is modeled by `pageFrontmatter` in `src/shared/schemas.ts` as a loose object: three keys Pommora governs, and everything else preserved as written. `PageID` names the kind and holds a bare ULID; `icon` and `cover` (the page's banner image, which a crop keyed to the image may frame) are optional. Around them sit `<Context>` keys naming Spaces, and one key per property value the page holds, named exactly as the property and conforming to the owning Collection's schema.[^3] Foreign frontmatter keys and YAML comments survive every write, because the page engine (`src/main/IO/pageFile.ts`) edits the original YAML document in place rather than rebuilding it, and each write lands through the atomic temp-file-plus-rename path.[^2]

A page stores no dates of its own. Its **Creation Time** is the instant encoded in its `PageID` ULID, and its **Last Modified** is the file's modification time as the filesystem reports it — so a property value change or a text change moves it, and a rename or a move, which leaves the file's bytes untouched, does not. A write that rewrites the file for a schema reason — a property deleted, a Context unlinked, a key renamed — moves it as well, since the file itself changed.

### Title + Membership

The filename minus `.md` is the title; there is no `title` field, and a rename is a file rename. The page's header shows its `icon` beside the title when the page is opted into showing it, a choice kept per machine while the glyph itself stays in frontmatter. Within a folder, names must be unique: creating a page under a taken name disambiguates with a numeric suffix, while renaming onto a taken name is refused. Titles aren't unique Nexus-wide, so two Pages in different folders can share one, and a connection to a shared title resolves as ambiguous.[^4]

Every creation surface — the sidebar, a table row, a card, the grid — runs one act (`createDisambiguated` in `src/main/mutate.ts`): the page exists on disk as **Untitled** the moment the gesture fires, and its title opens as an uncommitted rename with an empty field. Confirming names the page, disambiguating like a create; leaving the field any other way keeps Untitled.

### Opening Behavior

Clicking a Page opens it in the active tab, replacing that tab's selection, and the editor auto-saves on a debounce. A Collection can instead route its Pages to the floating Page Window through its **Open In** setting;[^5] ⌘-click always opens a full page in a new tab. Additionally, hovering over a page's link within its body reveals a non-editable dropdown panel that serves as an in-body preview. [^6]

### Outline

A page's own table of contents, in the toolbar (`src/renderer/Toolbar/OutlineMenu.tsx`, built from the editor's heading fold model). It appears only when the detail pane contains a Page and occupies the Views button's slot, since a selection is either a container or a Page. Rows carry each heading's text with its markers stripped, nested by level and opened fully; levels may skip freely, so a heading attaches to the nearest shallower one above it, and a heading with nothing beneath it still appears. A row's chevron collapses a group in the menu only, without touching the page, and neither gesture dismisses the menu. Clicking a row scrolls the page to that heading, first opening any collapsed section that hides it, without moving the caret or editing the document.

---

#### Pending

- **Columns** — a multi-column section directive rendering a section in evenly divided horizontal columns; visual layout only. Callouts already render.

#### Prospects

- **Sub-Pages** — a nested Page hierarchy beyond the flat Page-in-container model.
- **Independent UI titles** — a display title distinct from the filename, so a rename needn't move the file.

[^1]: [[MarkdownPM]]
[^2]: [[ArchitecturePM]] §The Atomic-Write Contract · §Adoption
[^3]: [[PropertiesPM]] · [[ContextsPM]]
[^4]: [[ConnectionsPM]]
[^5]: [[CollectionsPM]] §Open In
[^6]: [[InterfacePM]] §Floating Windows · §The Hover Card
[^7]: [[ArchitecturePM]] §Persistence
