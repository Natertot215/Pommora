import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyValue } from '@pommora/uix/Elements/EmptyValue'
import { Icon } from '@pommora/uix/Symbols'
import { AccessoryButton, MenuItem, heading } from '@pommora/uix/Menus'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { ghostAnchorProps } from '@pommora/uix/Interactions/ghostCreate'
import { DropLine } from '@pommora/uix/Interactions/DropLine'
import { nexusReorderIndex } from '@pommora/uix/Interactions/frameDndModel'
import { moveItem } from '@pommora/uix/Utilities/moveItem'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { cx } from '@pommora/uix/Utilities/cx'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import { linkAlias, linkEditText, urlValueFromRename } from '@pommora/core/Connections/linkValue'
import { propertyMenuModel } from '@pommora/core/Actions/propertyMenu'
import { Cell } from './Cells/Cell'
import { PropertyEditor } from './Pickers/PropertyEditor'
import {
  PropertyPicker,
  type PickEntry,
  type PickTarget,
  syntheticContextDef,
} from './Pickers/PropertyPicker'
import { assignValue, type ValueWriter } from './assignValue'
import { collectionOfPage, fetchPageValues, pageRowOf, schemaForPage, spaceRowOf } from './pageRow'
import { parseEditorValue } from './parseEditorValue'
import { resolveFieldValue } from './value'
import { buildValueContext, type ValueContext } from './valueContext'
import { sharedValueClickAction } from './Pickers/valueClick'
import { fileChipIndex, fileValueMenu, pickFileInto } from './Pickers/filePick'
import { validateLink } from './Cells/linkResolve'
import { displayPropertyName, useCapitalizeMetadata } from './Cells/columnLabel'
import { propertyIcon } from './Cells/PropertyTypes'
import { useGhostOptionAnchor } from './Schema/GhostOptionChip'
import { useOptionReorder } from './Schema/useOptionReorder'
import { resolveRowOrder } from './rowOrder'
import { pushValueUndo } from './valueUndo'
import { readSpaceRowOrder, type SpaceRowOrder } from '../Contexts/spaceSidecar'
import { host } from '../Platform/dialer'
import { contextOptionsFor } from '../Contexts/contextOptions'
import { contextIdentityOf, contextIdsOf, isContextColumnId } from '../Contexts/contextIdentity'
import { relDirname } from '@pommora/core/Paths/posix'
import { spaceNodeOf } from '../Nexus/treeIndex'
import { type Overrides, patchOverride, retireSettled } from './valueOverride'
import { useSession } from '../Session/store'
import { fetchPageDetail, readPageDetail } from '../Session/pageDetailCache'
import { popMenu } from '../Actions/menuActions'
import { linkValueMenuTarget, showConnectionMenu } from '../Interface/Menus/connectionMenuActions'
import * as s from './property-panel.css'

type Editing = { id: string; mode: 'picker' | 'editor' | 'rename' } | null
type Field = { id: string; label: string; icon: string; def: PropertyDefinition | null }

const GROUPS = [
  { key: 'contexts', label: 'Contexts', add: 'Add Context' },
  { key: 'properties', label: 'Properties', add: 'Add Property' },
] as const
type GroupKey = (typeof GROUPS)[number]['key']

export type PanelSubject =
  | { kind: 'page'; id: string; path: string; title?: string }
  | { kind: 'space'; id: string }

