import { useEffect, useMemo, useRef, useState } from 'react'
import { footerLabel } from '@shared/toggleLabels'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { duration, easing, ms } from '@renderer/Animation'
import { WINDOW_BASE_PANEL, WindowBase } from './window-base'
import { useHeldPresence } from '@renderer/Animation/useExitPresence'
import { PageTile } from '../Tiles/Surfaces/PageTile'
import { Subfield } from '../Interface/Subfield/Subfield'
import { CitationsToggle } from '../Interface/Subfield/CitationsToggle'
import type { SubfieldPage } from '../Interface/Subfield/subfieldItems'
import { type ConnectionsApi, glanceLink } from '../MarkdownPM/Connections'
import { showConnectionMenu } from '../Actions/connectionMenu'
import { getContentViewRect } from '../Interface/ContentView'
import { NavTrail } from '@renderer/DesignSystem/Elements/NavTrail'
import { pageIndexOf, resolveIndexOf, trailOf } from '../treeIndex'
import { windowTargetOf, useEmbedScale, useSession, type WindowTarget } from '../store'
import { WindowActions } from './WindowActions'
import { WindowTabStrip } from './WindowTabStrip'
import { useWindowWarm } from './useWindowWarm'
import { EmptyValue } from '@renderer/DesignSystem/Elements/EmptyValue/EmptyValue'
import { Button } from '@renderer/DesignSystem/Buttons'
import type { PropertyDefinition } from '@shared/properties'
import { isBlankValue, type PropertyValue } from '@shared/propertyValue'
import type { PageFrontmatter } from '@shared/schemas'
import type { ResolvedColumn } from '@shared/types'
import { overScrollEllipsis } from '@renderer/Interactions/OverScroll'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { text } from '@renderer/DesignSystem/Tokens'
import { PickerMenu, PickerRow } from '@renderer/DesignSystem/Pickers/picker-base'
import { Cell } from '@renderer/Properties/Assignment/Cell'
import { PropertyEditor } from '@renderer/Properties/Assignment/PropertyEditor'
import { PropertyValueEditors } from '@renderer/Properties/Assignment/PropertyValueEditors'
import { parseEditorValue } from '@renderer/Properties/Assignment/cardValueInput'
import { linkEditText, urlValueFromEdit } from '@shared/linkValue'
import { resolveTitle, validateLink } from '@renderer/Actions/linkResolve'
import { resolveFieldValue } from '@renderer/Properties/value'
import { fetchPageDetail, readPageDetail } from '../Store/tabState'
import { usePropertyRows, type Editing } from '@renderer/Properties/Assignment/usePropertyRows'
import { propertyIcon } from '@renderer/Properties/PropertyTypes'
import {
  displayPropertyName,
  useCapitalizeMetadata,
} from '@renderer/Properties/Assignment/columnLabel'
import './page-window.css'

const DRAG_SURFACES = '.page-window-body, .window-tabwrap, .tab-scroll, .tab-strip'

const SLIDE_PX = 14

const STATS_DEBOUNCE_MS = 120

const EXIT_CLASS = { dismiss: '', engulf: 'engulfing', morph: 'morphing' } as const

export function PageWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.pageWindow?.flavor === 'page')
  const target = useSession(windowTargetOf)
  const shown = useHeldPresence(target, open)
  if (!shown) return null
  return <PageWindowBody target={shown.held} closing={shown.closing} />
}

