import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import type { PropertyValue } from '@shared/propertyValue'
import { applyPropertyValue } from '@shared/propertyValue'
import type { PageFrontmatter } from '@shared/schemas'
import type { NexusTree, ResolvedColumn, ViewRow } from '@shared/types'
import { cx } from '@renderer/design-system/cx'
import { asRenderableIcon, defaultEntityIcon, Icon } from '@renderer/design-system/symbols'
import { propertyTypeIconName } from '../Components/Detail/PropertyTypes'
import { text } from '@renderer/design-system/tokens'
import { PickerMenu, PickerOption } from '@renderer/design-system/components/PickerMenu'
import { MenuItem } from '@renderer/design-system/components/menu'
import { iconOption } from '../Components/Detail/pickerControl.css'
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
import { parseLink, urlValueFromEdit } from '../Detail/Views/Table/linkValue'
import { PropertyPicker, syntheticContextDef } from '../Detail/Views/PropertyEditing/PropertyPicker'
import { DatetimeValuePicker } from '../Detail/Views/PropertyEditing/DatetimeValuePicker'
import { resolveFieldValue } from '../Detail/Views/pipeline/value'
import { isValidLink } from '@shared/links'
import { contextKey, type ContextsRegistry } from '@shared/contexts'
import { resolveContextKeys } from '@shared/contextResolve'
import { useSession, type PreviewTarget } from '../store'

// The front-matter inspector: the preview page's title, banner, Context columns, and
// schema properties — listed and editable through the SAME primitives the table views edit with
// (Cell render, PropertyPicker/CalendarPicker portals, the inline PropertyEditor). Writes go through
// mutate with the table's optimistic-patch pattern; the reconcile re-paths the open tab on rename.

