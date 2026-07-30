// The view-family native menus' action vocabulary — one home for the unions both processes
// speak (main pops the menu, preload types the reply), completing the shared-menu convention
// the per-menu files (cellMenu, tabMenu, …) established. No fs, no React.

export type ViewButtonMenuAction = 'toggle-title' | 'style-dropdown' | 'style-toolbar'

export type EmbedTitleMenuAction = 'toggle-icon' | 'hide-title' | `size-${number}`

export type EmbedAreaMenuAction =
  | 'toggle-pill-titles'
  | 'show-title'
  | 'new-view'
  | 'style-dropdown'
  | 'style-toolbar'

export type ViewItemMenuAction = 'view:duplicate' | 'view:delete'

export type ViewRowMenuAction = 'view:rename' | 'view:edit-icon' | 'view:delete'
