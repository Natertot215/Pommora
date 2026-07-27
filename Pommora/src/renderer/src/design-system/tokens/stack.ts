// The stacking vocabulary. A z-index only competes inside its OWN stacking context, so this is three
// separate ladders, never one number line: `shell` orders the window frame's pieces against each other,
// `local` lifts an element over its own siblings wherever it happens to live, and `top` orders the fixed
// and body-portalled surfaces that all land in the root context together. A step from one group is not
// comparable to a step from another — the numbers only rank within a group.

export const stack = {
  /** The window frame, back to front — every step here is a child of the shell. */
  shell: {
    content: 0, // the editor pane, held in its own context so nothing inside it escapes over the frame
    sidebar: 1, // the leading glass panel
    titlebar: 2, // the window-drag strips across the top edge
    sidebarToggle: 3, // the collapse / expand button, over those strips
    sidebarResize: 4, // the sidebar's edge-drag strip
    inspector: 4, // the trailing glass panel — it never overlaps the sidebar's strip, so the shared step is coincidence rather than a contract
    inspectorResize: 5, // the inspector's edge-drag strip, over its own glass
    toolbar: 6, // the toolbar clusters, over every panel
  },
  /** In-context lifts. Consumers sit in DIFFERENT stacking contexts, so a step ranks a thing against
   *  its own siblings and never against another surface's. */
  local: {
    lifted: 10, // active over its siblings — a dragged item, an open toolbar dropdown, the editor's autocomplete
    overlay: 20, // over the lifted — a drag insertion line, an inline picker over the chrome it hangs on
  },
  /** The top layer — fixed or body-portalled surfaces. The one group whose steps genuinely rank
   *  against each other, because they all resolve in the root context. */
  top: {
    dropPreview: 999, // the drop-slot preview, one step under the ghost being dragged
    floating: 1000, // floats over the whole app — in-app windows, the modal scrim, drag ghosts and their insertion lines
    menuBackdrop: 1099, // the transparent dismiss catcher one step under a portalled menu
    menu: 1100, // the portalled menu pane
    menuOverlay: 1200, // a portalled host that has to clear a menu AND its backdrop
    caret: 2147483647, // the drawn caret, over every layer
  },
} as const
