## Typography

Pommora's type system. The token file is the source of truth for what ships — every size, line height, and weight lives there, and this doc names the styles and where they go. The Figma "Pommora - React" library is the visual reference the ramp was drawn from, not the arbiter of what renders. Family is **Inter**, loaded as a variable font, so any weight on its axis draws.

> **Variant = weight.** Every style exposes the same weights by name — **Standard · Emphasized · Semibold · Bold** — and a variant name *is* the weight it renders. `text.<style>.<variant>` composes the two: size and line height from the style, weight from the variant. There's no role-based remapping.

### The Ramp

| Style                           | Character                                         |
| ------------------------------- | ------------------------------------------------- |
| Large Title · Title 1 · Title 2 | display steps — defined, no consumer              |
| Title 3                         | the smallest display step                         |
| Headline                        | body-size heading — distinct by weight, not scale |
| Body                            | the standard content size                         |
| Callout                         | a step under body — headers and ancillary labels  |
| Control                         | chips and control chrome                          |
| Caption                         | the secondary line under a title                  |
| Footnote                        | small detail                                      |
| Subline                         | footnote's size on a tighter line box             |

The sizes are the macOS AppKit text scale drawn in Inter, with a few edits. **Headline** is pinned to Body's size, so a headline is told apart by weight rather than scale. **Control** and **Subline** are renamed for what they actually drive here — control chrome and the Subfield. And **Body** is the macOS standard content size, which is why it carries the row primitive rather than a smaller step.

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

The **Markdown editor doesn't consume the ramp.** Its body scales from its own zoom root and every element sizes in `em` multiples off it, drawing weight from the shared ladder — so a page's headings, quotes, and code follow the editor's zoom rather than a fixed step.

### In Code

The type tokens are authored in vanilla-extract in two layers: **font primitives** — family, the weight ladder, and a size and line height per style — as the single source, and **composed text classes** that apply a whole style to a component. What plain CSS needs is bridged to `var(--…)` names so a stylesheet draws the same values.

The same file holds the **capped label** — ellipsis at rest, scroll-on-hover with a mask fade at the leading edge — the one source for that behavior app-wide. The width cap is the consumer's.

### Not Yet Established

- **Letter-spacing scale** — the composed styles pin tracking to zero; no tracking scale exists.
- **Monospace / code font** — the editor draws code from a hand-written stack with no `mono` token behind it.
- **Markdown element mapping** — no ramp style is assigned to any Markdown element.
- **Tabular / monospaced digits** — the editor's ordered-list markers use them; tables and numeric columns don't.
- **Truncation conventions** — which surfaces cap at all, and whether a multi-line clamp exists (none does).
- **Dynamic Type / responsive sizing** — the ramp is fixed and doesn't answer OS text-size settings.
