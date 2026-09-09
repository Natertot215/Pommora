import { Children, isValidElement, useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from '@pommora/uix/Symbols'
import { cx } from '@pommora/uix/Utilities/cx'
import { MenuItem } from '@pommora/uix/Menus'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useSession } from '../../Session/store'
import { dropOutline, dropOutlineOpen } from '@pommora/uix/Menus/listed-outline.css'
import { ctxHandler, DragRow, type RenameTarget, RowTitle } from './sidebarRows'

const PEEK_LINGER_MS = 2500 // KNOB

export function Disclosure({
  icon,
  openIcon,
  title,
  depth,
  defaultOpen = true,
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
  children,
}: {
  icon: string
  openIcon?: IconName
  title: string
  depth: number
  defaultOpen?: boolean
  persistKey: string
  selected?: boolean
  onSelect?: () => void
  onContextMenu?: () => void
  rename?: RenameTarget
  dragId?: string
  onBodyContextMenu?: () => void
  locked?: boolean
  onSetLock?: (locked: boolean) => void
  selfPath?: string
  directChildren?: { id: string; path: string }[]
  children: React.ReactNode
}): React.JSX.Element {
  // Read reactively rather than seeded once: a group whose id exists in both Nexuses does not remount across a switch, and its fold must follow the store.
  const stored = useSession((s) => s.devicePrefs.disclosure?.[persistKey])
  const open = stored ?? defaultOpen
  const setAndSave = (next: boolean): void => {
    const s = useSession.getState()
    s.setDevicePref('disclosure', { ...s.devicePrefs.disclosure, [persistKey]: next })
  }
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
    setAndSave(!open)
  }
  // Lingers the open-lock glyph after an unlock so a mistaken toggle can be undone before the pointer leaves.
  const [justUnlocked, setJustUnlocked] = useState(false)
  const hovered = useRef(false)
  const prevLocked = useRef(locked)
  useEffect(() => {
    if (prevLocked.current && !locked && hovered.current) setJustUnlocked(true)
    if (locked) setJustUnlocked(false)
    prevLocked.current = locked
  }, [locked])
  const renamingChild = useSession((s) =>
    rename ? s.renamingPath?.startsWith(`${rename.path}/`) === true : false,
  )
  useEffect(() => {
    if (renamingChild && !open && !locked) setAndSave(true)
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
  const renamingPath = useSession((s) => s.renamingPath)
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
  const peekNonce = useSession((s) => s.peekSignal?.nonce)
  useEffect(() => {
    const sig = useSession.getState().peekSignal
    if (locked && sig && sig.parentPath === selfPath) lingerPeek(sig.childId)
  }, [peekNonce])
  useEffect(() => {
    if (!locked) stopPeek()
  }, [locked])
  useEffect(() => clearPeekTimer, [])
  const peekOnly = locked && !open && peekId !== null
  const headerEl = useRef<HTMLDivElement | null>(null)
  const childrenEl = useRef<HTMLDivElement | null>(null)
  // A move into the peeked child isn't a dismiss — only leaving both header and children collapses it.
  const dismissOnLeave = (e: React.MouseEvent): void => {
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
    locked || justUnlocked ? (
      <button
        type="button"
        className={cx('row-lock', justUnlocked && 'row-lock-persist')}
        aria-label={locked ? 'Unlock folder' : 'Lock folder'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onSetLock?.(!locked)
        }}
      >
        <Icon name={locked ? 'locked' : 'lock-open'} size="control" />
      </button>
    ) : undefined
  const header = (
    <MenuItem
      ref={headerEl}
      className="row"
      selected={selected}
      indent={depth}
      onClick={toggle}
      onPointerDown={onHeaderPointerDown}
      onContextMenu={ctxHandler(onContextMenu)}
      onMouseEnter={() => {
        hovered.current = true
      }}
      onMouseLeave={(e) => {
        hovered.current = false
        setJustUnlocked(false)
        dismissOnLeave(e)
      }}
      trailing={lockToggle}
      leading={
        <Icon
          name="chevron-right"
          size="control"
          className={cx(dropOutline, open && dropOutlineOpen)}
          data-drop-outline
        />
      }
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
      {dragId ? (
        <DragRow
          id={dragId}
          springOpen={locked ? undefined : { collapsed: !open, onExpand: () => setAndSave(true) }}
        >
          {header}
        </DragRow>
      ) : (
        header
      )}
      <Reveal open={open || peekOnly} fill>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <div
          ref={childrenEl}
          className={cx('children', peekOnly && 'children-peek')}
          onMouseLeave={dismissOnLeave}
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
