import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import type { PropertyValue } from '@shared/propertyValue'
import { applyValueAtRoot, isBlankValue, propertyKey } from '@shared/propertyValue'
import type { PageFrontmatter } from '@shared/schemas'
import type { NexusTree, ResolvedColumn, ViewRow } from '@shared/types'
import { contextKey, type ContextsRegistry } from '@shared/contexts'
import { resolveContextKeys } from '@shared/contextResolve'
import { isValidLink } from '@shared/links'
import { asRenderableIcon, entityIcon, Icon } from '@renderer/design-system/symbols'
import { PickerMenu, PickerOption } from '@renderer/design-system/components/PickerMenu'
import { MenuPaneTopRow, MenuScrollFrame } from '../../design-system/components/menu'
import { Cell } from '../../Detail/Views/Table/Cell'
import { buildResolveContext, type ResolveContext } from '../../Detail/Views/Table/resolveContext'
import { parseLink, urlValueFromEdit } from '../../Detail/Views/Table/linkValue'
import { contextOptionsFor } from '../../Detail/Views/pipeline/contextOptions'
import {
  contextIdentityOf,
  contextIdsOf,
  spaceIdentityOf,
} from '../../Detail/Views/pipeline/contextIdentity'
import { resolveFieldValue } from '../../Detail/Views/pipeline/value'
import { PropertyEditor } from '../../Detail/Views/PropertyEditing/PropertyEditor'
import { sharedValueClickAction } from '../../Detail/Views/PropertyEditing/valueClick'
import {
  PropertyPicker,
  syntheticContextDef,
} from '../../Detail/Views/PropertyEditing/PropertyPicker'
import { DatetimeValuePicker } from '../../Detail/Views/PropertyEditing/DatetimeValuePicker'
import { parseEditorValue } from '../../Detail/Views/Cards/cardValueInput'
import { side } from '../../design-system/components/menu/menu.css'
import { propertyTypeIconName } from './PropertyTypes'
import { iconOption } from '@renderer/design-system/components/PickerMenu/pickerMenu.css'
import { useSession } from '../../store'
import * as s from './pageProperties.css'

/** Schema lives only on Collections, and a Page's owner is the Collection its path sits under. */
const schemaForPage = (tree: NexusTree | null, path: string): PropertyDefinition[] =>
  tree?.collections.find((col) => path.startsWith(`${col.path}/`))?.properties ?? []

type Editing = { id: string; mode: 'picker' | 'editor' | 'date' } | null

/** A row in either field block, its glyph already resolved — a Context carries no `def`. */
type Field = { id: string; label: string; icon: string; def: PropertyDefinition | null }

const propertyIcon = (def: PropertyDefinition): string =>
  asRenderableIcon(def.icon) ?? propertyTypeIconName(def.type) ?? 'tag'

/**
 * The Page's values, as the Settings dropdown's Properties leaf: Contexts in one field block,
 * properties in the next. Every value is entered through the same primitives the table, cards, and
 * preview inspector use, so this surface adds a shape, never a second way to write.
 */
