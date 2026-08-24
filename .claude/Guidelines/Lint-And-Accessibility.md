## Lint & Accessibility

`npm run lint` is `biome check`, and it runs **clean** — zero errors, zero warnings, zero infos, and no unformatted file. Treat that as the floor: a change that adds a diagnostic isn't done. Formatting is normally automatic, since a hook formats every write, but a write that goes around the hook goes around the formatter too — the gate covers both so neither can pass unnoticed. This doc is about the linter's judgment calls; `npm run format` settles the rest.

### The Disabled Rules, and Why

Three rules are off in `biome.json`, each for a stated reason rather than convenience:

- **`useExhaustiveDependencies`** — Biome's version is stricter than React's own, and this codebase deliberately omits dependencies in places where the omission IS the behavior (mount-once editors, refs carrying live values, identity held stable so memoized rows survive unrelated tree pushes). Every such site explains itself in a plain comment. Editing dependency arrays to satisfy a linter is how stale-closure and re-render bugs get introduced into exactly the surfaces that took the longest to tune.

- **`noNonNullAssertion`** — the `!` assertion is an accepted idiom here, used where the surrounding logic already proves the value.

- **`noDescendingSpecificity`** — stylesheets are organized by concern, so a base class often appears after a more specific rule targeting it. Specificity governs regardless of source order, so the code is correct; reordering to satisfy the rule would scatter the grouping and put the cascade at risk for no behavioral gain.

Generated output (`graphify-out/`) is excluded from the linter's file scope. Linting a build artifact is noise.

### Suppressions Carry Reasons

A `biome-ignore` always states what the code actually is — never a bare silence. The reason is the point: a future reader should learn something true from it. Two rules follow from that:

- **Never suppress a rule that's genuinely firing.** If the code is wrong, fix the code.
- **When a rule's own fix is wrong, say so and suppress.** Biome's `noConfusingVoidType` fix, for instance, rewrites a callback's `void` return to `undefined` — which breaks assignability, because `() => void` is the permissive form that accepts a sync handler and an async one alike.

Placement is finicky in JSX: a suppression attaches to the **next line**, so it must sit immediately before the line the diagnostic names, and it must be a `//` comment in an expression slot (after `(`, `?`, `:`, `&&`, `=>`) but a `{/* … */}` comment in a children slot. A comment inside an attribute list attaches to nothing and shows up as an unused suppression. Where a whole file shares one honest reason — a Markdown table renderer whose cells have no identity but their position — `biome-ignore-all` at the top of the file is the right form.

### Accessibility

The bar is real, not decorative. An element that behaves like a control **is** a control: it carries a role, takes focus, and activates from the keyboard.

- **One activation primitive.** `DesignSystem/Interactions/activate.ts` is the keyboard half of a click surface — Enter and Space re-dispatch as a genuine click so the element's own `onClick` runs with a real event. There is no second code path to keep in sync, and no per-surface keyboard handler to re-derive.

- **Tab strips are tablists with roving tabindex.** Each tab carries its role and selected state, and only the active tab holds the tab stop, so a strip is one stop rather than one per tab.

- **Don't claim what the code can't honor.** A resize strip that only responds to the pointer must not wear `role="separator"` with value attributes — that promises keyboard resize the app doesn't implement. Pointer-only affordances (drag grips, bubble guards, dismiss backdrops, right-click surfaces, drop targets, hover bookkeeping) take no interactive role and say why. Over-claiming is worse than claiming nothing: it puts a control in the accessibility tree that does nothing when reached.

- **Decorative graphics are hidden explicitly**, on the element itself — a props spread is invisible to static analysis, so the attribute has to be literal.

#### II. Known Gap

**Grids have no keyboard navigation.** Table cells, card values, and inspector rows are click surfaces without tab stops, because per-cell stops are the wrong pattern — a table of any size would flood the tab order. The correct answer is roving tabindex across the grid with arrow-key movement, which is a feature to design rather than a lint fix. Those sites are suppressed and say exactly this, so the gap is visible in the code instead of buried.

#### II. The Drag Handle Already Owns Its Keyboard

The cross-zone drag engine's `handle` is not just a pointer binding: it ships `onKeyDown` (Space or Enter lifts the item), a role, a tab stop, `aria-roledescription="sortable"`, and an `aria-describedby` that announces how to use it. **A surface that spreads `{...handle}` and then declares its own `role`, `tabIndex`, or `onKeyDown` afterwards silently replaces that contract** — JSX takes the last one — and keyboard reordering dies with no error and no failing test.

Where a surface needs its own role, pass `itemRole` to `SortableZone` rather than overriding after the spread; where it needs its own activation, supply it only on the branch that has no drag handle. Biome cannot see a handler arriving through a spread, so these sites carry a suppression saying so — which is also the standing reminder that the handler is really there.

#### II. A Suppression Is One Line

`biome-ignore` reads its directive from the line the comment *starts* on, and attaches to whatever follows the comment. Wrapping a long reason across two `//` lines therefore attaches the directive to the second comment line rather than to the element, and both show up as `suppressions/unused` while the original rule still fires. Keep the whole reason on one line, however long, and put several rules in one directive separated by spaces rather than stacking directives.
