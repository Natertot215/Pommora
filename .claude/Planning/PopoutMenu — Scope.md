## PopoutMenu — Scope

A scope, not a ratified plan: what the component is, what actually moves onto it, and the decisions that have to be made before any of it is built. Every count and citation below was re-derived against the code.

### What It Is

The **PopoutMenu** is the beak-less pane the MarkdownPM autocomplete already draws, formalized as a component and given the row treatment regular menus use. It is the surface for a **fixed set of options**, where `PickerMenu` keeps the notched, beaked surface for pickers over user data.

The autocomplete's surface today (`MarkdownPM/AutocompletePanel.tsx`) is a `NotchedPane` with `notchHeight={0}` — the only such override in the codebase — body-portalled so a transformed ancestor can't re-anchor it, no backdrop, and Bloom motion off the shared `dropdownOpen` / `dropdownClose` classes. It is **not** a `PickerMenu`, and that is the whole reason this component has to exist rather than being a `PickerMenu` prop.

It keeps `PickerMenu`'s glass and surface and gives up the notch, taking the autocomplete's rectangular shape and its faster, more native-feeling reveal. Reading closer to an OS menu is also what would make a **Use Native Menus** setting coherent — one switch choosing between two surfaces that already behave alike, rather than between two idioms.

### The Row Treatment Is The Point

This is the substance of the change, and it is what every migrated surface will visibly inherit.

| | Regular menu row (`menu.css.ts`) | Picker option (`pickerMenu.css.ts`) |
| --- | --- | --- |
| Type ramp | `text.body.standard` | `text.control.standard` |
| Label tone | `--label-primary` (`item`) | `--label-control` (`option`) |
| Trailing glyph tone | `--label-secondary` (`side`, inherited by `detail`) | none — the row has no glyph slot |
| Alignment | leading, with a flexible spine | **centered** |

A PopoutMenu row is the left column: primary label text, secondary trailing glyph, aligned the way every native-feeling menu in the app aligns. `PickerOption`'s centered control-tone row is what it replaces.

**Naming note:** the label tokens are `--label-primary` / `--label-secondary`, defined in `design-system/tokens/color.css.ts`. There are no CSS *classes* by those names — the classes that carry those tones are `item`, `side` and `detail` in `design-system/components/menu/menu.css.ts`. The tones are exactly as described; only the handles differ.

### What Actually Moves — One Component, Not Sixteen Surfaces

**`PickerControl` is the migration unit.** It is the house double-chevron control, and it already draws its own trigger (`chevrons-up-down`, size 12) plus, for three or more options, a centered `PickerMenu` of `PickerOption` rows. Repoint that one menu at PopoutMenu and **all twenty-five of its consumers move together**. The named surfaces — URL Format, Card Banner, Date · Day · Time, Number Format, Decimals — are consequences of that single change, not separate tasks.

**Two-option controls are already out of scope, by construction.** `PickerControl.tsx:34` toggles in place for exactly two options and opens no menu at all — the house rule that a dual-option control is a toggleable double-chevron and never a dropdown. Thirteen of the double-chevron sites found are two-option, and none of them will change.

That leaves three genuinely separate pieces of work:

1. **`PickerControl`'s menu** → PopoutMenu. Moves every fixed-option picker at once.
2. **The autocomplete panel** → PopoutMenu, which is what makes the component real rather than a rename.
3. **The hand-rolled double-chevron pickers** — FilterPane's `FieldPicker`, and Group By / Sort By, which open an inline `Reveal` list rather than any menu. They wear the trigger, so they come along; none of them moves for free.

**The block Scale picker stays as it is** (Nathan's call). It is `SurfacePM`'s grip, and its menu is already `MenuItem` rows rather than `PickerOption` — the surface it would gain is the one it half has.

### What The Autocomplete Needs That `PickerMenu` Doesn't Give

These are the requirements PopoutMenu has to satisfy, and each one is why the panel isn't already a `PickerMenu`:

- **Anchored to a point, not a trigger.** The caret has no element. `PointMenu` (`PickerMenu.tsx:427`) already solves this for right-click menus and is a candidate to fold in.
- **No focus management.** The editor's keymap owns arrows, Return and Escape; the panel's rows commit on `mousedown` with `preventDefault` so focus never leaves the document.
- **A left origin** — `--dropdown-origin: top left`, where `PickerMenu` leaves the default centre.
- **Its own exit presence,** with a snapshot of the last rows so the panel can retract in place after its query clears.
- **A different stacking rung** — the panel sits at `--z-lifted`, not the menu stack's top rung.

### Beyond The Six Named

The sweep found fixed-option pickers that ride `PickerControl` and were not in the original list. They migrate for free, but they are surfaces that will change appearance and are worth knowing about before the change lands:

- **Currency** and **Number Format** (`NumberEditor.tsx`) — Currency is the one long fixed list in the set.
- **Default Format** in Nexus Settings (`NexusSettings.tsx`) — the pasted-link default, which is the same option set as the URL property's Format.
- **The Sorting and Grouping panes' Order, Date By, Sub-Sort and Sub-Group rows.** Several of these are *conditionally* a menu: `directionOptions` returns a two-entry list for most property types (so the control toggles) while `CUSTOM_OPTION_DIRECTIONS` and `OPTION_ORDER` return three (so it opens). The same control is a toggle or a menu depending on the property it is pointed at — which is another reason to migrate the component rather than enumerate call sites.

### Ruled

- **The trigger decides, not the option source** (Nathan: "moving all double-chevron pickers to this"). **Sub-Sort** (`SortingPane.tsx:283`) and **Sub-Group** (`GroupingPane.tsx:921`) are double-chevron controls over the view's own schema properties, and they come along with the rest. The earlier deferral's "variable-input pickers keep `PickerMenu`" is superseded: what a control *looks like* is what says which surface it opens.
- **The block Scale picker stays** — `SurfacePM`'s grip is untouched.

### Still Open

1. **Does PopoutMenu subsume `PointMenu`?** Both are anchored to a point and carry no beak. If it does, right-click menus drawn in-app move to it too, and that is a wider blast radius than the pickers.
2. **Whether `PickerControl` keeps its `solid` prop.** It exists for pickers that open over another pane; whether PopoutMenu needs the same escape hatch depends on where it ends up in the stack.

### What This Is Not

- It is not a change to `PickerMenu`. Property pickers, the icon and colour grids, calendar dropdowns, hover cards and the free-text picker all keep the notched surface.
- It is not a change to any two-option control, nor to the block Scale picker.
- It is not a data change. Nothing here touches what is stored.