function PageWindowBody({
  target,
  closing,
}: {
  target: WindowTarget
  closing: boolean
}): React.JSX.Element {
  const closeWindow = useSession((s) => s.closeWindow)
  const embedScale = useEmbedScale()
  const select = useSession((s) => s.select)
  const tree = useSession((s) => s.tree)
  const rootRef = useRef<HTMLDivElement>(null)

  const [editing, setEditing] = useState(false)
  useEffect(() => setEditing(false), [target.path])

  const [bodyText, setBodyText] = useState('')
  const statsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const seededPath = useRef<string | null>(null)
  useEffect(() => {
    setBodyText('')
    clearTimeout(statsTimer.current)
  }, [target.path])
  useEffect(
    () => () => {
      clearTimeout(statsTimer.current)
    },
    [],
  )
  const onBodyText = (b: string): void => {
    clearTimeout(statsTimer.current)
    if (seededPath.current !== target.path) {
      seededPath.current = target.path
      setBodyText(b)
      return
    }
    statsTimer.current = setTimeout(() => setBodyText(b), STATS_DEBOUNCE_MS)
  }
  const page = useMemo<SubfieldPage>(
    () => ({ target: { kind: 'page', id: target.id, path: target.path }, body: bodyText }),
    [target.id, target.path, bodyText],
  )
  const [inspectorOpen, setInspectorOpen] = useState(false)

  const openWindowTab = useSession((s) => s.openWindowTab)
  const connections = useMemo<ConnectionsApi | undefined>(() => {
    if (!tree) return undefined
    const idx = pageIndexOf(tree)
    return {
      ...idx,
      open: (page) => openWindowTab({ id: page.id, path: page.path }),
      bypass: (page) =>
        void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
      glance: glanceLink,
      menu: showConnectionMenu,
    }
  }, [tree, openWindowTab, select])

  const resolveIndex = tree ? resolveIndexOf(tree) : null

  const trail = trailOf(tree, { kind: 'page', id: target.id })

  const windowSlide = useSession((s) => s.windowSlide)
  const bodyRef = useRef<HTMLDivElement>(null)
  const prevPath = useRef(target.path)
  const playedSeq = useRef(0)
  useEffect(() => {
    const swapped = prevPath.current !== target.path
    prevPath.current = target.path
    if (!swapped || !windowSlide || windowSlide.seq === playedSeq.current) return
    playedSeq.current = windowSlide.seq
    const x = windowSlide.dir === 'back' ? -SLIDE_PX : SLIDE_PX
    const timing = { duration: ms(duration.fast), easing: easing.baseEase }
    bodyRef.current?.animate(
      [
        { transform: `translateX(${x}px)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      timing,
    )
    if (inspectorOpen)
      rootRef.current
        ?.querySelector('.page-window-inspector')
        ?.animate([{ transform: `translateX(${x}px)` }, { transform: 'translateX(0)' }], timing)
  }, [target.path, windowSlide, inspectorOpen])

  const warmSeam = useWindowWarm(bodyRef, target.path)

  const promote = (): void => {
    closeWindow('engulf')
    void select({ kind: 'page', id: target.id, path: target.path })
  }

  // FLIP from the window's live rect onto the content view's. WAAPI owns it (the rects are runtime
  // values); the css .engulfing class only suppresses the default scale-out.
  const exitReason = useSession((s) => s.windowExit)
  useEffect(() => {
    if (!closing || useSession.getState().windowExit !== 'engulf') return
    const el = rootRef.current
    const to = getContentViewRect()
    if (!el || !to) return
    const from = el.getBoundingClientRect()
    const dx = to.left + to.width / 2 - (from.left + from.width / 2)
    const dy = to.top + to.height / 2 - (from.top + from.height / 2)
    el.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${to.width / from.width}, ${to.height / from.height})`,
          opacity: 0,
        },
      ],
      { duration: ms(duration.base), easing: easing.baseEase, fill: 'forwards' },
    )
  }, [closing])

  return (
    <WindowBase
      id="page-window"
      rootRef={rootRef}
      className={cx('page-window', closing && EXIT_CLASS[exitReason])}
      closing={closing}
      onClose={() => closeWindow()}
      onEscape={() => (inspectorOpen ? setInspectorOpen(false) : closeWindow())}
      dragSurfaces={DRAG_SURFACES}
      ariaLabel="Page Preview"
      style={{ '--page-detail-scale': embedScale, '--editor-scale': 1 } as React.CSSProperties}
      onScan={promote}
      title={
        <WindowTabStrip
          index={resolveIndex}
          title={<NavTrail segments={trail} selected className="page-window-crumbs" />}
        />
      }
      actions={
        <WindowActions
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen((v) => !v)}
        />
      }
      right={{
        windowId: 'window-inspector',
        bounds: WINDOW_BASE_PANEL,
        mode: 'overlay',
        open: inspectorOpen,
        className: 'page-window-inspector',
        children: (
          <div className="window-pane-scroll">{inspectorOpen && <PagePanel target={target} />}</div>
        ),
      }}
      footer={<Subfield page={page} inert />}
      footerLabel={footerLabel}
      footerLead={<CitationsToggle page={page} />}
    >
      <div className="window-body page-window-body over-scroll page-tile-grows" ref={bodyRef}>
        <PageTile
          key={target.path}
          path={target.path}
          editing={editing}
          onBeginEdit={() => setEditing(true)}
          connections={connections}
          onBody={onBodyText}
          warm={warmSeam}
        />
      </div>
    </WindowBase>
  )
}

