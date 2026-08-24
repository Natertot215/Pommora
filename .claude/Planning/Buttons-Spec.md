## Buttons — Spec

Figma: https://www.figma.com/design/fYZ5oiK7stC3diRhaBHl1r/Pommora---React?node-id=0-1 → `design-system/components/buttons`. The geometry already in `Tokens/size.css.ts` (`size.control`) is the Figma geometry; the recipe adds type and content, not dimensions.

### The Recipe

**Home:** `DesignSystem/Components/Controls/Button/` — `Button.tsx`, `button.css.ts`. `Segmented-Controls/` folds in.

```
<Button type="filled" size="button-medium" icon="sliders" label="Filters" outline onClick … />
<Segmented type="base" size="button-large" glass segments={[…]} />
```

| Axis      | Values                                                         | Source                                              |
| --------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `type`    | `base` · `tinted` · `solid` · `filled` · `destructive`         | fill + text tokens below                            |
| `size`    | `button-small` · `button-medium` · `button-large`              | `size.control` — height, segment height, padX, radius, segment radius, divider height, icon step |
| content   | `icon` · `icon` + `label` · `label`                            | icon-only takes the size ladder; labeled buttons take the standard size |
| `outline` | boolean                                                        | an inset ring in the type's own color, `--tint-quaternary` for the accent types, `label.quaternary` for base/filled |
| `glass`   | boolean on `Segmented`, default off                                           | `GlassControls` wrapper — the toolbar only                                  |
| state     | hover · disabled                                               | `state.hover` fill (`--tint-secondary` of the accent for tinted/solid), `label.tertiary` when disabled; no selected state — a button is a single click |

**Types**

| Type        | Fill                          | Text                          |
| ----------- | ----------------------------- | ----------------------------- |
| Base        | none                          | inherits (`label.primary`)    |
| Tinted      | accent @ `--tint-tertiary`    | accent                        |
| Solid       | accent @ `--tint-primary`     | `--label-primary`             |
| Filled      | `--fill-tertiary`             | `--label-primary`             |
| Destructive | `--error` @ `--tint-tertiary` | `--error` @ `--tint-primary`  |

Type is one CSS-var pair set by a `styleVariants` — `--button-fill` and `--button-ink` — so the button, its outline, and its hover all read the pair; adding a type is one row.

**Segmented** is `N × Button` of any type with `Elements/Segment` between them, radius switching to `segmentRadius` inside a run — the existing `Segmented.tsx` mechanics, kept. Every type can be segmented.

### What Exists

- **The size system already exists and has one client.** `Tokens/size.css.ts` holds `size.control['button-small|medium|large']` and `Segmented.tsx` is the only component reading it. `Sidebar.css` and `tabBar.css` match `--button-large-height` by name.
- **`Segmented` is the de facto button.** Icon-only and icon+label modes, a collapsible label slot, `glass` as a prop, the house `segment` divider, and the one-segment case shipping through `MenuDropdown`. It lacks label-only rendering and every type.
- **The five looks in the wild:** (A) the liquid-glass segmented pill — toolbar only; (B) ~25 hand-rolled ghost buttons — `border:none; background:none`, secondary/tertiary tone, `--state-hover` fill, with reveal-on-hover and `--state-ghost` rest as call-site axes; the one named member is `menu.css.ts accessoryButton`; (C) two quaternary-filled bordered boxes — `ActionBand.segment` and `settingsPane.iconButton`; (D) the PhotoCropModal pair — neutral `fill.secondary` and the app's only accent-filled button; (E) hover-recolor-only, no box.
- **Destructive does not exist.** `--error` is consumed by error text only.
- **Labels is the structural model.** `labels.css.ts` composes `shape × labelColor × fill × outline`; Button is the same axis idea over `size.control`.

### Consolidation

| Today                                                     | Becomes                                               |
| --------------------------------------------------------- | ----------------------------------------------------- |
| `Segmented-Controls/` (SegmentedSymbol · SegmentedButton) | `Controls/Button/` — `Segmented` is the run form      |
| Toolbar Back/Forward · Trio · dropdown triggers           | `Segmented type="base" glass`                         |
| PhotoCropModal Cancel · Choose                            | `Button type="filled"` · `Button type="solid"`        |
| `ActionBand.segment`                                       | stays — a purposely divergent tab-style control (Nathan's call) |
| `settingsPane.iconButton`                                  | `Button type="filled" icon`                           |
| `menu.css accessoryButton` and its seven derivatives       | `Button type="base" icon size="button-small"` + the `ghostRest` / `revealOnHover` modifiers |
| `.ppane-action` · `.subfield-add` · `.tab-plus` · `.add-banner-btn` · `.group-band-add` · `.mdpm-tbl-add` · `.settings-cat` · `.open-btn` · `.navwindow-style-toggle` · CalendarPicker `navBtn` / `titleBtn` | `Button type="base"` at the matching content mode |
| Hover-recolor-only (`removeButton`, `browse`, `chevronButton`, crumbs) | stay — they are text affordances, not buttons |

Two modifiers ride beside the recipe, since they are states rather than types: `revealOnHover` (opacity 0 until the host is hovered) and `ghostRest` (`--state-ghost` at rest).

### Strays (app `Components/`)

Move: `PaneSlider` → `DesignSystem/Components/` (already slated), `Surface.tsx` → `Materials/` (or a `GlassSurface` prop), `PhotoCropModal` → `DesignSystem/Detail/`. Stay: `EyeToggle`, `DashIcon`, `InlineEditHeader`, `OptionRow`, `GhostOptionChip`, `PickerControl` — property-editor pieces on the pane's own stylesheet, bundle 6a's feature folder.