export function PagePropertiesPane({ onBack }: { onBack: () => void }): React.JSX.Element {
  const pageDetail = useSession((st) => st.pageDetail)
  const tree = useSession((st) => st.tree)
  const mutate = useSession((st) => st.mutate)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const [editing, setEditing] = useState<Editing>(null)
  const [addOpen, setAddOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const addRef = useRef<HTMLButtonElement | null>(null)

  const path = pageDetail?.path ?? ''
  const stored = pageDetail?.frontmatter
  // The optimistic overlay: a write patches here for the frame, and the reloaded page overwrites it
  // the moment main answers — so the surface is never the authority on what's on disk.
  const [fm, setFm] = useState<PageFrontmatter | null>(null)
  useEffect(() => setFm((stored ?? null) as PageFrontmatter | null), [stored])

  const contextRows = useMemo(
    () =>
      contextIdsOf(tree).flatMap((id) => {
        const identity = contextIdentityOf(tree, id)
        return identity ? [{ id, label: identity.title, icon: identity.icon }] : []
      }),
    [tree],
  )
  // A property with no key still shows once it's been added this session — session-only, because
  // an empty row holds nothing on disk and that is what keeps an untouched Page untouched.
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  // Contexts are the mirror: they open as standing slots, and Remove sets one aside for the session
  // until Add Property offers it back. Both sets are session-only — an empty row holds nothing on
  // disk, which is what keeps an untouched Page untouched.
  const [setAside, setSetAside] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    setEditing(null)
    setRevealed(new Set())
    setSetAside(new Set())
  }, [tree])

  const schema = useMemo(() => schemaForPage(tree, path), [tree, path])
  const ctx = useMemo<ResolveContext | null>(
    () => (tree ? buildResolveContext(tree, schema) : null),
    [tree, schema],
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
      fm && pageDetail
        ? {
            id: pageDetail.id,
            title: pageDetail.title,
            icon: fm.icon,
            path: pageDetail.path,
            frontmatter: fm,
            contextValues,
          }
        : null,
    [fm, pageDetail, contextValues],
  )

  const isContextRow = (id: string): boolean => contextRows.some((t) => t.id === id)

  const commitValue = (propertyId: string, next: PropertyValue | null): void => {
    const def = schema.find((d) => d.id === propertyId)
    if (!def) return
    setFm((prev) =>
      prev ? (applyValueAtRoot(prev as Record<string, unknown>, def, next) as typeof prev) : prev,
    )
    void mutate({ op: 'setProperty', path, propertyId, value: next })
  }
  const commitContext = (contextId: string, ids: string[]): void => {
    const title = contextIdentityOf(tree, contextId)?.title
    if (title === undefined) return
    const titles = ids
      .map((sid) => spaceIdentityOf(tree, sid)?.title)
      .filter((t): t is string => t !== undefined)
    setFm((prev) => {
      if (!prev) return prev
      const next = { ...prev } as Record<string, unknown>
      if (titles.length) next[contextKey(title)] = titles
      else delete next[contextKey(title)]
      return next as PageFrontmatter
    })
    void mutate({ op: 'setContext', path, contextId, spaceIds: ids })
  }

  const editRow = (def: PropertyDefinition, el: HTMLElement): void => {
    triggerRef.current = el
    const current = row ? resolveFieldValue(row, def.id, schema) : ({ kind: 'null' } as const)
    const shared = sharedValueClickAction(def.type, undefined, current, def)
    if (shared) {
      if (shared.kind === 'commit') {
        commitValue(def.id, shared.value)
        // Un-checking clears the key, which would drop the row out from under the cursor — hold it
        // shown so the box can be re-checked without a trip back through Add Property.
        if (def.type === 'checkbox' && shared.value === null)
          setRevealed((prev) => new Set([...prev, def.id]))
      } else setEditing({ id: def.id, mode: shared.kind === 'datetime' ? 'date' : 'picker' })
      return
    }
    if (def.type === 'number' || def.type === 'url') setEditing({ id: def.id, mode: 'editor' })
  }

  // Clear empties the value and leaves the row to be refilled; Remove empties it and takes the row
  // away, back into Add Property. Whether a row counts as filled is the house predicate's call — an
  // empty multi-select or context array holds a value shape but nothing to clear.
  const rowMenu = async (id: string, name: string, filled: boolean): Promise<void> => {
    const action = await window.nexus.propertyMenu({ kind: 'page-value', name, filled })
    if (action !== 'value:clear' && action !== 'value:remove') return
    const context = isContextRow(id)
    if (context) commitContext(id, [])
    else commitValue(id, null)
    if (action !== 'value:remove') return
    if (context) setSetAside((prev) => new Set([...prev, id]))
    else setRevealed((prev) => new Set([...prev].filter((r) => r !== id)))
  }

  const revealAndEdit = (def: PropertyDefinition): void => {
    const id = def.id
    setAddOpen(false)
    setRevealed((prev) => new Set([...prev, id]))
    if (def.type === 'checkbox') {
      commitValue(id, { kind: 'checkbox', value: true })
      return
    }
    if (def.type === 'file' || def.type === 'last_edited_time') return
    // The row mounts next frame, so the picker can only anchor to its value field after paint.
    requestAnimationFrame(() => {
      triggerRef.current =
        document.querySelector<HTMLElement>(`[data-page-prop="${id}"] .${s.value}`) ??
        addRef.current
      if (def.type === 'datetime') setEditing({ id, mode: 'date' })
      else if (def.type === 'number' || def.type === 'url') setEditing({ id, mode: 'editor' })
      else setEditing({ id, mode: 'picker' })
    })
  }

  const header = <MenuPaneTopRow label="Settings" current="Properties" onBack={onBack} />
  const frame = (body: React.ReactNode): React.JSX.Element => (
    <div className={s.pane}>
      <MenuScrollFrame header={header}>{body}</MenuScrollFrame>
    </div>
  )
  if (!ctx || !row || !fm) return frame(null)

  const editingDef =
    editing &&
    (schema.find((d) => d.id === editing.id) ??
      (isContextRow(editing.id) ? syntheticContextDef(editing.id) : undefined))

  // A property shows once it holds a key or was added this session; a Context shows unless it was
  // set aside, so a Page states what it could be filed under before it is.
  const isShown = (def: PropertyDefinition): boolean =>
    revealed.has(def.id) || (fm as Record<string, unknown>)[propertyKey(def)] !== undefined
  const hiddenProps = schema.filter((d) => !isShown(d))
  const hiddenContexts = contextRows.filter((t) => setAside.has(t.id))
  const contextIcon = (own: unknown): string => entityIcon('space', own, defaultIcons)

  const groups: [string, Field[]][] = [
    [
      'contexts',
      contextRows
        .filter((t) => !setAside.has(t.id))
        .map((t) => ({ ...t, icon: contextIcon(t.icon), def: null })),
    ],
    [
      'properties',
      schema
        .filter(isShown)
        .map((d) => ({ id: d.id, label: d.name, icon: propertyIcon(d), def: d })),
    ],
  ]

  return frame(
    <>
      <div className={s.rows}>
        {groups.map(([key, group]) =>
          group.length === 0 ? null : (
            <div key={key} className={s.group}>
              {group.map(({ def, id, label, icon }) => {
                const column: ResolvedColumn = { id, kind: def ? 'property' : 'context' }
                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
                  <div
                    key={id}
                    className={s.row}
                    data-page-prop={id}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      void rowMenu(id, label, !isBlankValue(resolveFieldValue(row, id, schema)))
                    }}
                  >
                    <span className={side}>
                      <Icon name={icon} size="xs" />
                    </span>
                    <span className={s.label}>{label}</span>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix */}
                    <span
                      className={s.value}
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
                          column,
                          ctx,
                          hideIcon: false,
                          style: { look: 'pill' },
                          // The chip's hover × hands back what survives it — a Context keeps its
                          // remaining Spaces, a property its remaining options.
                          remove: def
                            ? (next) => commitValue(id, next)
                            : (next) =>
                                commitContext(id, next?.kind === 'context' ? next.value : []),
                        }) ?? <span className={s.empty}>—</span>)
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          ),
        )}
        {(hiddenProps.length > 0 || hiddenContexts.length > 0) && (
          <button type="button" ref={addRef} className={s.add} onClick={() => setAddOpen(true)}>
            <Icon name="plus" size="xs" />
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
          {hiddenContexts.map((t) => (
            <PickerOption
              key={t.id}
              onClick={() => {
                setAddOpen(false)
                setSetAside((prev) => new Set([...prev].filter((r) => r !== t.id)))
              }}
            >
              <span className={iconOption}>
                <Icon name={contextIcon(t.icon)} size={13} />
                {t.label}
              </span>
            </PickerOption>
          ))}
          {hiddenProps.map((def) => (
            <PickerOption key={def.id} onClick={() => revealAndEdit(def)}>
              <span className={iconOption}>
                <Icon name={propertyIcon(def)} size={13} />
                {def.name}
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
          onDismiss={() => setEditing(null)}
        />
      )}
      {editing?.mode === 'date' && (
        <PickerMenu solid open onDismiss={() => setEditing(null)} triggerRef={triggerRef}>
          <DatetimeValuePicker
            value={resolveFieldValue(row, editing.id, schema)}
            onCommit={(v) => commitValue(editing.id, v)}
          />
        </PickerMenu>
      )}
    </>,
  )
}
