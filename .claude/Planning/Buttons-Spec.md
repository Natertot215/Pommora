## Buttons — Spec

Queued after the design-system reorganization. Figma: https://www.figma.com/design/fYZ5oiK7stC3diRhaBHl1r/Pommora---React?node-id=0-1 → `design-system/components/buttons`.

**Home:** `DesignSystem/Components/Controls/`. A button is a recipe over `Label`: a control size (`size.control` — small · medium · large) × content (icon-only · icon + label · label) × type, with outline optional and taking the same base + fill the labels do.

**Types**

| Type        | Fill                          | Text                        |
| ----------- | ----------------------------- | --------------------------- |
| Base        | none                          | inherits                    |
| Tinted      | accent @ `--tint-tertiary`    | accent                      |
| Solid       | accent @ `--tint-primary`     | `--label-primary`           |
| Filled      | `--fill-tertiary`             | `--label-primary`           |
| Destructive | `--error` @ `--tint-tertiary` | `--error` @ `--tint-primary` |

Outline is optional on every type and follows the `labels.css` outline rule. Glass stays toolbar-only (`glass` prop, default off).

**Sizes:** icon-only buttons take the three `size.control` bundles; label and icon+label buttons take one standard size and read like chips. The Figma rows are fill only — none → Filled → Tinted → Solid — divided by size.



**States:** hover only. A button is a single click, so there is no selected or pressed fill; the toggle-shaped surfaces (settings category tabs, ActionBand's active segment) keep their own selected state outside the recipe.

**Segmented** is not a separate control: N buttons of any type with the `Elements/Segment` pill between them, in the same three sizes (Figma: Segmented · Button, Segmented · Symbol · Small / Medium / Large). `Segmented-Controls` folds into this. They've already been perfected with an icon-only design, as seen in the ToolbarTrio.

**Consumers to rework:** the Toolbar (the only place buttons exist today) and `ActionRow`, which already reads as a filled button in every content mode.

### What Exists

- **The size system already exists and has one client.** `Tokens/size.css.ts` holds `size.control['button-small|medium|large']` — height, segment height, padX, radius, segment radius, divider height, icon step — and `Segmented.tsx` is the only component reading it. `Sidebar.css` and `tabBar.css` match `--button-large-height` by name.
- **`Segmented` is the de facto button.** Icon-only and icon+label modes, a collapsible label slot, `glass` as a prop (`glass={false}` is the plain tier, live in ToolbarTrio), the house `segment` divider built in, and the one-segment case already shipping through `MenuDropdown`. What it lacks: label-only rendering, any persistent pressed/selected fill (refused by design), and every type below.
- **The five looks in the wild:** (A) the liquid-glass segmented pill — toolbar only; (B) ~25 hand-rolled bare ghost buttons — `border:none; background:none`, secondary/tertiary tone, `--state-hover` fill, with reveal-on-hover, `--state-selected` active, and `--state-ghost` rest as call-site axes; the one named member is `menu.css.ts accessoryButton`; (C) two quaternary-filled bordered boxes — `ActionBand.segment` and `settingsPane.iconButton`; (D) the PhotoCropModal pair — neutral `fill.secondary` and the app's only accent-filled button; (E) hover-recolor-only, no box.
- **Destructive does not exist.** `--error` is consumed by error text only; a menu comment mentions "the destructive footer (Delete)" with no style behind it.
- **Labels is the structural model, not the geometry.** `labels.css.ts` composes `shape × labelColor × fill × outline`; a Button is the same axis idea over `size.control` geometry.

### Consumers

Toolbar (Back/Forward, ToolbarTrio, the three dropdown triggers) · PhotoCropModal (Cancel / Choose) · PreviewPane `.ppane-action` cluster and footer toggle · ActionBand segments + settings button · the menu accessory/footer actions · `.open-btn` · the settings category tabs · CalendarPicker nav pair · the reveal-on-hover adds (tab-plus, group-band, banner, table).