// Editable through the SAME primitives the table views use (Cell render, PropertyPicker/
// CalendarPicker, PropertyEditor). Writes ride the table's optimistic-patch pattern; the reconcile
// re-paths the open tab on rename.

export function PagePanel({ target }: { target: WindowTarget }): React.JSX.Element {
  const capitalize = useCapitalizeMetadata()
  const [fm, setFm] = useState<PageFrontmatter | null>(null)
  const [title, setTitle] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const addRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setEditing(null)
    // The warm path-keyed detail slot first — the embed half of this window feeds it (and vice
    // versa), so the page is fetched once per window and a warm hit skips the blank frame. Any
    // frontmatter write drops the slot, so a hit is never staler than the page beside it.
    const cached = readPageDetail(target.path)
    if (cached) {
      setFm(cached.frontmatter as PageFrontmatter)
      setTitle(cached.title)
      return
    }
    let live = true
    setFm(null)
    void fetchPageDetail(target.path).then((detail) => {
      if (!live || !detail) return
      setFm(detail.frontmatter as PageFrontmatter)
      setTitle(detail.title)
    })
    return () => {
      live = false
    }
  }, [target.path])

  const page = useMemo(
    () => ({ id: target.id, title, path: target.path }),
    [target.id, title, target.path],
  )
  const {
    schema,
    ctx,
    contextRows,
    contextValues,
    row,
    isContextRow,
    commitValue,
    commitContext,
    editRow: editRowShared,
    valueMenu: valueMenuShared,
  } = usePropertyRows(page, fm, setFm)

  // A row shows when it holds a real value or was assigned this session (session-only — disk
  // never carries an empty key). Deliberately unlike the Settings Properties leaf, which keeps
  // every Context slot open until set aside — that surface is where a page gets filed, this one
  // just reads one.
  const isAssigned = (id: string): boolean => {
    if (revealed.has(id)) return true
    if (isContextRow(id)) return (contextValues?.[id]?.length ?? 0) > 0
    const def = schema.find((d) => d.id === id)
    return def ? (fm as Record<string, unknown> | undefined)?.[def.name] !== undefined : false
  }

  const editRow = (def: PropertyDefinition, el: HTMLElement, from?: EventTarget | null): void =>
    editRowShared(
      def,
      el,
      {
        setTrigger: (t) => {
          triggerRef.current = t
        },
        setEditing,
        onReveal: (id) => setRevealed((prev) => new Set([...prev, id])),
      },
      from,
    )

  // The row mounts next frame, so its value field can only be anchored to after paint; from there
  // it routes through the same `editRow` every other click takes. A Context row carries no def and
  // opens its own picker.
  const revealAndEdit = (id: string, def?: PropertyDefinition): void => {
    setAddOpen(false)
    setRevealed((prev) => new Set([...prev, id]))
    requestAnimationFrame(() => {
      const el =
        document.querySelector<HTMLElement>(`[data-insp-id="${id}"] .page-window-insp-value`) ??
        addRef.current
      if (def && el) return editRow(def, el)
      triggerRef.current = el
      setEditing({ id, mode: 'picker' })
    })
  }

  if (!ctx || !row || !fm) return <div className="page-window-insp" />

  // The same native menu the page's own properties pane pops: Clear empties the value and leaves
  // the row to be refilled, Remove empties it and takes the row away, back into Add Property.
  const emptyRow = (id: string, keep: boolean): void => {
    if (isContextRow(id)) commitContext(id, [])
    else commitValue(id, null)
    if (keep) setRevealed((prev) => new Set([...prev, id]))
    else setRevealed((prev) => new Set([...prev].filter((r) => r !== id)))
  }
  const rowMenu = async (id: string, name: string, value: PropertyValue): Promise<void> => {
    const action = await window.nexus.propertyMenu({
      kind: 'page-value',
      name,
      filled: !isBlankValue(value),
    })
    if (action === 'value:clear' || action === 'value:remove')
      emptyRow(id, action === 'value:clear')
  }
  return (
    <div className="page-window-insp">
      <div className="page-window-insp-rows over-scroll">
        {[
          contextRows.filter((t) => isAssigned(t.id)).map((t) => ({ def: null, ...t })),
          schema
            .filter((d) => isAssigned(d.id))
            .map((d) => ({
              def: d,
              id: d.id,
              label: displayPropertyName(d.name, capitalize),
              icon: propertyIcon(d),
            })),
        ].map((group, gi) =>
          group.length === 0 ? null : (
            <div key={gi === 0 ? 'contexts' : 'properties'} className="page-window-insp-group">
              {group.map(({ def, id, label, icon }) => {
                const col: ResolvedColumn = { id, kind: def ? 'property' : 'context' }
                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
                  <div
                    key={id}
                    className="page-window-insp-row"
                    data-insp-id={id}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      void rowMenu(id, label, resolveFieldValue(row, id, schema))
                    }}
                  >
                    <span
                      className={cx(
                        'page-window-insp-label',
                        text.caption.standard,
                        overScrollEllipsis,
                      )}
                    >
                      <Icon name={icon} size="control" />
                      {label}
                    </span>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix */}
                    <span
                      className="page-window-insp-value"
                      onContextMenu={(e) => {
                        if (
                          !valueMenuShared(id, resolveFieldValue(row, id, schema), e.target, {
                            emptyRow,
                            setEditing,
                          })
                        )
                          return
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => {
                        if (def) return editRow(def, e.currentTarget, e.target)
                        triggerRef.current = e.currentTarget
                        setEditing({ id, mode: 'picker' })
                      }}
                    >
                      {editing?.id === id && editing.mode === 'editor' && def ? (
                        <PropertyEditor
                          initial={(() => {
                            const v = resolveFieldValue(row, id, schema)
                            if (v.kind === 'number') return String(v.value)
                            if (v.kind === 'url') return linkEditText(v.value)
                            return ''
                          })()}
                          numeric={def.type === 'number'}
                          validate={def.type === 'url' ? validateLink : undefined}
                          onCommit={(raw) => {
                            // url validates/normalizes and rides the existing alias along —
                            // identical to the cell surfaces.
                            const cur = resolveFieldValue(row, id, schema)
                            const next =
                              def.type === 'url'
                                ? urlValueFromEdit(
                                    raw.trim(),
                                    cur.kind === 'url' ? cur.value : undefined,
                                    resolveTitle,
                                  )
                                : parseEditorValue(def.type, raw)
                            if (next !== undefined) commitValue(id, next)
                            setEditing(null)
                          }}
                          onCancel={() => setEditing(null)}
                        />
                      ) : (
                        (Cell({
                          row,
                          column: col,
                          ctx,
                          hideIcon: false,
                          style: { look: 'standard' },
                          // The chip's hover × hands back what survives it — a Context keeps its
                          // remaining Spaces, a property its remaining options.
                          remove: def
                            ? (next) => commitValue(id, next)
                            : (next) =>
                                commitContext(id, next?.kind === 'context' ? next.value : []),
                        }) ?? <EmptyValue className="page-window-insp-empty" />)
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          ),
        )}
        {(contextRows.some((t) => !isAssigned(t.id)) || schema.some((d) => !isAssigned(d.id))) && (
          <Button
            ref={addRef}
            size="button-inline"
            icon="plus"
            iconSize="caption"
            label="Add Property"
            className="page-window-insp-add"
            onClick={() => setAddOpen(true)}
          />
        )}
      </div>
      <PickerMenu
        solid
        open={addOpen}
        onDismiss={() => setAddOpen(false)}
        triggerRef={addRef}
        origin="center"
      >
        {contextRows
          .filter((t) => !isAssigned(t.id))
          .map((t) => (
            <PickerRow
              key={t.id}
              leading={<Icon name={t.icon} size="body" />}
              onClick={() => revealAndEdit(t.id)}
            >
              {t.label}
            </PickerRow>
          ))}
        {schema
          .filter((d) => !isAssigned(d.id))
          .map((d) => (
            <PickerRow
              key={d.id}
              leading={<Icon name={propertyIcon(d)} size="body" />}
              onClick={() => revealAndEdit(d.id, d)}
            >
              {displayPropertyName(d.name, capitalize)}
            </PickerRow>
          ))}
      </PickerMenu>
      <PropertyValueEditors
        editing={editing}
        onDone={() => setEditing(null)}
        triggerRef={triggerRef}
        row={row}
        schema={schema}
        isContextRow={isContextRow}
        commitValue={commitValue}
        commitContext={commitContext}
      />
    </div>
  )
}
