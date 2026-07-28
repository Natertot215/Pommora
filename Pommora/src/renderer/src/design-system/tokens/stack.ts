// A z-index only competes inside its OWN stacking context, so these are separate ladders, never
// one number line: `shell` orders the window frame's pieces against each other, `local` lifts an
// element over its own siblings wherever it happens to live, and `top` orders the fixed and
// body-portalled surfaces that all land in the root context together. A step from one group is
// not comparable to a step from another.

export const stack = {
  /** The window frame, back to front — every step here is a child of the shell. */
  shell: {
    content: 0, // the editor pane, held in its own context so nothing inside it escapes over the frame
    sidebar: 1,
    titlebar: 2,
    sidebarToggle: 3, // over the title-bar strips
    sidebarResize: 4,
    inspector: 4, // it never overlaps the sidebar's strip, so the shared step is coincidence rather than a contract
    inspectorResize: 5, // over its own glass
    toolbar: 6, // over every panel
  },
  /** In-context lifts. Consumers sit in DIFFERENT stacking contexts, so a step ranks a thing against
   *  its own siblings and never against another surface's. */
  local: {
    lifted: 10,
    overlay: 20, // over the lifted
  },
  /** The top layer — fixed or body-portalled surfaces. The one group whose steps genuinely rank
   *  against each other, because they all resolve in the root context. */
  top: {
    dropPreview: 999, // one step under the ghost being dragged
    floating: 1000,
    menuBackdrop: 1099, // the transparent dismiss catcher one step under a portalled menu
    menu: 1100,
    menuOverlay: 1200, // a portalled host that has to clear a menu AND its backdrop
    caret: 2147483647, // over every layer, deliberately unbeatable
  },
} as const
