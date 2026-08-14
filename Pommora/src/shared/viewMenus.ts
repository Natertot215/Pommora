// The view-family native menus' action vocabulary — one home for the unions both processes
// speak (main pops the menu, preload types the reply), completing the shared-menu convention
// the per-menu files (cellMenu, tabMenu, …) established. No fs, no React.

/** Which surface a container's views are picked from — offered by both menus that can set it. */
export type ViewStyleAction = 'style-dropdown' | 'style-toolbar'

export type ViewButtonMenuAction = 'toggle-title' | ViewStyleAction

export type EmbedTitleMenuAction = 'toggle-icon' | 'hide-title' | `size-${number}`

export type EmbedAreaMenuAction = 'show-title' | 'new-view' | ViewStyleAction
