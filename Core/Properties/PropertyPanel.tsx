import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyValue } from '@pommora/uix/Elements/EmptyValue'
import { Button } from '@pommora/uix/Buttons/Button'
import { Icon } from '@pommora/uix/Symbols'
import { MenuItem, MenuScrollFrame, MenuTopRow } from '@pommora/uix/Menus'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { cx } from '@pommora/uix/Utilities/cx'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import type { ContextsRegistry } from '@pommora/core/Contexts/contexts'
import { resolveContextKeys } from '@pommora/core/Contexts/contextResolve'
import { linkAlias, linkEditText, urlValueFromRename } from '@pommora/core/Connections/linkValue'
import { propertyMenuModel } from '@pommora/core/Actions/propertyMenu'
import type { PageDetail } from '@pommora/core/Pages/pageDetail'
import { Cell } from './Cells/Cell'
import { PropertyEditor } from './Pickers/PropertyEditor'
import {
  PropertyPicker,
  type PickEntry,
  type PickTarget,
  syntheticContextDef,
} from './Pickers/PropertyPicker'
import { assignValue, type ValueWriter } from './assignValue'
import { parseEditorValue } from './parseEditorValue'
import { resolveFieldValue } from './value'
import { buildValueContext, type ValueContext } from './valueContext'
import { sharedValueClickAction } from './Pickers/valueClick'
import { fileChipIndex, fileValueMenu, pickFileInto } from './Pickers/filePick'
import { validateLink } from './Cells/linkResolve'
import { displayPropertyName, useCapitalizeMetadata } from './Cells/columnLabel'
import { propertyIcon } from './Cells/PropertyTypes'
import { contextOptionsFor } from '../Contexts/contextOptions'
import { contextIdentityOf, contextIdsOf, isContextColumnId } from '../Contexts/contextIdentity'
import { useSession, type WindowTarget } from '../Session/store'
import { fetchPageDetail, readPageDetail } from '../Session/pageDetailCache'
import { popMenu } from '../Actions/menuActions'
import { linkValueMenuTarget, showConnectionMenu } from '../Interface/Menus/connectionMenu'
import * as s from './property-panel.css'

type Editing = { id: string; mode: 'picker' | 'editor' | 'rename' } | null
type Field = { id: string; label: string; icon: string; def: PropertyDefinition | null }

export type PropertyPanelProps =
  | { page: PageDetail; onBack: () => void }
  | { page: WindowTarget; onBack?: never }

const schemaForPage = (tree: NexusTree | null, path: string): PropertyDefinition[] =>
  tree?.collections.find((c) => path.startsWith(`${c.path}/`))?.properties ?? []

