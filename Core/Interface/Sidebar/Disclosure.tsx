import { Children, isValidElement, useEffect, useRef, useState } from 'react'
import { lockLabel } from '../../Actions/toggleLabels'
import { Icon, type IconName, LockGlyph } from '@pommora/uix/Symbols'
import { cx } from '@pommora/uix/Utilities/cx'
import { emitter } from '@pommora/uix/Utilities/subscribable'
import { DropOutline, MenuItem } from '@pommora/uix/Menus'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useHoverReveal } from '@pommora/uix/Interactions/hoverReveal'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { useFold, useSession } from '../../Session/store'
import { LineRow } from '@pommora/uix/Interactions/drag'
import { ctxHandler, type RenameTarget, RowTitle } from './sidebarRows'

const PEEK_LINGER_MS = 2500 // KNOB

const peeks = emitter<{ parentPath: string; childId: string }>()

/** A one-shot landed-here pulse; a disclosure-locked folder briefly reveals only that child. */
export const signalPeek = (parentPath: string, childId: string): void =>
  peeks.emit({ parentPath, childId })

export function Disclosure({
  icon,
  openIcon,
  title,
  depth,
  defaultOpen,
  persistKey,
  selected = false,
  onSelect,
  onContextMenu,
  rename,
  dragId,
  onBodyContextMenu,
  locked = false,
  onSetLock,
  selfPath,
  directChildren,
  onHeaderHover,
  belowHeader,
  children,
}: {
  icon: string
  openIcon?: IconName
  title: string
  depth: number
  defaultOpen: boolean
  persistKey: string
  selected?: boolean
  onSelect?: () => void
  onContextMenu?: () => void
  rename?: RenameTarget
  dragId: string
  onBodyContextMenu?: () => void
  locked?: boolean
  onSetLock?: (locked: boolean) => void
  selfPath?: string
  directChildren?: { id: string; path: string }[]
  onHeaderHover?: (entering: boolean) => void
  belowHeader?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useFold(persistKey, defaultOpen)
  const settleClick = useRef(false)
  const onHeaderPointerDown = rename
    ? (): void => {
        settleClick.current = useSession.getState().renamingPath === rename.path
      }
    : undefined
  const toggle = (): void => {
    if (settleClick.current) {
      settleClick.current = false
      return
    }
    // Locked + open still folds normally — the lock only engages on the next fold, not this one.
    if (locked && !open) {
      onSelect?.()
      return
    }
    setOpen(!open)
  }
  // Lingers the open-lock glyph after an unlock pressed on it, so a mistaken toggle can be undone before the pointer leaves.
  const lock = useHoverReveal({ engaged: locked, linger: { off: 'leave' } })
  // Both reveals exist to seat the sidebar's own field: a rename hosted elsewhere has nothing here to show, and unfolding for it would persist a fold the person never asked for.
  const renamingPath = useSession((s) => (s.renamingHost === 'sidebar' ? s.renamingPath : null))
  const renamingChild = rename ? renamingPath?.startsWith(`${rename.path}/`) === true : false
  useEffect(() => {
    if (renamingChild && !open && !locked) setOpen(true)
  }, [renamingChild, open, locked])

  const [peekId, setPeekId] = useState<string | null>(null)
  const peekTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const clearPeekTimer = (): void => {
    if (peekTimer.current) clearTimeout(peekTimer.current)
    peekTimer.current = undefined
  }
  const stopPeek = (): void => {
    clearPeekTimer()
    setPeekId(null)
  }
  const lingerPeek = (id: string): void => {
    clearPeekTimer()
    setPeekId(id)
    peekTimer.current = setTimeout(stopPeek, PEEK_LINGER_MS)
  }
  const namingChildId =
    locked && renamingPath
      ? (directChildren?.find((c) => c.path === renamingPath)?.id ?? null)
      : null
  const prevNaming = useRef<string | null>(null)
  useEffect(() => {
    if (namingChildId) {
      clearPeekTimer()
      setPeekId(namingChildId)
    } else if (prevNaming.current) lingerPeek(prevNaming.current)
    prevNaming.current = namingChildId
  }, [namingChildId])
  useEffect(() => {
    if (!locked) return
    return peeks.subscribe(({ parentPath, childId }) => {
      if (parentPath === selfPath) lingerPeek(childId)
    })
  }, [locked, selfPath])
  useEffect(() => {
    if (!locked) stopPeek()
  }, [locked])
  useEffect(() => clearPeekTimer, [])
  const peekOnly = locked && !open && peekId !== null
  const headerEl = useRef<HTMLDivElement | null>(null)
  const childrenEl = useRef<HTMLDivElement | null>(null)
  // A move into the peeked child isn't a dismiss — only leaving both header and children collapses it.
  const dismissOnLeave = (e: React.PointerEvent): void => {
    if (!peekTimer.current) return
    const to = e.relatedTarget as Node | null
    if (headerEl.current?.contains(to) || childrenEl.current?.contains(to)) return
    stopPeek()
  }
  const openView = onSelect
    ? (e: React.MouseEvent): void => {
        e.stopPropagation()
        onSelect()
      }
    : undefined
  const lockToggle =
    locked || lock.on ? (
      <button
        type="button"
        className={cx('row-lock', revealTarget)}
        aria-label={lockLabel(locked, 'Folder')}
        onClick={(e) => {
          e.stopPropagation()
          lock.press()
          onSetLock?.(!locked)
        }}
      >
        <LockGlyph locked={locked} />
      </button>
    ) : undefined
  const header = (
    <MenuItem
      ref={headerEl}
      className="row"
      selected={selected}
      indent={depth}
      tabIndex={-1}
      onClick={toggle}
      onPointerDown={onHeaderPointerDown}
      onContextMenu={ctxHandler(onContextMenu)}
      onPointerEnter={() => lock.hover(true)}
      onPointerLeave={(e) => {
        lock.hover(false)
        dismissOnLeave(e)
      }}
      trailing={lockToggle}
      leading={<DropOutline open={open} onToggle={toggle} />}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the surrounding row is the control; this narrows its hit area */}
      <span onClick={openView}>
        <Icon name={open && openIcon ? openIcon : icon} size="headline" className="row-icon" />
        {rename ? <RowTitle path={rename.path} kind={rename.kind} title={title} /> : title}
      </span>
    </MenuItem>
  )
  return (
    <>
      <LineRow
        id={dragId}
        className="tree-item"
        spring={locked || open ? undefined : () => setOpen(true)}
        open={toggle}
        onPointerEnter={onHeaderHover && (() => onHeaderHover(true))}
        onPointerLeave={onHeaderHover && (() => onHeaderHover(false))}
      >
        {header}
      </LineRow>
      {belowHeader}
      <Reveal open={open || peekOnly} fill>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <div
          ref={childrenEl}
          className={cx('children', peekOnly && 'children-peek')}
          onPointerLeave={dismissOnLeave}
          onContextMenu={
            onBodyContextMenu
              ? (e) => {
                  if (e.defaultPrevented) return
                  e.preventDefault()
                  onBodyContextMenu()
                }
              : undefined
          }
        >
          {peekOnly && peekId !== null
            ? Children.toArray(children).filter(
                (c) => isValidElement(c) && String(c.key).endsWith(peekId),
              )
            : children}
        </div>
      </Reveal>
    </>
  )
}
