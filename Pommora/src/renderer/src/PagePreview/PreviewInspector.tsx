import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import type { PropertyValue } from '@shared/propertyValue'
import { applyValueAtRoot, isBlankValue, propertyKey } from '@shared/propertyValue'
import type { PageFrontmatter } from '@shared/schemas'
import type { NexusTree, ResolvedColumn, ViewRow } from '@shared/types'
import { cx } from '@renderer/design-system/cx'
import { asRenderableIcon, Icon } from '@renderer/design-system/symbols'
import { propertyTypeIconName } from '../Components/Detail/PropertyTypes'
import { text } from '@renderer/design-system/tokens'
import { PickerMenu, PickerOption } from '@renderer/design-system/components/PickerMenu'
import { Cell } from '../Detail/Views/Table/Cell'
import { buildResolveContext, type ResolveContext } from '../Detail/Views/Table/resolveContext'
import { contextOptionsFor } from '../Detail/Views/pipeline/contextOptions'
import {
  contextIdentityOf,
  contextIdsOf,
  spaceIdentityOf,
} from '../Detail/Views/pipeline/contextIdentity'
import { PropertyEditor } from '../Detail/Views/PropertyEditing/PropertyEditor'
import { sharedValueClickAction } from '../Detail/Views/PropertyEditing/valueClick'
import { parseEditorValue } from '../Detail/Views/Cards/cardValueInput'
import { parseLink, urlValueFromEdit } from '@shared/linkValue'
import { PropertyPicker, syntheticContextDef } from '../Detail/Views/PropertyEditing/PropertyPicker'
import { DatetimeValuePicker } from '../Detail/Views/PropertyEditing/DatetimeValuePicker'
import { resolveFieldValue } from '../Detail/Views/pipeline/value'
import { isValidLink } from '@shared/links'
import { contextKey, type ContextsRegistry } from '@shared/contexts'
import { resolveContextKeys } from '@shared/contextResolve'
import { cachePageDetail, readPageDetail } from '../Tabs/warmCache'
import { useSession, type PreviewTarget } from '../store'

// Editable through the SAME primitives the table views use (Cell render, PropertyPicker/
// CalendarPicker, PropertyEditor). Writes ride the table's optimistic-patch pattern; the reconcile
// re-paths the open tab on rename.

/** The page's owning Collection by path prefix — schema lives only on Collections. */
const schemaForPage = (tree: NexusTree | null, path: string): PropertyDefinition[] => {
  if (!tree) return []
  const all = tree.collections
  return all.find((c) => path.startsWith(`${c.path}/`))?.properties ?? []
}

const propertyIcon = (def: PropertyDefinition): string =>
  asRenderableIcon(def.icon) ?? propertyTypeIconName(def.type) ?? 'tag'

type Editing = { id: string; mode: 'picker' | 'editor' | 'date' } | null

