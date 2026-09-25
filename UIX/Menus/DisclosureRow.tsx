import { useMemo, useState, type ReactNode } from 'react'
import { Icon } from '../Symbols'
import { cx } from '../Utilities/cx'
import { toggled } from '../Utilities/checkSet'
import { Reveal } from '../Animations/Reveal'
import { MenuItem } from './MenuRows'
import { railRow, dropOutline, dropOutlineOpen, dropOutlineSpacer } from './listed-outline.css'

// The set holds the exceptions to `defaultOpen`, never the open nodes, so a default-open tree needs no seed and stays right as nodes appear and vanish beneath it.
export function useDisclosureSet(defaultOpen = false): {
  has: (id: string) => boolean
  toggle: (id: string) => void
} {
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set())
  // Identity-stable until the state flips, so consumers can key derivations on it.
  return useMemo(
    () => ({
      has: (id: string) => flipped.has(id) !== defaultOpen,
      toggle: (id: string) => setFlipped((prev) => toggled(prev, id)),
    }),
    [flipped, defaultOpen],
  )
}

/** 'spacer' keeps a leaf's glyph in the chevron's column; 'none' renders nothing. */
type DropOutlineKind = 'chevron' | 'spacer' | 'none'

export function DropOutline({
  kind = 'chevron',
  open = false,
  onToggle,
}: {
  kind?: DropOutlineKind
  open?: boolean
  onToggle?: () => void
}): React.JSX.Element | null {
  switch (kind) {
    case 'chevron':
      return (
        <Icon
          name="chevron-right"
          size="control"
          className={cx(dropOutline, open && dropOutlineOpen)}
          data-drop-outline
          {...(onToggle && {
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              onToggle()
            },
            onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
          })}
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
  checked,
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
  checked?: boolean
  className?: string
  trailing?: ReactNode
  /** Wraps the row ALONE, never the disclosed run — a drag rect must be the row's own height. */
  wrap?: (row: ReactNode) => ReactNode
  children?: ReactNode
}): React.JSX.Element {
  const row = (
    <MenuItem
      selected={selected}
      checked={checked}
      className={className}
      leading={
        <>
          <DropOutline kind={kind} open={open} onToggle={onToggle} />
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
  // A fragment, not a wrapper: a per-node wrapper makes every row an only-child no `+` rule matches.
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
