// The block grip's native right-click menu — one contract for every kind of block a grip sits on. The
// renderer resolves the grip to its block and sends what that block offers (main has no document); main
// maps it to the native menu; the pick comes back as the ask's resolution.

/** The four list markers, named once for every layer that reads or writes one. */
export type ListKind = 'ordered' | 'bullet' | 'checkbox' | 'arrow'

/** One node of the Collections → Sets → Pages pick tree — a `title`-bearing node is a page leaf,
 *  a `children`-bearing one drills. */
export interface PickNode {
  label: string
  title?: string
  children?: PickNode[]
}

/** What a grip's block offers above Delete: an embed tile re-aims through the pick tree, a webpage
 *  tile re-aims through Edit Link, a list switches its markers, and every other kind offers Delete
 *  alone. A heading chevron is its own surface — Rename, Size (its level), and a Delete that drops
 *  the heading line but keeps its body. */
export type GripMenuContext =
  | { kind: 'embed'; tree: PickNode[] }
  | { kind: 'webpage' }
  | { kind: 'list'; current: ListKind | null }
  | { kind: 'heading'; level: number }
  | { kind: 'plain' }

export type GripMenuAction =
  | { action: 'source'; title: string }
  | { action: 'editLink' }
  | { action: 'listKind'; kind: ListKind }
  | { action: 'rename' }
  | { action: 'size'; level: number }
  | { action: 'delete' }
