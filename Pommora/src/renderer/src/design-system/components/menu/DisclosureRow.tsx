// The disclosure-tree row — a MenuItem over the rail-ridden run it discloses, plus the open-id set
// such a tree keeps. One definition for every pane that walks a hierarchy; what the row's click
// does, and whether its chevron is decorative or load-bearing, is the consumer's to say.
import { useState, type ReactNode } from 'react'
import { Icon } from '../../symbols'
import { cx } from '../../cx'
import { Reveal } from '../Reveal'
import { MenuItem } from './Menu'
import { railRow, twisty, twistyOpen, twistySpacer } from './menu.css'

/** The open-id set a disclosure tree keeps. Nothing is disclosed until asked — a tree opens closed. */
export function useDisclosureSet(): {
  has: (id: string) => boolean
  toggle: (id: string) => void
} {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  return {
    has: (id) => open.has(id),
    toggle: (id) =>
      setOpen((prev) => {
        const next = new Set(prev)
        if (!next.delete(id)) next.add(id)
        return next
      }),
  }
}

/** What sits in the row's disclosure column: the chevron, a leaf's stand-in for it (so glyphs stay
 *  in one column), or nothing at all. */
export type TwistyKind = 'chevron' | 'spacer' | 'none'

function twistyGlyph(kind: TwistyKind, open: boolean, onToggle: () => void): ReactNode {
  switch (kind) {
    case 'chevron':
      return (
        <Icon
          name="chevron-right"
          size={12}
          className={cx(twisty, open && twistyOpen)}
          data-twisty
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          onPointerDown={(e) => e.stopPropagation()}
        />
      )
    case 'spacer':
      return <span className={twistySpacer} data-twisty-spacer />
    case 'none':
      return null
  }
}

export function DisclosureRow({
  title,
  icon,
  twisty: kind,
  open,
  onToggle,
  onClick,
  selected = false,
  className,
  wrap,
  children,
}: {
  title: ReactNode
  /** The row's own glyph, past the disclosure column. */
  icon: ReactNode
  twisty: TwistyKind
  open: boolean
  /** The chevron's action — always disclosure, whatever the row itself does. */
  onToggle: () => void
  /** The ROW's action. Omitted leaves the row inert — no button role, no hover-click. */
  onClick?: () => void
  selected?: boolean
  className?: string
  /** Wraps the row ALONE, never the disclosed run — a drag rect must be the row's own height. */
  wrap?: (row: ReactNode) => ReactNode
  /** The disclosed run. Absent = nothing to disclose, and no Reveal is emitted. */
  children?: ReactNode
}): React.JSX.Element {
  const row = (
    <MenuItem
      selected={selected}
      className={className}
      leading={
        <>
          {twistyGlyph(kind, open, onToggle)}
          {icon}
        </>
      }
      onClick={onClick}
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
        <Reveal open={open}>
          <div className={railRow}>{children}</div>
        </Reveal>
      )}
    </>
  )
}
