// The embed grip menu's cross-process contract: the renderer builds the pick tree (main has no
// tree), main maps it to native submenus, the pick comes back as the ask's resolution.

/** One node of the Collections → Sets → Pages pick tree — a `title`-bearing node is a page leaf,
 *  a `children`-bearing one drills. */
export interface EmbedPickNode {
  label: string
  title?: string
  children?: EmbedPickNode[]
}

export interface EmbedMenuContext {
  /** 'create' pops "Embed Page ▸" alone; 'tile' pops "Page Source ▸" + "Delete Embed". */
  mode: 'create' | 'tile'
  tree: EmbedPickNode[]
}

export type EmbedMenuAction =
  | { action: 'embed'; title: string }
  | { action: 'source'; title: string }
  | { action: 'delete' }
