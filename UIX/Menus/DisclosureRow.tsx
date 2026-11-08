import { useMemo, useState, type ReactNode, type Ref } from 'react'
import { toggled } from '../Utilities/checkSet'
import { Reveal } from '../Animations/Reveal'
import { MenuItem } from './MenuRows'
import type { PickRun } from './pickRuns'
import { type ChevronKind, DisclosureChevron } from '../Elements/DisclosureChevron'
import { railRow } from '../Elements/disclosure.css'

export type Disclosure = {
  isOpen: (key: string) => boolean
  toggle: (key: string) => void
}

const NO_FLIPS: ReadonlySet<string> = new Set()

// The set holds the exceptions to `defaultOpen`, never the open nodes, so a default-open tree needs no seed and stays right as nodes appear and vanish beneath it; a new `resetOn` sets them aside.
export function useDisclosureSet(
  defaultOpen: boolean | ReadonlySet<string> = false,
  resetOn?: unknown,
): Disclosure {
  const [held, setHeld] = useState({ on: resetOn, flipped: NO_FLIPS })
  const flipped = held.on === resetOn ? held.flipped : NO_FLIPS
  // Identity-stable until the state flips, so consumers can key derivations on it.
  return useMemo(() => {
    const opens = (key: string): boolean =>
      typeof defaultOpen === 'boolean' ? defaultOpen : defaultOpen.has(key)
    return {
      isOpen: (key) => flipped.has(key) !== opens(key),
      toggle: (key) =>
        setHeld((prev) => ({
          on: resetOn,
          flipped: toggled(prev.on === resetOn ? prev.flipped : NO_FLIPS, key),
        })),
    }
  }, [flipped, defaultOpen, resetOn])
}

/** The rows a flat outline shows: everything deeper than a closed row is hidden, up to the next row at its depth or above. */
export function unfolded<R>(
  rows: readonly R[],
  depthOf: (row: R) => number,
  isOpen: (row: R) => boolean,
): R[] {
  const out: R[] = []
  let hidden = Number.POSITIVE_INFINITY
  for (const row of rows) {
    if (depthOf(row) > hidden) continue
    hidden = isOpen(row) ? Number.POSITIVE_INFINITY : depthOf(row)
    out.push(row)
  }
  return out
}

export function DisclosureRow({
  title,
  icon,
  chevron,
  open,
  onToggle,
  onClick,
  onContextMenu,
  active = false,
  picked,
  className,
  tabIndex,
  trailing,
  wrap,
  ref,
  children,
}: {
  title: ReactNode
  icon: ReactNode
  chevron: ChevronKind
  open: boolean
  onToggle: () => void
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void
  active?: boolean
  picked?: PickRun
  className?: string
  tabIndex?: number
  trailing?: ReactNode
  /** Wraps the row ALONE, never the disclosed run — a drag rect must be the row's own height. */
  wrap?: (row: ReactNode) => ReactNode
  ref?: Ref<HTMLDivElement>
  children?: ReactNode
}): React.JSX.Element {
  const row = (
    <MenuItem
      ref={ref}
      active={active}
      picked={picked}
      className={className}
      tabIndex={tabIndex}
      leading={
        <>
          <DisclosureChevron kind={chevron} open={open} onToggle={onToggle} />
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