export function PropertyPanel({
  subject,
  host: panelHost,
}: {
  subject: PanelSubject
  host: 'dropdown' | 'side-pane'
}): React.JSX.Element {
  const isSpace = subject.kind === 'space'
  const capitalize = useCapitalizeMetadata()
  const tree = useSession((st) => st.tree)
  const mutate = useSession((st) => st.mutate)
  const assetMap = useSession((st) => st.assetMap)
  const [editing, setEditing] = useState<Editing>(null)
  const [addOpen, setAddOpen] = useState<GroupKey | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
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

  useEffect(() => {
    setEditing(null)
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

  const valuesEpoch = useSession((st) => st.valuesEpoch)
  useEffect(() => {
    if (isSpace || valuesEpoch?.kind !== 'container') return
    const named = valuesEpoch.changes.some((c) => c.pageIds.includes(subjectId))
    const mine =
      named || valuesEpoch.changes.some((c) => c.pageIds.length === 0 && c.rel === relDirname(path))
    if (!mine) return
    setOverride((prev) => retireSettled(prev, named ? [subjectId] : null))
    let live = true
    void fetchPageValues(relDirname(path), [subjectId]).then((values) => {
      const next = values?.[subjectId]?.frontmatter
      if (live && next) setBase(next as PageFrontmatter)
    })
    return () => {
      live = false
    }
  }, [valuesEpoch, subjectId, path, isSpace])

  // KNOB — a row added this session outlives a subject change; key this on `path` to scope it per subject.
  const nexusId = tree?.nexus.id
  useEffect(() => {
    setEditing(null)
    setRevealed(new Set())
  }, [nexusId])

  const title = subject.kind === 'page' ? (subject.title ?? fetchedTitle) : ''
  const schema = useMemo(
    () => (isSpace ? (tree?.registry ?? []) : schemaForPage(tree, path)),
    [tree, path, isSpace],
  )
  const ctx = useMemo<ValueContext | null>(
    () => (tree ? buildValueContext(tree, schema, assetMap) : null),
    [tree, schema, assetMap],
  )
  const contextRows = useMemo(
    () =>
      contextIdsOf(tree).flatMap((id) => {
        const identity = contextIdentityOf(tree, id)
        return identity ? [{ id, label: identity.title, icon: identity.icon }] : []
      }),
    [tree],
  )
  // The host pushes a Space's patched node before its write replies, so a settled override is already behind the node.
  const entry = override?.[subjectId]
  const overrideFm = isSpace && entry?.write === null ? undefined : entry?.fm
  const row = useMemo<ViewRow | null>(() => {
    if (isSpace) return tree && spaceNode ? spaceRowOf(tree, spaceNode, overrideFm) : null
    const frontmatter = overrideFm ?? base
    return frontmatter ? pageRowOf(tree, { id: subjectId, path, title }, frontmatter) : null
  }, [isSpace, tree, spaceNode, overrideFm, base, subjectId, path, title])
  const fm = row?.frontmatter ?? null
  const contextValues = row?.contextValues

  const isContextRow = (id: string): boolean => isContextColumnId(tree, id)

  const writer = useRef<ValueWriter | null>(null)
  useEffect(() => {
    writer.current = {
      schema,
      mutate,
      rowOf: (id) => (row?.id === id ? row : undefined),
      apply: (id, next, write) => patchOverride(setOverride, id, next, write),
    }
    return () => {
      writer.current = null
    }
  })
  const commit = (id: string, next: PropertyValue | null): void => {
    if (row) assignValue(writer, row, { id, kind: isContextRow(id) ? 'context' : 'property' }, next)
  }

  const contextFields: Field[] = contextRows.map((t) => ({ ...t, def: null }))
  const schemaFields: Field[] = schema.map((d) => ({
    id: d.id,
    label: displayPropertyName(d.name, capitalize),
    icon: propertyIcon(d),
    def: d,
  }))
  const held = (f: Field): boolean =>
    f.def
      ? (fm as Record<string, unknown> | null)?.[f.def.name] !== undefined
      : (contextValues?.[f.id]?.length ?? 0) > 0
  const isShown = (f: Field): boolean => held(f) || revealed.has(f.id)
  const spaceOrder = useMemo(() => readSpaceRowOrder(spaceNode?.values), [spaceNode])
  const nameOf = (f: Field): string => f.def?.name ?? f.label
  const nexusWide = resolveRowOrder(contextFields, (f) => f.id, tree?.contextOrder)
  const fields: Record<GroupKey, Field[]> = {
    contexts: resolveRowOrder(nexusWide, nameOf, spaceOrder.contexts),
    properties: resolveRowOrder(schemaFields, nameOf, spaceOrder.properties),
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
  const openAdd = (key: GroupKey): void => {
    triggerRef.current = addRefs.current[key]
    setAddOpen(key)
  }

  const sendWithUndo = <T,>(send: (order: T) => void, next: T, prior: T): void => {
    send(next)
    pushValueUndo(() => {
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
        tree?.contextOrder ?? [],
      )
      return
    }
    const collection = collectionOfPage(tree, path)
    if (!collection) return
    const full = schema.map((d) => d.id)
    sendWithUndo(
      (index) =>
        void host()
          .ask('schema:reorder', collection.path, id, index)
          .then((r) => (r.ok ? undefined : host().ask('error:show', r.error.message))),
      nexusReorderIndex(full, shownIds, id, toIndex),
      full.indexOf(id),
    )
  }

  // The hook's geometry snapshot re-arms on the array's identity, so each list is memoized on its joined ids.
  const contextIdsKey = shown.contexts.map((f) => f.id).join(',')
  const propertyIdsKey = shown.properties.map((f) => f.id).join(',')
  const contextIds = useMemo(() => contextIdsKey.split(',').filter(Boolean), [contextIdsKey])
  const propertyIds = useMemo(() => propertyIdsKey.split(',').filter(Boolean), [propertyIdsKey])
  const labelOfId = (id: string): string =>
    [...fields.contexts, ...fields.properties].find((f) => f.id === id)?.label ?? id
  const contextDrag = useOptionReorder(contextIds, labelOfId, (rowId, to) =>
    commitOrder('contexts', rowId, to),
  )
  const propertyDrag = useOptionReorder(propertyIds, labelOfId, (rowId, to) =>
    commitOrder('properties', rowId, to),
  )
  const ghostApi = useGhostOptionAnchor(
    editing !== null ||
      addOpen !== null ||
      contextDrag.dragging !== null ||
      propertyDrag.dragging !== null,
  )

  const reveal = (id: string): void => setRevealed((prev) => new Set([...prev, id]))
  const editRow = (
    def: PropertyDefinition,
    el: HTMLElement,
    from: EventTarget | null = el,
  ): void => {
    triggerRef.current = el
    const current = row ? resolveFieldValue(row, def.id, schema) : ({ kind: 'null' } as const)
    const shared = sharedValueClickAction(def.type, current)
    if (shared) {
      if (shared.kind === 'commit') {
        commit(def.id, shared.value)
        if (def.type === 'checkbox' && shared.value === null) reveal(def.id)
      } else if (shared.kind === 'file') {
        pickFileInto(def, current, fileChipIndex(from), (next) => commit(def.id, next))
      } else setEditing({ id: def.id, mode: 'picker' })
      return
    }
    if (def.type === 'number' || def.type === 'url') setEditing({ id: def.id, mode: 'editor' })
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
    const link =
      value.kind === 'url'
        ? linkValueMenuTarget(value.value, (action) => {
            if (action === 'link:clear') return emptyRow(id, true)
            if (action === 'rename' || action === 'editLink')
              setEditing({ id, mode: action === 'editLink' ? 'editor' : 'rename' })
          })
        : null
    if (!link) return false
    showConnectionMenu(link)
    return true
  }
  const revealAndEdit = (id: string, def?: PropertyDefinition): void => {
    setAddOpen(null)
    reveal(id)
    requestAnimationFrame(() => {
      const el =
        document.querySelector<HTMLElement>(`[data-property-row="${id}"]`) ??
        addRefs.current[isContextRow(id) ? 'contexts' : 'properties']
      if (def && el) return editRow(def, el)
      triggerRef.current = el
      setEditing({ id, mode: 'picker' })
    })
  }

  const rawLinkOf = (id: string): string => {
    const v = row ? resolveFieldValue(row, id, schema) : ({ kind: 'null' } as const)
    return v.kind === 'url' ? v.value : ''
  }
  const editingDef = editing ? schema.find((d) => d.id === editing.id) : undefined
  const panelTarget = ((): PickTarget | null => {
    if (!editing || !row || editing.mode !== 'picker') return null
    const def =
      editingDef ?? (isContextRow(editing.id) ? syntheticContextDef(editing.id) : undefined)
    if (!def) return null
    const current = resolveFieldValue(row, editing.id, schema)
    if (def.type === 'datetime') return { kind: 'datetime', def, current }
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
    const renderRow = (
      { def, id, label, icon }: Field,
      drag: ReturnType<typeof useOptionReorder>,
    ): React.ReactNode => {
      const column: ResolvedColumn = { id, kind: def ? 'property' : 'context' }
      const rowBody = (
        <MenuItem
          key={id}
          ref={(el) => drag.registerRow(id, el)}
          className={s.row}
          onPointerDown={(e) => drag.onRowPointerDown(id, e)}
          leading={<Icon name={icon} size="control" />}
          onContextMenu={(e) => {
            e.preventDefault()
            void rowMenu(id, label, resolveFieldValue(row, id, schema))
          }}
          trailing={
            // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell; the grid wants roving tabindex, not per-cell tab stops
            <span
              className={s.value}
              data-property-row={id}
              onContextMenu={(e) => {
                if (!valueMenu(id, resolveFieldValue(row, id, schema), e.target)) return
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => editRow(def ?? syntheticContextDef(id), e.currentTarget, e.target)}
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
                    const next = parseEditorValue(def.type, raw, resolveFieldValue(row, id, schema))
                    if (next !== undefined) commit(id, next)
                    setEditing(null)
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                (Cell({
                  row,
                  column,
                  ctx,
                  hideIcon: false,
                  style: { look: 'standard' },
                  remove: (next) => commit(id, next),
                }) ?? <EmptyValue className={s.empty} />)
              )}
            </span>
          }
        >
          {label}
        </MenuItem>
      )
      return (
        <Reveal key={id} open enterOnMount={entering(id)} fill>
          {rowBody}
        </Reveal>
      )
    }
    return (
      <>
        <div className={panelHost === 'dropdown' ? s.pageRows : cx(s.panelRows, 'over-scroll')}>
          {GROUPS.map(({ key, label, add }) => {
            const rows = shown[key]
            const drag = key === 'contexts' ? contextDrag : propertyDrag
            const addable = fields[key].some((f) => !isShown(f))
            const standing = addable && rows.length === 0
            const ghost =
              addable && !standing && ghostApi.ghost?.anchorId === key ? ghostApi.ghost : null
            const addRow = (onClick: () => void): React.JSX.Element => (
              <MenuItem
                className={cx(s.row, 'ghost-worn')}
                leading={<Icon name="plus" size="control" />}
                onClick={onClick}
              >
                {add}
              </MenuItem>
            )
            return (
              <div key={key} className={s.section} {...ghostAnchorProps(ghostApi, key)}>
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
                      className={addOpen === key ? undefined : s.sectionAdd}
                      create
                      onClick={() => openAdd(key)}
                    />
                  )}
                </div>
                {(rows.length > 0 || ghost || standing) && (
                  <div
                    ref={drag.containerRef}
                    className={cx(
                      'drop-line-host',
                      s.group,
                      panelHost === 'dropdown' && s.groupBordered,
                    )}
                  >
                    {drag.ghost}
                    {rows.map((f) => renderRow(f, drag))}
                    {standing && <div data-ghost-root>{addRow(() => openAdd(key))}</div>}
                    {ghost && (
                      <Reveal open={!ghost.closing} enterOnMount onCollapsed={ghostApi.closed}>
                        <div
                          data-ghost-root
                          onPointerEnter={ghostApi.onGhostEnter}
                          onPointerLeave={ghostApi.onGhostLeave}
                        >
                          {addRow(() => {
                            ghostApi.take()
                            openAdd(key)
                          })}
                        </div>
                      </Reveal>
                    )}
                    {drag.lineTop !== null ? <DropLine style={{ top: drag.lineTop }} /> : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {editing?.mode === 'rename' && (
          <TextPicker
            open
            triggerRef={triggerRef}
            value={linkAlias(rawLinkOf(editing.id)) ?? ''}
            accent={solidColorCss(editingDef?.link_color)}
            onCommit={(alias) => {
              commit(editing.id, urlValueFromRename(alias, rawLinkOf(editing.id)))
              setEditing(null)
            }}
            onDismiss={() => setEditing(null)}
          />
        )}
        <PropertyPicker
          target={panelTarget}
          chooser={addOpen ? hidden(addOpen) : undefined}
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

  return panelHost === 'dropdown' ? (
    <div className={s.frame}>{body()}</div>
  ) : (
    <div className="window-panel-column">{body()}</div>
  )
}
