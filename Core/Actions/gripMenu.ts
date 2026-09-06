export type ListKind = 'ordered' | 'bullet' | 'checkbox' | 'arrow'

/** A `title`-bearing node is a page leaf; a `children`-bearing one drills. */
export interface PickNode {
  label: string
  title?: string
  children?: PickNode[]
}

export interface ZoomOption {
  label: string
  factor: number
}

/** A heading chevron's Delete drops the heading line but keeps its body. */
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

/** Named once for both the editor's Format ▸ Heading submenu and the heading grip's Size submenu. */
export const HEADING_LEVELS: readonly { level: number; label: string }[] = [
  { level: 0, label: 'Paragraph' },
  { level: 1, label: 'Heading 1' },
  { level: 2, label: 'Heading 2' },
  { level: 3, label: 'Heading 3' },
  { level: 4, label: 'Heading 4' },
  { level: 5, label: 'Heading 5' },
]

export const LIST_KIND_LABELS: readonly { kind: ListKind; label: string }[] = [
  { kind: 'ordered', label: 'Numbered' },
  { kind: 'bullet', label: 'Bulleted' },
  { kind: 'checkbox', label: 'Checklist' },
  { kind: 'arrow', label: 'Arrowed' },
]
