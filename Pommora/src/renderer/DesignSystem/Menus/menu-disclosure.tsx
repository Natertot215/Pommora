import { useMemo, useState, type ReactNode } from 'react'
import { Icon } from '../Symbols'
import { cx } from '../Util/cx'
import { Reveal } from '../Animation/Reveal'
import { MenuItem } from './menu-row'
import { PickerOption } from '../Pickers/picker-base'
import { side } from './menu-base.css'
import { railRow, dropOutline, dropOutlineOpen, dropOutlineSpacer } from './listed-outline.css'

/** Which nodes are disclosed. The set holds the EXCEPTIONS to `defaultOpen`, never the open nodes
 *  themselves — so a default-open tree needs no seed and stays right as nodes appear and vanish
 *  beneath it, which a seeded set of ids can't do without re-seeding on every change. */
export function useDisclosureSet(defaultOpen = false): {
  has: (id: string) => boolean
  toggle: (id: string) => void
} {
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set())
  // Identity-stable until the state actually flips, so consumers can key derivations on it.
  return useMemo(
    () => ({
      has: (id: string) => flipped.has(id) !== defaultOpen,
      toggle: (id: string) =>
        setFlipped((prev) => {
          const next = new Set(prev)
          if (!next.delete(id)) next.add(id)
          return next
        }),
    }),
    [flipped, defaultOpen],
  )
}

/** A leaf's stand-in for the chevron ('spacer') keeps glyphs in one column; 'none' renders nothing. */
export type DropOutlineKind = 'chevron' | 'spacer' | 'none'

function dropOutlineGlyph(kind: DropOutlineKind, open: boolean, onToggle: () => void): ReactNode {
  switch (kind) {
    case 'chevron':
      return (
        <Icon
          name="chevron-right"
          size="control"
          className={cx(dropOutline, open && dropOutlineOpen)}
          data-drop-outline
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          onPointerDown={(e) => e.stopPropagation()}
        />
      )
    case 'spacer':
      return <span className={dropOutlineSpacer} data-drop-outline-spacer />
    case 'none':
      return null
  }
}

export function DisclosureRow({
  title,
  icon,
  dropOutline: kind,
  open,
  onToggle,
  onClick,
  onContextMenu,
  selected = false,
  picker = false,
  className,
  trailing,
  wrap,
  children,
}: {
  title: ReactNode
  icon: ReactNode
  dropOutline: DropOutlineKind
  open: boolean
  onToggle: () => void
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  selected?: boolean
  picker?: boolean
  className?: string
  trailing?: ReactNode
  /** Wraps the row ALONE, never the disclosed run — a drag rect must be the row's own height. */
  wrap?: (row: ReactNode) => ReactNode
  children?: ReactNode
}): React.JSX.Element {
  const row = picker ? (
    <PickerOption
      selected={selected}
      ring
      onClick={onClick}
      leading={
        <span className={side}>
          {dropOutlineGlyph(kind, open, onToggle)}
          {icon}
        </span>
      }
    >
      {title}
    </PickerOption>
  ) : (
    <MenuItem
      selected={selected}
      className={className}
      leading={
        <>
          {dropOutlineGlyph(kind, open, onToggle)}
          {icon}
        </>
      }
      trailing={trailing}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {title}
    </MenuItem>
  )
  // A fragment, not a wrapper div: the selection ring's run-merging needs real siblings, and a
  // per-node wrapper makes every row an only-child no `+` rule can ever match.
  return (
    <>
      {wrap ? wrap(row) : row}
      {children != null && (
        <Reveal open={open} fill>
          <div className={railRow}>{children}</div>
        </Reveal>
      )}
    </>
  )
}
