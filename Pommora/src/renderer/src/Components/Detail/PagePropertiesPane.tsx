import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import { isBlankValue, propertyKey, type PropertyValue } from '@shared/propertyValue'
import type { PageFrontmatter } from '@shared/schemas'
import type { ResolvedColumn } from '@shared/types'
import { Icon } from '@renderer/design-system/symbols'
import { PickerMenu, PickerOption } from '@renderer/design-system/components/PickerMenu'
import { MenuPaneTopRow, MenuScrollFrame } from '../../design-system/components/menu'
import { Cell } from '../../Detail/Views/Table/Cell'
import { linkAlias, linkEditText, urlValueFromEdit, urlValueFromRename } from '@shared/linkValue'
import { resolveTitle, validateLink } from '@renderer/linkResolve'
import { linkValueMenuTarget, showConnectionMenu } from '@renderer/Embeds/connectionMenu'
import { TextPicker } from '@renderer/design-system/components/TextPicker'
import { solidColorCss } from '@renderer/Detail/Views/Table/solidColor'
import { contextOptionsFor } from '../../Detail/Views/pipeline/contextOptions'
import { resolveFieldValue } from '../../Detail/Views/pipeline/value'
import { PropertyEditor } from '../../Detail/Views/PropertyEditing/PropertyEditor'
import {
  PropertyPicker,
  syntheticContextDef,
} from '../../Detail/Views/PropertyEditing/PropertyPicker'
import { DatetimeValuePicker } from '../../Detail/Views/PropertyEditing/DatetimeValuePicker'
import { parseEditorValue } from '../../Detail/Views/Cards/cardValueInput'
import { side } from '../../design-system/components/menu/menu.css'
import {
  propertyIcon,
  usePropertyRows,
  type Editing,
} from '../../Detail/Views/PropertyEditing/usePropertyRows'
import { useSession } from '../../store'
import * as s from './pageProperties.css'

/** A row in either field block, its glyph already resolved — a Context carries no `def`. */
type Field = { id: string; label: string; icon: string; def: PropertyDefinition | null }

/**
 * The Page's values, as the Settings dropdown's Properties leaf: Contexts in one field block,
 * properties in the next. Every value is entered through the same primitives the table, cards, and
 * preview inspector use, so this surface adds a shape, never a second way to write.
 */
