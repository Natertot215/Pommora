## Cohesion Pass — Codemap Changelog

Everything that moved in Session One of the pass specified in [[Cohesion-Audit]], grouped by step.
Deltas are code-only: comment lines, blank lines, and test files are excluded, and each folder row
carries the count of changed files beneath it with their summed delta.

Seven commits, `d9765a55` through `a3cd989e`. Gates green at each: typecheck clean, Biome at zero
diagnostics across 851 files, 2,974 Vitest tests passing.

### Per Step

| Step                | Added | Removed | Net  |
| ------------------- | ----- | ------- | ---- |
| 1 · Icons           | +246  | −205    | +41  |
| 2 · CSS             | +177  | −221    | −44  |
| 3 · Native menus    | +242  | −236    | +6   |
| 4 · MarkdownPM      | +58   | −23     | +35  |
| 5 · Documentation   | —     | —       | —    |
| 6 · Loose ends      | +13   | −10     | +3   |
| Phase 2 · folds     | +85   | −87     | −2   |

**Net difference:** +756 / −717 → **+39 code lines** across 118 files. Steps 2 and 3 are where the
consolidation paid; Steps 1 and 4 spent lines buying the ladder and the drag's hoisted parse.

Alongside it: **+138 / −3** across four test files (three new shared-model suites and one fragment
case), and **+91 / −64** across twenty documents.

### The Tree

```
// Project Pommora                            | • 118 changed files · +756 −717
├── // .claude
│   ├── // Features                           | • 20 files · +91 −64
│   │   ├── [ArchitecturePM.md]               | • Two sections rewritten behind a SOURCE line
│   │   ├── [PommoraDND.md]                   | • The gesture layer, in behavioral voice
│   │   ├── [PagePreviewPM.md]                | • The window's own dimensions, in behavioral voice
│   │   ├── [InteractionPM.md]                | • The out token's consumers stated accurately
│   │   ├── [SymbolsPM.md]                    | • The eleven-step ladder and its roles
│   │   └── [DesignSystemPM.md]               | • The ladder row and the control bundles
│   └── // Planning
│       ├── [Cohesion-Audit.md]               | • Reconciled — every finding given a standing
│       └── [Cohesion-Tasks.md]               | • The checklist, closed out
└── // Pommora // src                         | • 98 files · +756 −717
    ├── // main                               | • 17 files · −133
    │   ├── rowMenu.ts                        | • THE template — fragment and whole-menu builders  +28 −4
    │   ├── pageMenu.ts                       | • Retired; its Move To ▸ case moved into rowMenu    −32
    │   ├── editorMenu.ts                     | • Format rows read the shared chords              +32 −59
    │   ├── tableMenu.ts                      | • Collapsed to popping its model                   +4 −43
    │   ├── viewEmbedMenu.ts                  | • Collapsed to popping its models                  +9 −25
    │   ├── viewButtonMenu.ts                 | • Collapsed to popping its model                   +3 −11
    │   ├── gripMenu.ts                       | • Reads the shared heading and marker labels       +9 −17
    │   └── styleMenu.ts                      | • The view-style submenu retires with its caller       −14
    ├── // shared                             | • 4 files · +132
    │   ├── editorMenu.ts                     | • The six formatting chords, in both spellings        +17
    │   ├── viewMenus.ts                      | • The embed and view-button menu models               +60
    │   ├── tableMenu.ts                      | • The table grip's menu model                      +41 −1
    │   └── gripMenu.ts                       | • The heading ladder and list-marker names            +14
    └── // renderer // src                    | • 77 files · +757 −517
        ├── // design-system
        │   ├── // tokens
        │   │   ├── size.css.ts               | • The ladder mirrors the type ramp; ICON_PX        +18 −9
        │   │   └── theme-vars.css.ts         | • The full ramp, control heights, named constants  +26 −5
        │   ├── card-tokens.css               | • Gains the card chassis both families draw           +73
        │   ├── resize-strip.css              | • NEW — the edge-drag strip                           +20
        │   ├── reveal-bar.css                | • NEW — the sliding bar and its riding chevron        +47
        │   └── // components
        │       ├── CalendarPicker.tsx        | • One mark per chosen row                          +9 −13
        │       ├── previewPane.css           | • Keeps only what is the preview's own              +2 −30
        │       └── pickerMenu.css.ts         | • A picker row reads the row-size knob              +3 −2
        ├── // MarkdownPM // editor
        │   ├── blockDrag.ts                  | • Reads the document once per gesture              +27 −9
        │   ├── links.ts                      | • Answers every gesture a connection does          +14 −5
        │   ├── docCache.ts                   | • The ↔ positions, cached per version                  +9
        │   ├── formatKeymap.ts               | • Binds the shared chords                          +9 −11
        │   └── decorations.ts                | • Reads the cached positions                        +3 −6
        ├── // Detail
        │   ├── // Views // Cards
        │   │   └── CardsView.css             | • Keeps only what is Cards' own                       −52
        │   ├── // Banner
        │   │   └── Banner.css                | • The container title, named once                 +13 −10
        │   └── // Subfield
        │       └── subfield.css              | • Keeps only what is the subfield's own             +1 −29
        ├── // NavWindow
        │   └── navGallery.css                | • Keeps only what is the gallery's own                −52
        ├── // Sidebar
        │   └── Sidebar.css                   | • One base for the two icon buttons                +13 −32
        ├── // Blocks
        │   └── BlockHandleMenu.tsx           | • Style and Scale read from their left edge         +8 −1
        └── main.tsx                          | • Loads the three shared sheets                        +2
```

Forty more renderer files changed by a line or two apiece — the icon call sites naming a step
instead of a number. They are the bulk of the file count and almost none of the delta.