export function PropertyPanel(props: PropertyPanelProps): React.JSX.Element {
  const pageFrame = props.onBack !== undefined
  const pageDetail = props.onBack ? props.page : null
  const capitalize = useCapitalizeMetadata()
  const tree = useSession((st) => st.tree)
  const mutate = useSession((st) => st.mutate)
  const assetMap = useSession((st) => st.assetMap)
  const [editing, setEditing] = useState<Editing>(null)
  const [addOpen, setAddOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const addRef = useRef<HTMLButtonElement | null>(null)
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  const [setAside, setSetAside] = useState<ReadonlySet<string>>(new Set())
  const [fm, setFm] = useState<PageFrontmatter | null>(null)
  const [fetchedTitle, setFetchedTitle] = useState('')

  const stored = pageDetail?.frontmatter ?? null
  useEffect(() => {
    if (!pageFrame) return
    setFm((stored ?? null) as PageFrontmatter | null)
  }, [pageFrame, stored])

  const path = props.page.path
  useEffect(() => {
    if (pageFrame) return
    setEditing(null)
    const cached = readPageDetail(path)
    if (cached) {
      setFm(cached.frontmatter as PageFrontmatter)
      setFetchedTitle(cached.title)
      return
    }
    let live = true
    setFm(null)
    void fetchPageDetail(path).then((detail) => {
      if (!live || !detail) return
      setFm(detail.frontmatter as PageFrontmatter)
      setFetchedTitle(detail.title)
    })
    return () => {
      live = false
    }
  }, [pageFrame, path])

  const nexusId = tree?.nexus.id
  useEffect(() => {
    setEditing(null)
    setRevealed(new Set())
    setSetAside(new Set())
  }, [nexusId])

  const title = pageDetail ? pageDetail.title : fetchedTitle
  const schema = useMemo(() => schemaForPage(tree, path), [tree, path])
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
  const contextValues = useMemo(() => {
    if (!fm || !tree?.contexts) return undefined
    const registry: ContextsRegistry = { contexts: tree.contexts.map((g) => g.def) }
    const spacesByContext = new Map(tree.contexts.map((g) => [g.def.id, g.spaces]))
    const links = resolveContextKeys(fm as Record<string, unknown>, registry, spacesByContext)
    const rider = fm.contextValues as Record<string, string[]> | undefined
    return links.size || rider ? { ...Object.fromEntries(links), ...rider } : undefined
  }, [fm, tree])
  const row = useMemo<ViewRow | null>(
    () =>
      fm
        ? {
            id: props.page.id,
            title,
            icon: fm.icon,
            path,
            frontmatter: fm,
            createdAt: null,
            modifiedAt: null,
            contextValues,
          }
        : null,
    [fm, props.page.id, path, title, contextValues],
  )

  const isContextRow = (id: string): boolean => isContextColumnId(tree, id)

  const writer = useRef<ValueWriter | null>(null)
  useEffect(() => {
    writer.current = {
      schema,
      mutate,
      rowOf: (id) => (row?.id === id ? row : undefined),
      apply: (_, next) => setFm(next),
    }
    return () => {
      writer.current = null
    }
  })
  const commit = (id: string, next: PropertyValue | null): void => {
    if (row) assignValue(writer, row, { id, kind: isContextRow(id) ? 'context' : 'property' }, next)
  }

  const allFields: Field[] = [
    ...contextRows.map((t) => ({ ...t, def: null })),
    ...schema.map((d) => ({
      id: d.id,
      label: displayPropertyName(d.name, capitalize),
      icon: propertyIcon(d),
      def: d,
    })),
  ]
  const isShown = (f: Field): boolean =>
    f.def
      ? revealed.has(f.id) || (fm as Record<string, unknown> | null)?.[f.def.name] !== undefined
      : (contextValues?.[f.id]?.length ?? 0) > 0 ||
        (pageFrame ? !setAside.has(f.id) : revealed.has(f.id))
  const shown = allFields.filter(isShown)
  const groups: [string, Field[]][] = [
    ['contexts', shown.filter((f) => !f.def)],
    ['properties', shown.filter((f) => f.def)],
  ]
  const entering = useEntrance(shown, (f) => f.id, fm !== null)

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
    const context = isContextRow(id)
    commit(id, null)
    const setAsideRow = context && pageFrame
    if (keep) {
      if (!setAsideRow) reveal(id)
      return
    }
    if (setAsideRow) setSetAside((prev) => new Set([...prev, id]))
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
    setAddOpen(false)
    reveal(id)
    requestAnimationFrame(() => {
      const el =
        document.querySelector<HTMLElement>(`[data-property-row="${id}"]`) ?? addRef.current
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
        def.type === 'context' && tree ? contextOptionsFor(editing.id, tree) : undefined,
    }
  })()

  const hiddenEntries: PickEntry[] = allFields
    .filter((f) => !isShown(f))
    .map((f) => ({ id: f.id, name: f.label, icon: f.icon, revealOnly: true, drillable: false }))

  const body = (): React.ReactNode => {
    if (!ctx || !row || !fm) return null
    return (
      <>
        <div className={pageFrame ? s.pageRows : cx(s.panelRows, 'over-scroll')}>
          {groups.map(([key, group]) =>
            group.length === 0 ? null : (
              <div key={key} className={s.group}>
                {group.map(({ def, id, label, icon }) => {
                  const column: ResolvedColumn = { id, kind: def ? 'property' : 'context' }
                  const rowBody = (
                    <MenuItem
                      key={id}
                      className={s.row}
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
                          onClick={(e) =>
                            editRow(def ?? syntheticContextDef(id), e.currentTarget, e.target)
                          }
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
                                const next = parseEditorValue(
                                  def.type,
                                  raw,
                                  resolveFieldValue(row, id, schema),
                                )
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
                  return pageFrame ? (
                    <Reveal key={id} open enterOnMount={entering(id)} fill>
                      {rowBody}
                    </Reveal>
                  ) : (
                    rowBody
                  )
                })}
              </div>
            ),
          )}
          {hiddenEntries.length > 0 && (
            <Button
              ref={addRef}
              size="button-inline"
              icon="plus"
              iconSize={pageFrame ? 'control' : 'caption'}
              label="Add Property"
              className={s.add}
              onClick={() => setAddOpen(true)}
            />
          )}
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
          chooser={addOpen ? hiddenEntries : undefined}
          open={panelTarget !== null || addOpen}
          triggerRef={addOpen ? addRef : triggerRef}
          onCommit={(v) => {
            if (editing) commit(editing.id, v)
          }}
          onReveal={(entry) => {
            if (pageFrame && isContextRow(entry.id)) {
              setAddOpen(false)
              setSetAside((prev) => new Set([...prev].filter((r) => r !== entry.id)))
              return
            }
            revealAndEdit(
              entry.id,
              schema.find((d) => d.id === entry.id),
            )
          }}
          onDismiss={() => {
            setEditing(null)
            setAddOpen(false)
          }}
        />
      </>
    )
  }

  return props.onBack ? (
    <div className={s.frame}>
      <MenuScrollFrame
        header={<MenuTopRow label="Settings" current="Properties" onBack={props.onBack} />}
      >
        {body()}
      </MenuScrollFrame>
    </div>
  ) : (
    <div className="window-panel-column">{body()}</div>
  )
}
