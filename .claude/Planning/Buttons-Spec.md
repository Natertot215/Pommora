## Buttons — Spec

Queued after the design-system reorganization. Figma: https://www.figma.com/design/fYZ5oiK7stC3diRhaBHl1r/Pommora---React?node-id=0-1 → `design-system/components/buttons`.

**Home:** `DesignSystem/Components/Controls/`. A button is a recipe over `Label`: a control size (`size.control` — small · medium · large) × content (icon-only · icon + label · label) × type, with outline optional and taking the same base + fill the labels do.

**Sizes:** Inherits the sizes that already exist in Tokens/size.css; they'd be put here instead.

**Types**

| Type        | Fill                                | Text                              |
| ----------- | ----------------------------------- | --------------------------------- |
| Tinted      | accent @ `--tint-tertiary`          | accent @ `--tint-primary`         |
| Solid       | accent @ `--tint-primary`           | accent @ `--tint-primary` primary |
| Filled      | `--fill-tertiary`                   | `--label-primary`                 |
| Destructive | `--error` @ `--tint-tertiary`       | `--error` @ `--tint-primary`      |

No outline on any type by default.

**Segmented** is not a separate control: N buttons with the `Elements/Segment` pill between them, in the same three sizes (Figma: Segmented · Button, Segmented · Symbol · Small / Medium / Large). `Segmented-Controls` folds into this. They've already been perfected with an icon-only design, as seen in the ToolbarTrio.

**Consumers to rework:** the Toolbar (the only place buttons exist today) and `ActionRow`, which already reads as a filled button in every content mode.

**Open:** the source listed "Filled" twice; the accent-`tint-primary` line is recorded as Solid above — confirm.

Known Consumers

- The PhotoCropModal
- The ToolbarTrio
