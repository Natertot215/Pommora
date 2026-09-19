## Interface

- A chord is claimed main-side before the renderer sees it when an app-menu `role` ships it: `{ role: 'windowMenu' }` in `Desktop/Actions/appMenu.ts` owns ⌘M for Minimize, the way the Edit role owned ⌘⇧V. Check `appMenu.ts` roles as well as `DEFAULT_COMMANDS` before binding.
- A "same shape as X" surface is a grep before a question: NavView is not a tab kind (it's the `newtab` sentinel with `selection.kind === 'none'`), and the Subfield has no per-surface registry (`DEFAULT_ITEMS` by selection kind plus the `showSubfield` boolean). The Homepage is the model for a real non-entity selection kind, and it needs a synthetic `NodeRecord` in `treeIndex.ts` before recents, pins, or favorites can resolve it.
- Liquid glass (`GlassSegment`, `GlassControls`) is an SVG displacement filter plus a backdrop filter per element, and even the frost tiers keep a backdrop filter each; anything drawn in the hundreds paints the tokens' values instead.
- A reader that needs the index's own rows goes through a store method and a channel, never a path reader: the `MatrixNode` rows carry kind and count, and the path readers built over them return neither.
