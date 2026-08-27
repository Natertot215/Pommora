## The Menu Recipe

A menu is a column of rows, and a frame is a list of them. `Menus/menu-base.css.ts` names every row kind once — its type rung, its tone, its geometry — in the order the rows stack on screen; a frame picks kinds and declares no type, tone, or padding of its own. Anything a frame is about to set on a row is a missing kind, and it lands in the recipe rather than the frame.

#### The Rows

Top to bottom, as a menu reads:

| Kind | Reads | Rung · Tone | Geometry |
| --- | --- | --- | --- |
| **TopRow** | `‹ Label` … `current` / trailing | `actionRow` — footnote.emphasized · leading secondary, trailing tertiary | flush affordance · `--top-row-block` · flush separator under |
| **Heading** | `LABEL` | footnote.emphasized · tertiary | flex · gap 4 · min-height 24 · `0 8px` |
| **Item** | `(icon) Title [caption]` … `[trailing]` | body.standard · primary; caption caption.standard · secondary | gap 8 · `6px var(--row-inset)` · radius 8 · hover / selected / focus ring |
| **ActionRow** | `Label` … `[trailing]` — the "All Properties" row | footnote.emphasized · secondary | Item geometry, no hover |
| **Separator** | `———` | hairline | 11px band |
| **Caption** | centered line | body.standard · secondary | `28px 8px` |
| **Footing** | `[leading]` … `[trailing]` | `actionRow` | flush separator over · `--bottom-row-block` · sinks to the pane's bottom edge |

**Item's size axis.** Standard (min-height 24, body ramp) and Compact (min-height 20, control ramp) are the two sizes, set once on a surface through `--menu-row-size` / `--menu-row-line`; a PickerMenu is Compact, a menu is Standard.

#### The Trailing Slot

Every control an Item carries sits in its trailing slot, in the recipe's tone rather than its own:

| Trailing | Reads | Source today |
| --- | --- | --- |
| chevron | `›` | `Icon chevron-right` |
| value + toggle | `Compact ‹›` | `groupByValue` (control.standard · label-control) + `chevrons-up-down` |
| switch | `DualSwitch` | `Components/Controls/DualSwitch` |
| button | eye · palette · + · ⋯ | `accessoryButton` (`--accessory-box` 20 · tertiary) |
| slider | `Slider` | `Components/Controls/Slider` |
| field | an inline input | `Components/Fields` (`field`, `EditableInput`); the row keeps the field's own ring and floor |

#### The Roster

`Menus/menu-roster.tsx` renders a menu from data — the shape `Settings/SettingsWindow.tsx`'s `Row` union and `RowControl` switch already have, lifted into the design system:

```
MenuRow     = { kind: 'heading'; label }
            | { kind: 'separator' }
            | { kind: 'caption'; text }
            | { kind: 'action'; label; trailing? }
            | { kind: 'item'; icon?; label; caption?; trailing?: Trailing; selected?; disabled?; onSelect? }
Trailing    = chevron | { value; onToggle } | { switch: checked, onChange } | { button: icon, onClick } | { slider: … } | { field: … }
MenuSection = { title?; rows: MenuRow[] }
<MenuRoster sections top? footing? />
```

`SettingsRow`, `ValueRow`, and `FootingPick` are the same row at three tones; the roster's row renderer replaces all three.

### Checklist

#### Phase A · The Stylesheet

- [ ] A1. `menu-base.css.ts` reorganized into one section per kind, in stacking order: Shell → TopRow → Heading → Item (+ `side`, `titleWrap`, `titleText`, `subLabel`, `renameField`, `itemSelected`, `itemEmphasized`, `rowDisabled`) → ActionRow → Separator → Caption → Footing → Trailing (`accessoryButton`, `value`, `detail`) → Column (`menu`).
- [ ] A2. `actionRow` heads the TopRow section; Footing composes it instead of restating the tone through the footing knobs.
- [ ] A3. `bottomRow` / `bottomBar` / `MenuBottomRow` → `footing` / `footingBar` / `MenuFooting`, bordered at the top.
- [ ] A4. `MenuTopRow` and `MenuFrameTopRow` fold into one `MenuTopRow` — the frame form is the bare one plus `topRowPad` and its flush separator.
- [ ] A5. `menu-row.tsx` reorders to the same stacking order; `MenuHeading` goes (the heading is a class, not a component).
- [ ] A6. Item's Compact axis is a named variant: `--menu-row-size` / `--menu-row-line` with the 20px floor declared beside the 24 — PickerMenu sets it, nothing else restates a ramp.

#### Phase B · Heading And ActionRow

- [ ] B1. `heading` re-rung to footnote.emphasized · tertiary.
- [ ] B2. `actionRow` is the "All Properties" row kind at secondary, worn by `PropertyFrame`'s `allHeadingRow` — which then deletes along with the `menu-surface.css.ts` titleText global it escaped.
- [ ] B3. Migrated onto `heading` and deleted: `frames.css.ts` `optionsRow` · `optionsLabel` · `allPropertiesLabel`; `groupFrame.css.ts` `previewHeading`; `settingsWindow.css` `.settings-section-title`.

#### Phase C · The Trailing Slot

- [ ] C1. `value` lands in the Trailing section (control.standard · label-control); `groupByValue` deletes.
- [ ] C2. `button` is `accessoryButton`; `rowPlus`, `optionsAdd`, `topRowAction`, `eyeInert`, `addRow` delete.
- [ ] C3. `field` — the row's field slot, taking `Components/Fields` as-is; `filterFrame.css.ts`'s `connector` and `numberEditor.css.ts`'s `valueControl` read it.
- [ ] C4. `slider` — the trailing slider; `LayoutFrame`'s `scaleRow` wears Item rather than its own class.

#### Phase D · The Roster

- [ ] D1. `menu-roster.tsx` with `MenuRow`, `Trailing`, `MenuSection`, `MenuRoster`.
- [ ] D2. `SettingsWindow`'s `Row` union and `RowControl` move into it; `SettingsRow`, `ValueRow`, `FootingPick` delete.

#### Phase E · The Frames

One commit each, each deleting its stylesheet exports as it lands:

- [ ] E1. `SettingsWindow` — the `FRAMES` table unchanged, rendered by the roster.
- [ ] E2. `LayoutToggles` + `CardsOptions` — seven longhand blocks become one `{ icon, label, key, invert? }[]`.
- [ ] E3. `SettingsFrame` + `LayoutFrame`'s `FRAME_ROWS` — Item rows with chevron trailing.
- [ ] E4. `SortFrame`, `HiddenFrame` — rosters; their components go.
- [ ] E5. URL / Checkbox / File / DateTime editors — `configRow`, `configLabel`, `dateTimeEditor.css.ts` delete.
- [ ] E6. `GroupFrame` — `chipRow`, `eyeSlot`, `subRow`, `subLabel` delete.
- [ ] E7. `FilterFrame` — keeps its rule-row logic on Item's shell and `side`; `lockedCaption` → Caption, `addRow` → button, `leadGlyph` → `side`.
- [ ] E8. `frames.css.ts` holds its sixteen geometry exports and nothing else.

#### Phase F · Figma

- [ ] F1. `Menu Item`: Standard 24 / Compact 20; `Trailing` swap slot once Switch, Button, and Field components exist.
- [ ] F2. `Menu TopRow`, `Menu Heading`, `Menu ActionRow`, `Menu Separator`, `Menu Caption`, `Menu Footing`.

### Open

- The Settings section titles are uppercase and tracked; on the one heading they lose it.
- `detail` (footnote.emphasized, the trailing crumb) beside `value` — two trailing texts, or one.
