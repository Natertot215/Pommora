// A z-index competes only inside its own stacking context, so these are separate ladders: a step from one group is never comparable to a step from another.

export const stack = {
  /** The window frame, back to front. */
  shell: {
    content: 0,
    sidebar: 1,
    titlebar: 2,
    sidebarToggle: 3,
    sidebarResize: 4,
    inspector: 4,
    inspectorResize: 5,
    toolbar: 6,
  },
  /** Lifts over an element's own siblings, wherever it lives. */
  local: {
    lifted: 10,
    overlay: 20,
  },
  /** Fixed and body-portalled surfaces, which all resolve in the root context. */
  top: {
    dropPreview: 999,
    floating: 1000,
    menu: 1100,
    caret: 2147483647,
  },
} as const
