## Typography

```
Typography
├── The Ramp
├── Where Each Style Goes
├── In Code
└── Pending
```

Pommora's type system. The token file is the source of truth for what ships, and this doc names the styles and where they go; the Figma "Pommora - React" library is the visual reference the ramp was drawn from. Family is **Inter**, loaded as a variable font, so any weight on its axis draws.

**Variant = weight.** Every style exposes the same weights by name — **Standard · Emphasized · Semibold · Bold** — and a variant name is the weight it renders. `text.<style>.<variant>` composes the two: size and line height from the style, weight from the variant.

### The Ramp

**SOURCE:** `Pommora/src/renderer/src/design-system/tokens/typography.css.ts`

| Style       | Token             | Size / Line     | Character                                            |
| ----------- | ----------------- | --------------- | ---------------------------------------------------- |
| Large Title | `text.largeTitle` | `26px` / `32px` | display step                                         |
| Title 1     | `text.title1`     | `22px` / `26px` | display step                                         |
| Title 2     | `text.title2`     | `17px` / `22px` | display step                                         |
| Title 3     | `text.title3`     | `15px` / `20px` | the smallest display step                            |
| Headline    | `text.headline`   | `13px` / `16px` | body-size heading — distinct by weight, not scale    |
| Body        | `text.body`       | `13px` / `16px` | the standard content size; carries the row primitive |
| Callout     | `text.callout`    | `12px` / `15px` | a step under body — headers and ancillary labels     |
| Control     | `text.control`    | `12px` / `15px` | chips and control chrome                             |
| Caption     | `text.caption`    | `11px` / `14px` | the secondary line under a title                     |
| Footnote    | `text.footnote`   | `10px` / `13px` | small detail                                         |
| Subline     | `text.subline`    | `10px` / `12px` | footnote's size on a tighter line box                |

The weight ladder is `font.weight`: Standard `400` · Emphasized `500` · Semibold `600` · Bold `700`; tracking is pinned to `0` on every composed style. Family: `'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`. The sizes are the macOS AppKit text scale drawn in Inter, with a few edits — **Control** and **Subline** are renamed for what they drive here, control chrome and the Subfield.

### Where Each Style Goes

- **Menu / dropdown / sidebar rows** → Body / Standard — one primitive shared by every menu, every dropdown, and the sidebar.
- **Menu headings** → Headline / Emphasized.
- **Row sub-label** → Caption / Standard; **trailing detail** → Footnote / Emphasized.
- **Pane header** → Callout / Emphasized leading, Caption / Emphasized trailing; **pane footing** → Callout / Emphasized.
- **Modal and Nexus-header titles** → Headline; **Settings section headings** → Title 3 / Emphasized.
- **Table column headers** → Callout / Semibold; **table body and input fields** → Body / Standard.
- **Chips** → Control / Semibold; **sidebar section headers** → Control / Semibold.
- **On-control labels and view pills** → Control / Emphasized; **picker, segmented, and tab labels** → Control / Standard.
- **Card titles** → Body / Semibold; **group-band labels** → Body / Emphasized; **card property labels** → Caption / Emphasized.
- **Subfield (footer)** → Subline / Emphasized.

The [[MarkdownPM|Markdown editor]] scales from its own zoom root rather than the ramp — every element sizes in `em` multiples off it, drawing weight from the shared ladder.

### In Code

The type tokens are authored in vanilla-extract in two layers — **font primitives** (family, the weight ladder, and a size and line height per style) and **composed text classes** that apply a whole style to a component. What plain CSS needs is bridged to `var(--…)` names. The same file holds the **capped label** — ellipsis at rest, scroll-on-hover with a mask fade at the leading edge — used app-wide for constrained text; the width cap is the consumer's.

### Pending

- **Letter-spacing scale** — the composed styles pin tracking to zero; no tracking scale exists.
- **Monospace / code font** — the editor draws code from a hand-written stack with no `mono` token behind it.
- **Markdown element mapping** — no ramp style is assigned to any Markdown element.
- **Tabular / monospaced digits** — the editor's ordered-list markers use them; tables and numeric columns don't.
- **Truncation conventions** — which surfaces cap at all, and whether a multi-line clamp exists (none does).
- **Dynamic Type / responsive sizing** — the ramp is fixed and doesn't answer OS text-size settings.
