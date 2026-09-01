// The block grip's native right-click menu — one contract for every kind of block a grip sits on.
// The renderer resolves the grip to its block and sends what it offers (main has no document); main
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

export interface ZoomOption {
  label: string
  factor: number
}

/** What a grip's block offers above Delete: an embed re-aims through the pick tree, a webpage
 *  re-aims through Edit Link, a list switches its markers. A heading chevron is its own surface —
 *  Rename, Size, and a Delete that drops the heading line but keeps its body. */
export type GripMenuContext =
  | { kind: 'embed'; tree: PickNode[]; zoomSteps: readonly ZoomOption[]; zoom: number | null }
  | { kind: 'webpage'; zoomSteps: readonly ZoomOption[]; zoom: number | null }
  | { kind: 'list'; current: ListKind | null }
  | { kind: 'heading'; level: number }
  | { kind: 'plain' }

export type GripMenuAction =
  | { action: 'source'; title: string }
  | { action: 'editLink' }
  | { action: 'zoom'; factor: number }
  | { action: 'listKind'; kind: ListKind }
  | { action: 'rename' }
  | { action: 'size'; level: number }
  | { action: 'delete' }

/** The heading ladder, named once for both the editor's Format ▸ Heading submenu and the heading
 *  grip's Size submenu. H6 exists in the document but stays off the picker. */
export const HEADING_LEVELS: readonly { level: number; label: string }[] = [
  { level: 0, label: 'Paragraph' },
  { level: 1, label: 'Heading 1' },
  { level: 2, label: 'Heading 2' },
  { level: 3, label: 'Heading 3' },
  { level: 4, label: 'Heading 4' },
  { level: 5, label: 'Heading 5' },
]

/** The four list markers with the names a menu shows for them. */
export const LIST_KIND_LABELS: readonly { kind: ListKind; label: string }[] = [
  { kind: 'ordered', label: 'Numbered' },
  { kind: 'bullet', label: 'Bulleted' },
  { kind: 'checkbox', label: 'Checklist' },
  { kind: 'arrow', label: 'Arrowed' },
]
