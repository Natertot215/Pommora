import { reportRefusal } from '../Interface/Notifications/notifications'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyValue } from '@pommora/uix/Elements/EmptyValue'
import { Icon } from '@pommora/uix/Symbols'
import { AccessoryButton, MenuItem, heading, menuDropLine } from '@pommora/uix/Menus'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { ghostAnchorProps } from '@pommora/uix/Interactions/ghostCreate'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { nexusReorderIndex } from './paneDrop'
import { moveItem } from '@pommora/uix/Utilities/moveItem'
import { cx } from '@pommora/uix/Utilities/cx'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import type { PropertyDefinition } from './properties'
import { isBlankValue, type PropertyValue, NULL_VALUE } from './propertyValue'
import type { PageFrontmatter } from '../Nexus/schemas'
import type { ResolvedColumn, ViewRow } from '../Views/viewRow'
import { propertyMenuModel } from '../Actions/propertyMenu'
import { type CellMenuAction, cellMenuModel } from '../Actions/cellMenu'
import { Cell } from './Cells/Cell'
import {
  PropertyPicker,
  type PickEntry,
  type PickTarget,
  syntheticContextDef,
} from './Pickers/PropertyPicker'
import { assignValue, type ValueWriter } from './assignValue'
import { pageRowOf, spaceRowOf } from './pageRow'
import { containerSchema, owningCollection } from '../Nexus/treePatch'
import { useValuesEpoch } from '../Views/Host/useContainerValues'
import { PropertyValueInput } from './Pickers/PropertyValueInput'
import { resolveFieldValue } from './value'
import { buildValueContext, type ValueContext } from './valueContext'
import {
  runValueIntent,
  type ValueIntent,
  valueClickIntent,
  valueMenuIntent,
} from './Pickers/valueClick'
import { openWebLink } from '../Web/openWebLink'
import { fileChipIndex, fileValueMenu, pickFileInto } from './Pickers/filePick'
import { contextPaneTargets, type PaneTarget, schemaTargets } from './Cells/PropertyTypes'
import { useGhostOptionAnchor } from './Schema/GhostOptionChip'
import { resolveRowOrder } from './rowOrder'
import { pushUndo } from '../Session/undo'
import { readSpaceRowOrder, type SpaceRowOrder } from '../Contexts/spaceSidecar'
import { dialer } from '../Platform/dialer'
import { contextOptionsFor } from '../Contexts/contextOptions'
import { identityOf, isContextColumnId } from '../Contexts/contextIdentity'
import { relDirname } from '../Paths/posix'
import { spaceNodeOf } from '../Nexus/treeIndex'
import { type Overrides, patchOverride, retireSettled } from './valueOverride'
import { useSession, useSetting } from '../Session/store'
import { previewConnections } from '../Session/pageConnections'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { dateDefaults } from './columnStyles'
import { fetchPageDetail, readPageDetail } from '../Session/pageDetailCache'
import { popMenu } from '../Actions/menuActions'
import { linkValueMenuTarget, showConnectionMenu } from '../Interface/Menus/connectionMenuActions'
import * as s from './property-panel.css'
import { heldKey } from '../Files/heldKeys'
import { normalizeTitle } from '../Paths/caseFold'

type Editing = { id: string; mode: 'picker' | 'editor' | 'popover' } | null
type Field = PaneTarget & { def: PropertyDefinition | null }

const GROUPS = [
  { key: 'contexts', label: 'Contexts', add: 'Add Context' },
  { key: 'properties', label: 'Properties', add: 'Add Property' },
] as const
type GroupKey = (typeof GROUPS)[number]['key']

type PanelSubject =
  | { kind: 'page'; id: string; path: string; title?: string }
  | { kind: 'space'; id: string }

