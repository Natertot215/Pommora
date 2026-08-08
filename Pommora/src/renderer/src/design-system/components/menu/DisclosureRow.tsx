import { useState, type ReactNode } from 'react'
import { Icon } from '../../symbols'
import { cx } from '../../cx'
import { Reveal } from '../Reveal'
import { MenuItem } from './Menu'
import { railRow, twisty, twistyOpen, twistySpacer } from './menu.css'

/** Which nodes are disclosed. The set holds the EXCEPTIONS to `defaultOpen`, never the open nodes
 *  themselves — so a default-open tree needs no seed and stays right as nodes appear and vanish
 *  beneath it, which a seeded set of ids can't do without re-seeding on every change. */
export function useDisclosureSet(defaultOpen = false): {
  has: (id: string) => boolean
  toggle: (id: string) => void
} {
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set())
  return {
    has: (id) => flipped.has(id) !== defaultOpen,
    toggle: (id) =>
      setFlipped((prev) => {
        const next = new Set(prev)
        if (!next.delete(id)) next.add(id)
        return next
      }),
  }
}

/** A leaf's stand-in for the chevron ('spacer') keeps glyphs in one column; 'none' renders nothing. */
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
  trailing,
  wrap,
  children,
}: {
  title: ReactNode
  icon: ReactNode
  twisty: TwistyKind
  open: boolean
  onToggle: () => void
  /** Omitted leaves the row inert (MenuItem's contract) — no button role, no hover-click. */
  onClick?: () => void
  selected?: boolean
  className?: string
  /** Right-edge accessory, passed through to the MenuItem slot. */
  trailing?: ReactNode
  /** Wraps the row ALONE, never the disclosed run — a drag rect must be the row's own height. */
  wrap?: (row: ReactNode) => ReactNode
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
      trailing={trailing}
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
      {/* `fill` caps the disclosed column at the container's width — without it the column is
          `max-content` and a nowrap title widens the run instead of truncating inside it. */}
      {children != null && (
        <Reveal open={open} fill>
          <div className={railRow}>{children}</div>
        </Reveal>
      )}
    </>
  )
}
