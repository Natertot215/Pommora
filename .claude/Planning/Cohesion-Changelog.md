## Cohesion Pass — Codemap Changelog

Everything that moved in the cohesion pass, grouped by step. What is left of the catalog is in
[[Cohesion-Audit]]; the editor arc is scoped separately in [[MarkdownPM-Plan]]. Deltas are code-only:
comment lines, blank lines, and test files are excluded, and each folder row carries the count of
changed files beneath it with their summed delta.

### Session One — The Dusting

Seven commits, `d9765a55` through `a3cd989e`. Gates green at each: typecheck clean, Biome at zero
diagnostics across 851 files, 2,974 Vitest tests passing.

#### Per Step

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

#### The Tree

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

### Session Two — Main-Process Cost

Five commits, `c8c8cf3d` through `30c4fdc7`. Gates green at each: typecheck clean, Biome at zero
diagnostics across 851 files, 2,983 Vitest tests passing.

#### Per Item

| Item                        | Added | Removed | Net  |
| --------------------------- | ----- | ------- | ---- |
| 1 · The registry write      | +31   | −16     | +15  |
| 2 · The settings leaves     | +37   | −40     | −3   |
| 3+5 · The corpus and matcher| +19   | −17     | +2   |
| 4 · The settle window       | +17   | −4      | +13  |
| The property channels       | +101  | −156    | −55  |

**Net difference:** +205 / −233 → **−28 code lines** across 13 files, all but two of them in
`main/`. Alongside it: **+132 / −6** across seven test files. The property channels are where the
lines came off; the four cost items spent a few buying the transforms that replaced the reads.

#### The Tree

```
// Pommora // src
├── // shared                              | • 2 files · +17 −0
│   ├── treePatch.ts                       | • The registry re-point, one transform            +16
│   └── types.ts                           | • `excluded` joins the leaves it was decoded with  +1
└── // main                                | • 11 files · +188 −233
    ├── index.ts                           | • Three combinators; one lookup for both zooms +115 −169
    ├── settings.ts                        | • The leaves, served from the tree               +19 −12
    ├── watchPatch.ts                      | • What a batch touched, asked once                +15 −2
    ├── exclusion.ts                       | • The matcher is held against its list            +11 −5
    ├── io // walk.ts                      | • The corpus prunes what it will not read         +8 −12
    ├── mutatePatch.ts                     | • A def edit opens no sidecar                      +7 −9
    ├── watcher.ts                         | • node_modules ignored; the sweep is conditional   +7 −9
    ├── indexSeed.ts                       | • Reads the tree's own list                        +3 −9
    ├── readNexus.ts                       | • `excluded` lands; the labels reader moves        +1 −4
    ├── contextMenu.ts                     | • Reads the labels from their new home             +1 −1
    └── contextsRegistry.ts                | • The same                                         +1 −1
```

### Session Three — MarkdownPM

Eight phases against [[MarkdownPM-Plan]], ordered so that consolidation carries the repairs rather
than following them: four of the six live defects are symptoms of the duplication they sit in and
close when it collapses. Phase 7 is the fold model's key widening, which is the prerequisite
footnotes blocks on.

The phases, in order: the two loners · one document scan · one box · one pointer path · one drag ·
tables · the stylesheet remainder · fold keys.

Each phase ended on all three gates with its own doc corrections applied, and landed as one commit.
KNOB 115 → 117 (two added, none stripped); the nine decision markers survive.

| Phase | Commit | Est. | Actual |
| ----- | ------ | ---- | ------ |
| 0 · The two loners | `9fd6da98` | ~0 | +23 |
| 1 · One document scan | `ab6ac262` | −40 | **−32** |
| 2 · One box | `9c1ecf3d` | −140 | **−15** |
| 3 · One pointer path | `6d047973` | −90 | +32 |
| 4 · One drag | `aea208e7` | −100 | +3 |
| 5 · Tables | `22c912e0` | −70 | +13 |
| 6 · Stylesheet remainder | `f796fc65` | −60 | **−4** |
| 7 · Fold keys | `6af1ab4d` | +40 | +42 |
| — · The simplification pass | `a8988710` | — | 0 |

**Net +62 against an estimate of −400.** The estimate counted the bodies a consolidation removes
and not the signatures it threads; it assumed the four box constructs could share their paint, which
they cannot; and it treated a shared factory as free when it is 135 lines two files stop spelling
twice. The reduction that is real is in derivation rather than in text — seven document splits
became one, a whole second block-context disappeared, five `clamp`s became one, and two second
doors onto the shared scan closed.

Two plan items were refused on inspection and recorded as such: the two drags' edge readers read
different edges under different conditions, and the autocomplete row cannot take the menu
primitive's metrics without changing how the panel looks.

```
// MarkdownPM                              | • Eight phases, six live defects, one arc
├── // editor
│   ├── [pointerPath.ts]                   | • NEW — one gesture grammar under both link syntaxes
│   ├── [folding.ts]                       | • A fold is a region of some kind                  +106 −64
│   ├── [connections.ts] · [links.ts]      | • Two specs over one factory                       +75 −169
│   ├── [blockModel.ts]                    | • Reads the shared scan; its second copy is gone   +18 −61
│   ├── [docCache.ts]                      | • One scan, two token slots                        +12 −11
│   ├── [blockDrag.ts] · [listDrag.ts]     | • One boundary picker, viewport-scoped             +31 −44
│   ├── [gripMenu.ts]                      | • Re-reads and matches after its menu              +9 −3
│   ├── [mathRanges.ts]                    | • REMOVED — a second door onto the scan            −4
│   └── [Styles.css]                       | • One box shape; the sheet says each thing once    +102 −124
├── // decorations
│   └── [intent.ts]                        | • THE whole-document derivation                    +34 −11
├── // detect
│   └── [index.ts]                         | • One split, one fence pass, one lone-line walk    +41 −69
├── // Tables
│   ├── [regions.ts] · [sync.ts]           | • No memo; a ragged row keeps its typing           +38 −27
│   ├── [codec.ts] · [guard.ts]            | • GFM-correct escaping; the guard stands down      +9 −12
│   └── [cellStatic.tsx] · [TableView.tsx] | • A resting cell follows and previews              +54 −48
└── // main
    └── [remint.ts]                        | • headingIcon and viewOrder travel                 +5 −1
```