export function PreviewInspector({ target }: { target: PreviewTarget }): React.JSX.Element {
  const tree = useSession((s) => s.tree)
  const mutate = useSession((s) => s.mutate)
  const [fm, setFm] = useState<PageFrontmatter | null>(null)
  const [title, setTitle] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  // Empty properties hide from the field; + Add Property reveals one and opens its editor.
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
    void window.nexus.openPage(target.path).then((r) => {
      if (!live || !r.ok) return
      cachePageDetail(r.value)
      setFm(r.value.frontmatter as PageFrontmatter)
      setTitle(r.value.title)
    })
    return () => {
      live = false
    }
  }, [target.path])

  const schema = useMemo(() => schemaForPage(tree, target.path), [tree, target.path])
  const ctx = useMemo<ResolveContext | null>(
    () => (tree ? buildResolveContext(tree, schema) : null),
    [tree, schema],
  )
  const contextRows = useMemo(
    () =>
      contextIdsOf(tree).flatMap((id) => {
        const identity = contextIdentityOf(tree, id)
        return identity ? [{ id, label: identity.title, icon: identity.icon }] : []
      }),
    [tree],
  )
  const ctxRegistry = useMemo<ContextsRegistry | null>(
    () => (tree?.contexts ? { contexts: tree.contexts.map((g) => g.def) } : null),
    [tree],
  )
  const contextValues = useMemo(() => {
    if (!fm || !ctxRegistry || !tree?.contexts) return undefined
    const spacesByContext = new Map(tree.contexts.map((g) => [g.def.id, g.spaces]))
    const links = resolveContextKeys(fm as Record<string, unknown>, ctxRegistry, spacesByContext)
    return links.size ? Object.fromEntries(links) : undefined
  }, [fm, ctxRegistry, tree])
  const row = useMemo<ViewRow | null>(
    () =>
      fm
        ? { id: target.id, title, icon: fm.icon, path: target.path, frontmatter: fm, contextValues }
        : null,
    [fm, title, target, contextValues],
  )

  // A row shows when it holds a real value OR was assigned this session (session-only — disk
  // never carries an empty key).
  const isAssigned = (id: string): boolean => {
    if (revealed.has(id)) return true
    if (contextRows.some((c) => c.id === id)) return (contextValues?.[id]?.length ?? 0) > 0
    const def = schema.find((d) => d.id === id)
    return def
      ? (fm as Record<string, unknown> | undefined)?.[propertyKey(def)] !== undefined
      : false
  }

  const closeEditing = (): void => setEditing(null)

  const commitValue = (propertyId: string, value: PropertyValue | null): void => {
    const def = schema.find((d) => d.id === propertyId)
    if (!def) return
    setFm((prev) =>
      prev ? (applyValueAtRoot(prev as Record<string, unknown>, def, value) as typeof prev) : prev,
    )
    void mutate({ op: 'setProperty', path: target.path, propertyId, value })
  }
  const commitContext = (contextId: string, ids: string[]): void => {
    // Optimistic — main re-resolves authoritatively at the write boundary.
    const ctxTitle = contextIdentityOf(tree, contextId)?.title
    if (ctxTitle === undefined) return
    const titles = ids
      .map((sid) => spaceIdentityOf(tree, sid)?.title)
      .filter((t): t is string => t !== undefined)
    setFm((prev) => {
      if (!prev) return prev
      const next = { ...prev } as Record<string, unknown>
      if (titles.length) next[contextKey(ctxTitle)] = titles
      else delete next[contextKey(ctxTitle)]
      return next as PageFrontmatter
    })
    void mutate({ op: 'setContext', path: target.path, contextId, spaceIds: ids })
  }

  const editRow = (def: PropertyDefinition, el: HTMLElement): void => {
    triggerRef.current = el
    // checkbox is true-or-absent on disk, never a stored false — the shared click-semantics
    // router handles it; number/url stay inline here.
    const v = row ? resolveFieldValue(row, def.id, schema) : ({ kind: 'null' } as const)
    const shared = sharedValueClickAction(def.type, undefined, v, def)
    if (shared) {
      if (shared.kind === 'commit') {
        commitValue(def.id, shared.value)
        // Un-checking clears the key, which would also un-assign the row — keep it revealed
        // this session so the box can be re-checked.
        if (def.type === 'checkbox' && shared.value === null)
          setRevealed((prev) => new Set([...prev, def.id]))
      } else setEditing({ id: def.id, mode: shared.kind === 'datetime' ? 'date' : 'picker' })
      return
    }
    if (def.type === 'number' || def.type === 'url') setEditing({ id: def.id, mode: 'editor' })
  }

  // Opens the editor anchored to the value field on the right — the row mounts next frame
  // (requestAnimationFrame).
  const revealAndEdit = (id: string, def?: PropertyDefinition): void => {
    setAddOpen(false)
    setRevealed((prev) => new Set([...prev, id]))
    if (def?.type === 'checkbox') {
      commitValue(id, { kind: 'checkbox', value: true })
      return
    }
    if (def && (def.type === 'file' || def.type === 'last_edited_time')) return
    requestAnimationFrame(() => {
      triggerRef.current =
        document.querySelector<HTMLElement>(`[data-insp-id="${id}"] .pgpreview-insp-value`) ??
        addRef.current
      if (def?.type === 'datetime') setEditing({ id, mode: 'date' })
      else if (def && (def.type === 'number' || def.type === 'url'))
        setEditing({ id, mode: 'editor' })
      else setEditing({ id, mode: 'picker' })
    })
  }

  if (!ctx || !row || !fm) return <div className="pgpreview-insp" />

  const isContextRow = (id: string): boolean => contextRows.some((c) => c.id === id)

  // The same native menu the page's own properties pane pops: Clear empties the value and leaves
  // the row to be refilled, Remove empties it and takes the row away, back into Add Property.
  const rowMenu = async (id: string, name: string, filled: boolean): Promise<void> => {
    const action = await window.nexus.propertyMenu({ kind: 'page-value', name, filled })
    if (action !== 'value:clear' && action !== 'value:remove') return
    if (isContextRow(id)) commitContext(id, [])
    else commitValue(id, null)
    if (action === 'value:clear') setRevealed((prev) => new Set([...prev, id]))
    else setRevealed((prev) => new Set([...prev].filter((r) => r !== id)))
  }
  const editingDef =
    editing &&
    (schema.find((d) => d.id === editing.id) ??
      (isContextRow(editing.id) ? syntheticContextDef(editing.id) : undefined))

  return (
    <div className="pgpreview-insp">
      <div className="pgpreview-insp-rows edge-fade">
        {/* Nothing pre-shows — on an empty page the Add affordance alone sits at the top. */}
        {[
          contextRows.filter((t) => isAssigned(t.id)).map((t) => ({ def: null, ...t })),
          schema
            .filter((d) => isAssigned(d.id))
            .map((d) => ({ def: d, id: d.id, label: d.name, icon: propertyIcon(d) })),
        ].map((group, gi) =>
          group.length === 0 ? null : (
            <div key={gi === 0 ? 'contexts' : 'properties'} className="pgpreview-insp-group">
              {group.map(({ def, id, label, icon }) => {
                const col: ResolvedColumn = { id, kind: def ? 'property' : 'context' }
                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
                  <div
                    key={id}
                    className="pgpreview-insp-row"
                    data-insp-id={id}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      void rowMenu(id, label, !isBlankValue(resolveFieldValue(row, id, schema)))
                    }}
                  >
                    <span className={cx('pgpreview-insp-label', text.caption.standard)}>
                      <Icon name={icon} size={12} />
                      {label}
                    </span>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix */}
                    <span
                      className="pgpreview-insp-value"
                      onClick={(e) => {
                        if (def) return editRow(def, e.currentTarget)
                        triggerRef.current = e.currentTarget
                        setEditing({ id, mode: 'picker' })
                      }}
                    >
                      {editing?.id === id && editing.mode === 'editor' && def ? (
                        <PropertyEditor
                          initial={(() => {
                            const v = resolveFieldValue(row, id, schema)
                            if (v.kind === 'number') return String(v.value)
                            if (v.kind === 'url') return parseLink(v.value).url
                            return ''
                          })()}
                          numeric={def.type === 'number'}
                          validate={def.type === 'url' ? isValidLink : undefined}
                          onCommit={(raw) => {
                            // url validates/normalizes and rides the existing alias along —
                            // identical to the cell surfaces.
                            const cur = resolveFieldValue(row, id, schema)
                            const next =
                              def.type === 'url'
                                ? urlValueFromEdit(
                                    raw.trim(),
                                    cur.kind === 'url' ? cur.value : undefined,
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
                          style: { look: 'pill' },
                        }) ?? <span className="pgpreview-insp-empty">—</span>)
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          ),
        )}
        {(contextRows.some((t) => !isAssigned(t.id)) || schema.some((d) => !isAssigned(d.id))) && (
          <button
            type="button"
            ref={addRef}
            className={cx('pgpreview-insp-add', text.footnote.standard)}
            onClick={() => setAddOpen(true)}
          >
            <Icon name="plus" size={11} />
            <span>Add Property</span>
          </button>
        )}
      </div>
      {addOpen && (
        <PickerMenu
          solid
          open
          onDismiss={() => setAddOpen(false)}
          triggerRef={addRef}
          origin="center"
        >
          {contextRows
            .filter((t) => !isAssigned(t.id))
            .map((t) => (
              <PickerOption
                key={t.id}
                leading={<Icon name={t.icon} size={13} />}
                onClick={() => revealAndEdit(t.id)}
              >
                {t.label}
              </PickerOption>
            ))}
          {schema
            .filter((d) => !isAssigned(d.id))
            .map((d) => (
              <PickerOption
                key={d.id}
                leading={<Icon name={propertyIcon(d)} size={13} />}
                onClick={() => revealAndEdit(d.id, d)}
              >
                {d.name}
              </PickerOption>
            ))}
        </PickerMenu>
      )}
      {editingDef && editing?.mode === 'picker' && (
        <PropertyPicker
          def={editingDef}
          current={resolveFieldValue(row, editing.id, schema)}
          open
          triggerRef={triggerRef}
          {...(editingDef.type === 'context' && tree
            ? { contextOptions: contextOptionsFor(editing.id, tree) }
            : {})}
          onCommit={(v) => {
            if (isContextRow(editing.id))
              commitContext(editing.id, v?.kind === 'context' ? v.value : [])
            else commitValue(editing.id, v)
          }}
          onDismiss={closeEditing}
        />
      )}
      {editing?.mode === 'date' && (
        <PickerMenu solid open onDismiss={closeEditing} triggerRef={triggerRef}>
          <DatetimeValuePicker
            value={resolveFieldValue(row, editing.id, schema)}
            onCommit={(v) => commitValue(editing.id, v)}
          />
        </PickerMenu>
      )}
    </div>
  )
}