export function PropertyPanel({
  subject,
  host: panelHost,
  connections: hostConnections,
}: {
  subject: PanelSubject
  host: 'dropdown' | 'side-pane'
  /** A window's own routing for the links its values hold, as `TileHost` takes it; preview otherwise. */
  connections?: ConnectionsApi
}): React.JSX.Element {
  const isSpace = subject.kind === 'space'
  const tree = useSession((st) => st.tree)
  const mutate = useSession((st) => st.mutate)
  const assetMap = useSession((st) => st.assetMap)
  const [editing, setEditing] = useState<Editing>(null)
  const [addOpen, setAddOpen] = useState<{ key: GroupKey; fromRow: boolean } | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const addRefs = useRef<Record<GroupKey, HTMLButtonElement | null>>({
    contexts: null,
    properties: null,
  })
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  const [base, setBase] = useState<PageFrontmatter | null>(null)
  const [override, setOverride] = useState<Overrides | null>(null)
  const [fetchedTitle, setFetchedTitle] = useState('')
  const subjectId = subject.id
  const spaceNode = isSpace ? spaceNodeOf(tree, subjectId) : null
  const path = subject.kind === 'page' ? subject.path : (spaceNode?.path ?? '')
  const [editingFor, setEditingFor] = useState(path)
  if (editingFor !== path) {
    setEditingFor(path)
    setEditing(null)
    setAddOpen(null)
  }

  useEffect(() => {
    if (isSpace) return
    const cached = readPageDetail(path)
    if (cached) {
      setBase(cached.frontmatter as PageFrontmatter)
      setFetchedTitle(cached.title)
      return
    }
    let live = true
    setBase(null)
    void fetchPageDetail(path).then((detail) => {
      if (!live || !detail) return
      setBase(detail.frontmatter as PageFrontmatter)
      setFetchedTitle(detail.title)
    })
    return () => {
      live = false
    }
  }, [path, isSpace])

  useEffect(() => setOverride(null), [subjectId])
  useValuesEpoch(
    isSpace ? null : relDirname(path),
    (v) => {
      const next = v[subjectId]?.frontmatter
      if (next) setBase(next)
    },
    setOverride,
    subjectId,
  )

  // A Space has no values push; its override retires on its node's swap.
  useEffect(() => {
    if (isSpace) setOverride((prev) => retireSettled(prev, null))
  }, [isSpace, spaceNode])

  // KNOB — a row added this session outlives a subject change; key this on `path` to scope it per subject.
  const nexusId = tree?.nexus.id
  useEffect(() => {
    setEditing(null)
    setAddOpen(null)
    setRevealed(new Set())
  }, [nexusId])

  const title = subject.kind === 'page' ? (subject.title ?? fetchedTitle) : ''
  const schema = useMemo(
    () => (isSpace ? (tree?.config.registry ?? []) : containerSchema(tree, path)),
    [tree, path, isSpace],
  )
  const identity = tree && identityOf(tree)
  const ctx = useMemo<ValueContext | null>(
    () =>
      identity
        ? buildValueContext(
            identity,
            schema,
            assetMap,
            hostConnections ? () => hostConnections : previewConnections,
          )
        : null,
    [identity, schema, assetMap, hostConnections],
  )
  const dateFormat = useSetting('dateFormat')
  const pending = override?.[subjectId]
  const row = useMemo<ViewRow | null>(() => {
    if (isSpace)
      return tree && spaceNode ? spaceRowOf(tree, spaceNode, pending?.fm, pending?.contexts) : null
    const frontmatter = pending?.fm ?? base
    return frontmatter
      ? pageRowOf(tree, { id: subjectId, path, title }, frontmatter, pending?.contexts)
      : null
  }, [isSpace, tree, spaceNode, pending, base, subjectId, path, title])
  const fm = row?.frontmatter ?? null
  const contextValues = row?.contextValues

  const isContextRow = (id: string): boolean => isContextColumnId(tree, id)

  const writer = useRef<ValueWriter | null>(null)
  useEffect(() => {
    writer.current = {
      schema,
      mutate,
      rowOf: (id) => (row?.id === id ? row : undefined),
      apply: (id, next, write, contexts) => patchOverride(setOverride, id, next, write, contexts),
    }
    return () => {
      writer.current = null
    }
  })
  const commit = (id: string, next: PropertyValue | null): void => {
    if (row) assignValue(writer, row, { id, kind: isContextRow(id) ? 'context' : 'property' }, next)
  }

  const contextFields: Field[] = contextPaneTargets(tree).map((t) => ({ ...t, def: null }))
  const schemaFields: Field[] = schemaTargets(schema, () => true)
  const held = (f: Field): boolean =>
    f.def
      ? fm !== null && heldKey(fm, f.def.name) !== undefined
      : (contextValues?.[f.id]?.length ?? 0) > 0
  const isShown = (f: Field): boolean => held(f) || revealed.has(f.id)
  const spaceOrder = useMemo(() => readSpaceRowOrder(spaceNode?.values), [spaceNode])
  const nameOf = (f: Field): string => f.def?.name ?? f.label
  const orderKey = (f: Field): string => normalizeTitle(nameOf(f))
  const nexusWide = resolveRowOrder(contextFields, (f) => f.id, tree?.config.order.contexts)
  const fields: Record<GroupKey, Field[]> = {
    contexts: resolveRowOrder(nexusWide, orderKey, spaceOrder.contexts.map(normalizeTitle)),
    properties: resolveRowOrder(schemaFields, orderKey, spaceOrder.properties.map(normalizeTitle)),
  }
  const shown: Record<GroupKey, Field[]> = {
    contexts: fields.contexts.filter(isShown),
    properties: fields.properties.filter(isShown),
  }
  const hidden = (key: GroupKey): PickEntry[] =>
    fields[key]
      .filter((f) => !isShown(f))
      .map((f) => ({ id: f.id, name: f.label, icon: f.icon, revealOnly: true, drillable: false }))
  const entering = useEntrance([...shown.contexts, ...shown.properties], (f) => f.id, fm !== null)
  const openAdd = (key: GroupKey, anchor?: HTMLElement): void => {
    triggerRef.current = anchor ?? addRefs.current[key]
    setAddOpen({ key, fromRow: anchor !== undefined })
  }

  const sendWithUndo = <T,>(send: (order: T) => void, next: T, prior: T): void => {
    send(next)
    pushUndo(() => {
      if (!writer.current) return false
      send(prior)
      return true
    })
  }
  const commitOrder = (group: GroupKey, id: string, toIndex: number): void => {
    const shownIds = shown[group].map((f) => f.id)
    if (isSpace) {
      const moved = moveItem(shown[group], shownIds.indexOf(id), toIndex)
      const next: SpaceRowOrder = {
        contexts: (group === 'contexts' ? moved : shown.contexts).map(nameOf),
        properties: (group === 'properties' ? moved : shown.properties).map(nameOf),
      }
      sendWithUndo((o) => void mutate({ op: 'setSpaceRowOrder', path, ...o }), next, spaceOrder)
      return
    }
    if (group === 'contexts') {
      const full = fields.contexts.map((f) => f.id)
      const ids = moveItem(full, full.indexOf(id), nexusReorderIndex(full, shownIds, id, toIndex))
      sendWithUndo(
        (o) => void mutate({ op: 'reorderPanelContexts', ids: o }),
        ids,
        tree?.config.order.contexts ?? [],
      )
      return
    }
    const collection = owningCollection(tree, path)
    if (!collection) return
    const full = schema.map((d) => d.id)
    sendWithUndo(
      (index) =>
        void dialer().ask('schema:reorder', collection.path, id, index).then(reportRefusal),
      nexusReorderIndex(full, shownIds, id, toIndex),
      full.indexOf(id),
    )
  }

  const fieldOf = (id: string): Field | undefined =>
    [...fields.contexts, ...fields.properties].find((f) => f.id === id)
  const glyphOf = (id: string): React.ReactNode => {
    const f = fieldOf(id)
    return f && <Icon name={f.icon} />
  }
  const ghostApi = useGhostOptionAnchor(editing !== null || addOpen !== null)
  const addSeat = useHeldPresence(addOpen?.fromRow ? addOpen.key : null, 'fast')

  const reveal = (id: string): void => setRevealed((prev) => new Set([...prev, id]))
  const runIntent = (
    def: PropertyDefinition,
    current: PropertyValue,
    intent: ValueIntent | null,
    from: EventTarget | null,
  ): void => {
    const editAs = (mode: NonNullable<Editing>['mode']) => () => setEditing({ id: def.id, mode })
    runValueIntent(intent, {
      commit: ({ value }) => (value === null ? emptyRow(def.id, true) : commit(def.id, value)),
      file: () => pickFileInto(def, current, fileChipIndex(from), (next) => commit(def.id, next)),
      picker: editAs('picker'),
      dateTime: editAs('picker'),
      edit: editAs('editor'),
      rename: editAs('popover'),
      open: ({ url }) => openWebLink(url),
      popover: editAs('popover'),
      hide: null,
    })
  }
  const editRow = (
    def: PropertyDefinition,
    el: HTMLElement,
    from: EventTarget | null = el,
  ): void => {
    triggerRef.current = el
    const current = row ? resolveFieldValue(row, def.id, schema) : NULL_VALUE
    runIntent(def, current, valueClickIntent(def.type, current), from)
  }
  const emptyRow = (id: string, keep: boolean): void => {
    commit(id, null)
    if (keep) reveal(id)
    else setRevealed((prev) => new Set([...prev].filter((r) => r !== id)))
  }
  const rowMenu = async (id: string, name: string, value: PropertyValue): Promise<void> => {
    const action = await popMenu(
      propertyMenuModel({ kind: 'page-value', name, filled: !isBlankValue(value) }),
    )
    if (action === 'value:clear' || action === 'value:remove')
      emptyRow(id, action === 'value:clear')
  }
  const valueMenu = (id: string, value: PropertyValue, target: EventTarget | null): boolean => {
    const def = schema.find((d) => d.id === id)
    if (def?.type === 'file') {
      void fileValueMenu(def, value, target, (next) => commit(id, next))
      return true
    }
    if (!def || value.kind !== 'link') return false
    const run = (action: CellMenuAction | null): void => {
      if (action) runIntent(def, value, valueMenuIntent(action), null)
    }
    const link = linkValueMenuTarget(value.value, run)
    if (link) showConnectionMenu(link)
    else void popMenu(cellMenuModel({ kind: 'link', filled: true })).then(run)
    return true
  }
  const revealAndEdit = (id: string, def?: PropertyDefinition): void => {
    setAddOpen(null)
    reveal(id)
    requestAnimationFrame(() => {
      const el =
        rootRef.current?.querySelector<HTMLElement>(`[data-property-row="${id}"]`) ??
        addRefs.current[isContextRow(id) ? 'contexts' : 'properties']
      if (def && el) return editRow(def, el)
      triggerRef.current = el
      setEditing({ id, mode: 'picker' })
    })
  }

  const editingDef = editing ? schema.find((d) => d.id === editing.id) : undefined
  const panelTarget = ((): PickTarget | null => {
    if (!editing || !row || editing.mode !== 'picker') return null
    const def =
      editingDef ?? (isContextRow(editing.id) ? syntheticContextDef(editing.id) : undefined)
    if (!def) return null
    const current = resolveFieldValue(row, editing.id, schema)
    if (def.type === 'dateTime') return { kind: 'dateTime', def, current }
    return {
      kind: 'options',
      def,
      current,
      contextOptions:
        def.type === 'context' && tree
          ? contextOptionsFor(editing.id, tree, isSpace ? subjectId : undefined)
          : undefined,
    }
  })()

  const body = (): React.ReactNode => {
    if (!ctx || !row || !fm) return null
    const renderRow = ({ def, id, label, icon }: Field): React.ReactNode => {
      const column: ResolvedColumn = { id, kind: def ? 'property' : 'context' }
      const current = resolveFieldValue(row, id, schema)
      const rowBody = (
        <MenuItem
          className={s.row}
          leading={<Icon name={icon} size="control" />}
          onContextMenu={(e) => {
            e.preventDefault()
            void rowMenu(id, label, current)
          }}
          trailing={
            // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell; the grid wants roving tabindex, not per-cell tab stops
            <span
              className={s.value}
              data-property-row={id}
              onContextMenu={(e) => {
                triggerRef.current = e.currentTarget
                if (!valueMenu(id, current, e.target)) return
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => editRow(def ?? syntheticContextDef(id), e.currentTarget, e.target)}
            >
              {editing?.id === id && editing.mode === 'editor' && def ? (
                <PropertyValueInput
                  def={def}
                  current={current}
                  onCommit={(next) => commit(id, next)}
                  onClose={() => setEditing(null)}
                />
              ) : (
                <Cell
                  row={row}
                  column={column}
                  ctx={ctx}
                  hideIcon={false}
                  style={{ look: 'standard', ...dateDefaults(dateFormat) }}
                  commit={(next) => commit(id, next)}
                  empty={<EmptyValue className={s.empty} />}
                  onPane={(anchor) => {
                    triggerRef.current = anchor.closest<HTMLElement>('[data-property-row]')
                    runIntent(def!, current, { kind: 'popover' }, null)
                  }}
                />
              )}
            </span>
          }
        >
          {label}
        </MenuItem>
      )
      return (
        <Reveal key={id} open enterOnMount={entering(id)} fill>
          <LineRow id={id}>{rowBody}</LineRow>
        </Reveal>
      )
    }
    return (
      <>
        <div className={panelHost === 'dropdown' ? s.pageRows : cx(s.panelRows, 'scroll-fade')}>
          {GROUPS.map(({ key, label, add }) => {
            const rows = shown[key]
            const addable = fields[key].some((f) => !isShown(f))
            const standing = addable && rows.length === 0
            const opened = addOpen?.key === key
            const rowOpened = opened && addOpen.fromRow
            const addHeld = rowOpened || addSeat?.held === key
            const ghost =
              addable && !standing && ghostApi.ghost?.anchorId === key ? ghostApi.ghost : null
            const addRow = (
              onClick: (anchor: HTMLElement) => void,
              hover?: { onPointerEnter: () => void; onPointerLeave: () => void },
            ): React.JSX.Element => (
              <div
                data-ghost-root
                data-reveal-held={rowOpened || undefined}
                className={cx(s.addSlot, 'ghost-worn')}
                {...hover}
              >
                <MenuItem
                  className={s.row}
                  leading={<Icon name="plus" size="control" />}
                  onClick={(e) => onClick(e.currentTarget)}
                >
                  {add}
                </MenuItem>
              </div>
            )
            return (
              <div key={key} data-reveal-host="" {...ghostAnchorProps(ghostApi, key)}>
                <div className={heading}>
                  <span>{label}</span>
                  {addable && (
                    <AccessoryButton
                      ref={(el) => {
                        addRefs.current[key] = el
                      }}
                      icon="plus"
                      size={ICON.optionsAdd}
                      ariaLabel={add}
                      className={opened && !rowOpened ? undefined : revealTarget}
                      create
                      onClick={() => openAdd(key)}
                    />
                  )}
                </div>
                {(rows.length > 0 || addHeld || standing) && (
                  <LineZone
                    className={cx(s.group, panelHost === 'dropdown' && s.groupBordered)}
                    {...lineList({
                      commit: (id, slot) => commitOrder(key, id, slot.index),
                      line: menuDropLine,
                      label: (id) => fieldOf(id)?.label ?? id,
                      glyph: glyphOf,
                      watch: [rows.map((f) => f.id).join()],
                    })}
                  >
                    {rows.map(renderRow)}
                    {standing && addRow((anchor) => openAdd(key, anchor))}
                    {(ghost || (addHeld && !standing)) && (
                      <Reveal
                        open={rowOpened || (ghost !== null && !ghost.closing)}
                        enterOnMount
                        onCollapsed={ghostApi.closed}
                      >
                        {addRow(
                          (anchor) => {
                            ghostApi.take()
                            openAdd(key, anchor)
                          },
                          {
                            onPointerEnter: ghostApi.onGhostEnter,
                            onPointerLeave: ghostApi.onGhostLeave,
                          },
                        )}
                      </Reveal>
                    )}
                  </LineZone>
                )}
              </div>
            )
          })}
        </div>
        {editing?.mode === 'popover' && editingDef && row && (
          <PropertyValueInput
            alias={editingDef.type === 'link'}
            popover={{ open: true, triggerRef }}
            def={editingDef}
            current={resolveFieldValue(row, editing.id, schema)}
            onCommit={(next) => commit(editing.id, next)}
            onClose={() => setEditing(null)}
          />
        )}
        <PropertyPicker
          target={panelTarget}
          chooser={addOpen ? hidden(addOpen.key) : undefined}
          open={panelTarget !== null || addOpen !== null}
          triggerRef={triggerRef}
          onCommit={(v) => {
            if (editing) commit(editing.id, v)
          }}
          onReveal={(entry) =>
            revealAndEdit(
              entry.id,
              schema.find((d) => d.id === entry.id),
            )
          }
          onDismiss={() => {
            setEditing(null)
            setAddOpen(null)
          }}
        />
      </>
    )
  }

  return (
    <div ref={rootRef} className={panelHost === 'dropdown' ? s.frame : 'window-panel-column'}>
      {body()}
    </div>
  )
}