export function PagePropertiesPane({ onBack }: { onBack: () => void }): React.JSX.Element {
  const pageDetail = useSession((st) => st.pageDetail)
  const tree = useSession((st) => st.tree)
  const [editing, setEditing] = useState<Editing>(null)
  const [addOpen, setAddOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const addRef = useRef<HTMLButtonElement | null>(null)

  const stored = pageDetail?.frontmatter
  // The optimistic overlay: a write patches here for the frame, and the reloaded page overwrites it
  // the moment main answers — so the surface is never the authority on what's on disk.
  const [fm, setFm] = useState<PageFrontmatter | null>(null)
  useEffect(() => setFm((stored ?? null) as PageFrontmatter | null), [stored])

  // A property with no key still shows once it's been added this session — session-only, because
  // an empty row holds nothing on disk and that is what keeps an untouched Page untouched.
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  // Contexts are the mirror: they open as standing slots, and Remove sets one aside for the session
  // until Add Property offers it back. Both sets are session-only — an empty row holds nothing on
  // disk, which is what keeps an untouched Page untouched.
  const [setAside, setSetAside] = useState<ReadonlySet<string>>(new Set())
  // Keyed on the NEXUS, not the tree: both sets are about this session's reading of this nexus, and
  // a tree push means only that something on disk moved. Assigning a Space writes contextValues,
  // which IS tree data — so keying on tree identity tore down the multi-toggle Context picker on
  // the very pick that opened it.
  const nexusId = tree?.nexus.id
  useEffect(() => {
    setEditing(null)
    setRevealed(new Set())
    setSetAside(new Set())
  }, [nexusId])

  const page = useMemo(
    () =>
      pageDetail ? { id: pageDetail.id, title: pageDetail.title, path: pageDetail.path } : null,
    [pageDetail],
  )
  const {
    schema,
    ctx,
    row,
    isContextRow,
    commitValue,
    commitContext,
    editRow: editRowShared,
    contextRows,
  } = usePropertyRows(page, fm, setFm)
  const reveal = (id: string): void => setRevealed((prev) => new Set([...prev, id]))
  const editRow = (def: PropertyDefinition, el: HTMLElement, from?: EventTarget | null): void =>
    editRowShared(
      def,
      el,
      {
        setTrigger: (t) => {
          triggerRef.current = t
        },
        setEditing,
        onReveal: reveal,
      },
      from,
    )

  // Clear empties the value and leaves the row to be refilled; Remove empties it and takes the row
  // away, back into Add Property. Whether a row counts as filled is the house predicate's call — an
  // empty multi-select or context array holds a value shape but nothing to clear.
  const emptyRow = (id: string, keep: boolean): void => {
    const context = isContextRow(id)
    if (context) commitContext(id, [])
    else commitValue(id, null)
    if (keep) {
      // Emptying a value deletes its key, so a property row would stop being shown by the value it
      // no longer holds. Revealing it is what keeps Clear a different act from Remove.
      if (!context) reveal(id)
      return
    }
    if (context) setSetAside((prev) => new Set([...prev, id]))
    else setRevealed((prev) => new Set([...prev].filter((r) => r !== id)))
  }
  // The VALUE's own menu: a live link pops the link menu — the same one every other surface pops on
  // the same link — closing on Clear alone. Remove belongs to the property rather than to the value
  // it holds, so it stays on the row's menu and is reached by right-clicking the property itself.
  const valueMenu = (id: string, value: PropertyValue): boolean => {
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
  const rowMenu = async (id: string, name: string, value: PropertyValue): Promise<void> => {
    const action = await window.nexus.propertyMenu({
      kind: 'page-value',
      name,
      filled: !isBlankValue(value),
    })
    if (action === 'value:clear' || action === 'value:remove')
      emptyRow(id, action === 'value:clear')
  }

  // Revealing a row and then editing it is the ORDINARY click one frame later — the row mounts
  // next frame, so its value field can only be anchored to after paint. It routes through the same
  // `editRow` every other click takes, so a new type is taught to one place.
  const revealAndEdit = (def: PropertyDefinition): void => {
    setAddOpen(false)
    reveal(def.id)
    requestAnimationFrame(() => {
      const el =
        document.querySelector<HTMLElement>(`[data-page-prop="${def.id}"] .${s.value}`) ??
        addRef.current
      if (el) editRow(def, el)
    })
  }

  const header = <MenuPaneTopRow label="Settings" current="Properties" onBack={onBack} />
  const frame = (body: React.ReactNode): React.JSX.Element => (
    <div className={s.pane}>
      <MenuScrollFrame header={header}>{body}</MenuScrollFrame>
    </div>
  )
  if (!ctx || !row || !fm) return frame(null)

  const rawLinkOf = (id: string): string => {
    const v = resolveFieldValue(row, id, schema)
    return v.kind === 'url' ? v.value : ''
  }
  const editingDef =
    editing &&
    (schema.find((d) => d.id === editing.id) ??
      (isContextRow(editing.id) ? syntheticContextDef(editing.id) : undefined))

  // A property shows once it holds a key or was added this session; a Context shows unless it was
  // set aside, so a Page states what it could be filed under before it is.
  //
  // That Context rule is a standing design decision, not drift: the preview inspector deliberately
  // shows a Context only once it holds a value. This surface is where a Page gets filed, so its
  // slots stand open; the inspector reads a page you are looking past, so it stays quiet.
  const isShown = (def: PropertyDefinition): boolean =>
    revealed.has(def.id) || (fm as Record<string, unknown>)[propertyKey(def)] !== undefined
  const hiddenProps = schema.filter((d) => !isShown(d))
  const hiddenContexts = contextRows.filter((t) => setAside.has(t.id))

  const groups: [string, Field[]][] = [
    ['contexts', contextRows.filter((t) => !setAside.has(t.id)).map((t) => ({ ...t, def: null }))],
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
                      void rowMenu(id, label, resolveFieldValue(row, id, schema))
                    }}
                  >
                    <span className={side}>
                      <Icon name={icon} size="control" />
                    </span>
                    <span className={s.label}>{label}</span>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix */}
                    <span
                      className={s.value}
                      onContextMenu={(e) => {
                        if (!valueMenu(id, resolveFieldValue(row, id, schema))) return
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
            <Icon name="plus" size="control" />
            <span>Add Property</span>
          </button>
        )}
      </div>
      <PickerMenu
        solid
        open={addOpen}
        onDismiss={() => setAddOpen(false)}
        triggerRef={addRef}
        origin="center"
      >
        {hiddenContexts.map((t) => (
          <PickerOption
            key={t.id}
            leading={<Icon name={t.icon} size="body" />}
            onClick={() => {
              setAddOpen(false)
              setSetAside((prev) => new Set([...prev].filter((r) => r !== t.id)))
            }}
          >
            {t.label}
          </PickerOption>
        ))}
        {hiddenProps.map((def) => (
          <PickerOption
            key={def.id}
            leading={<Icon name={propertyIcon(def)} size="body" />}
            onClick={() => revealAndEdit(def)}
          >
            {def.name}
          </PickerOption>
        ))}
      </PickerMenu>
      {editing?.mode === 'rename' && (
        <TextPicker
          open
          triggerRef={triggerRef}
          value={linkAlias(rawLinkOf(editing.id)) ?? ''}
          accent={solidColorCss(schema.find((d) => d.id === editing.id)?.link_color)}
          onCommit={(alias) => {
            commitValue(editing.id, urlValueFromRename(alias, rawLinkOf(editing.id)))
            setEditing(null)
          }}
          onDismiss={() => setEditing(null)}
        />
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
      <PickerMenu
        solid
        open={editing?.mode === 'date'}
        onDismiss={() => setEditing(null)}
        triggerRef={triggerRef}
      >
        {editing?.mode === 'date' && (
          <DatetimeValuePicker
            value={resolveFieldValue(row, editing.id, schema)}
            onCommit={(v) => commitValue(editing.id, v)}
          />
        )}
      </PickerMenu>
    </>,
  )
}