/** The page's owning Collection by path prefix — schema lives only on Collections. */
const schemaForPage = (tree: NexusTree | null, path: string): PropertyDefinition[] => {
  if (!tree) return []
  const all = [...tree.collections, ...tree.userSections.flatMap((s) => s.collections)]
  return all.find((c) => path.startsWith(`${c.path}/`))?.properties ?? []
}

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
  // Right-click a property row → the remove menu (un-assigns: the key deletes from frontmatter).
  const [rowMenu, setRowMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const rowMenuRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let live = true
    setFm(null)
    setEditing(null)
    void window.nexus.openPage(target.path).then((r) => {
      if (!live || !r.ok) return
      setFm(r.page.frontmatter as PageFrontmatter)
      setTitle(r.page.title)
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
  // The registry rows + the same shared resolution the walk runs — bracketed frontmatter
  // keys resolve to Space ids against the live tree.
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

  // The assign-reveal flow, one behavior for contexts AND properties: a row shows when
  // it holds a real value OR was assigned this session via + Add Property (session-only —
  // disk never carries an empty key).
  const isAssigned = (id: string): boolean => {
    if (revealed.has(id)) return true
    if (contextRows.some((c) => c.id === id)) return (contextValues?.[id]?.length ?? 0) > 0
    return fm?.properties?.[id] !== undefined
  }

  const closeEditing = (): void => setEditing(null)

  const commitValue = (propertyId: string, value: PropertyValue | null): void => {
    setFm((prev) =>
      prev ? { ...prev, properties: applyPropertyValue(prev.properties, propertyId, value) } : prev,
    )
    void mutate({ op: 'setProperty', path: target.path, propertyId, value })
  }
  const commitContext = (contextId: string, ids: string[]): void => {
    // Optimistic: patch the bracketed key with titles off the live tree (main re-resolves
    // authoritatively at the write boundary).
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
    // The shared click semantics (toggle/picker/datetime — a checkbox is true-or-absent on disk,
    // never a stored false) live in one router; the inspector's tail keeps number/url inline.
    const v = row ? resolveFieldValue(row, def.id, schema) : ({ kind: 'null' } as const)
    const shared = sharedValueClickAction(def.type, undefined, v, def)
    if (shared) {
      if (shared.kind === 'commit') {
        commitValue(def.id, shared.value)
        // Un-checking clears the key on disk (true-or-absent — never a stored false), which
        // would also un-assign the row: keep it revealed this session so the box can be
        // re-checked; the next preview open hides it like any other empty property.
        if (def.type === 'checkbox' && shared.value === null)
          setRevealed((prev) => new Set([...prev, def.id]))
      } else setEditing({ id: def.id, mode: shared.kind === 'datetime' ? 'date' : 'picker' })
      return
    }
    if (def.type === 'number' || def.type === 'url') setEditing({ id: def.id, mode: 'editor' })
  }

  // The Add picker's shared landing: reveal the row, then open its editor anchored to the value
  // field on the right (the row mounts next frame). A Context column passes no def — it opens the context
  // picker; a checkbox commits true directly and needs no editor.
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
  const editingDef =
    editing &&
    (schema.find((d) => d.id === editing.id) ??
      (isContextRow(editing.id) ? syntheticContextDef(editing.id) : undefined))

  return (
    <div className="pgpreview-insp">
      <div className="pgpreview-insp-rows edge-fade">
        {/* The Swift layout: two rounded fill fields — contexts, then properties — each rendered
            only once something's assigned into it. Nothing pre-shows: on an empty page the Add
            affordance alone sits at the top (the Obsidian read). */}
        {[
          contextRows.filter((t) => isAssigned(t.id)).map((t) => ({ def: null, ...t })),
          schema.filter((d) => isAssigned(d.id)).map((d) => ({ def: d, id: d.id, label: d.name })),
        ].map((group, gi) =>
          group.length === 0 ? null : (
            <div key={gi === 0 ? 'contexts' : 'properties'} className="pgpreview-insp-group">
              {group.map(({ def, id, label }) => {
                const col: ResolvedColumn = { id, kind: def ? 'property' : 'context' }
                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
                  <div
                    key={id}
                    className="pgpreview-insp-row"
                    data-insp-id={id}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setRowMenu({ id, x: e.clientX, y: e.clientY })
                    }}
                  >
                    <span className={cx('pgpreview-insp-label', text.caption.standard)}>
                      <Icon
                        name={
                          def
                            ? (asRenderableIcon(def.icon) ??
                              propertyTypeIconName(def.type) ??
                              'tag')
                            : (asRenderableIcon(contextRows.find((c) => c.id === id)?.icon) ??
                              defaultEntityIcon('space'))
                        }
                        size={12}
                      />
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
                            // The shared parser: number NaN-gates, url validates/normalizes and
                            // rides the existing alias along — identical to the cell surfaces.
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
      {rowMenu && (
        <>
          <span
            ref={rowMenuRef}
            aria-hidden
            style={{ position: 'fixed', left: rowMenu.x, top: rowMenu.y, width: 0, height: 0 }}
          />
          <PickerMenu
            solid
            open
            onDismiss={() => setRowMenu(null)}
            triggerRef={rowMenuRef}
            origin="center"
          >
            <div className="nav-row-menu">
              <MenuItem
                leading={<Icon name="x" size={13} />}
                onClick={() => {
                  if (isContextRow(rowMenu.id)) commitContext(rowMenu.id, [])
                  else commitValue(rowMenu.id, null)
                  setRevealed((prev) => new Set([...prev].filter((r) => r !== rowMenu.id)))
                  setRowMenu(null)
                }}
              >
                {isContextRow(rowMenu.id) ? 'Remove Context' : 'Remove Property'}
              </MenuItem>
            </div>
          </PickerMenu>
        </>
      )}
      {addOpen && (
        <PickerMenu
          solid
          open
          onDismiss={() => setAddOpen(false)}
          triggerRef={addRef}
          origin="center"
        >
          {/* The grouping pane's picker verbatim — PickerOption rows with the icon treatment.
              Unassigned Context columns lead (contexts add from here too), unassigned properties follow. */}
          {contextRows
            .filter((t) => !isAssigned(t.id))
            .map((t) => (
              <PickerOption key={t.id} onClick={() => revealAndEdit(t.id)}>
                <span className={iconOption}>
                  <Icon name={asRenderableIcon(t.icon) ?? defaultEntityIcon('space')} size={13} />
                  {t.label}
                </span>
              </PickerOption>
            ))}
          {schema
            .filter((d) => !isAssigned(d.id))
            .map((d) => (
              <PickerOption key={d.id} onClick={() => revealAndEdit(d.id, d)}>
                <span className={iconOption}>
                  <Icon
                    name={asRenderableIcon(d.icon) ?? propertyTypeIconName(d.type) ?? 'tag'}
                    size={13}
                  />
                  {d.name}
                </span>
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
