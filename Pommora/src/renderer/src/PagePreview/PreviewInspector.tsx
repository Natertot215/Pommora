import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import { isBlankValue, propertyKey, type PropertyValue } from '@shared/propertyValue'
import type { PageFrontmatter } from '@shared/schemas'
import type { ResolvedColumn } from '@shared/types'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { text } from '@renderer/design-system/tokens'
import { PickerMenu, PickerOption } from '@renderer/design-system/components/PickerMenu'
import { Cell } from '../Detail/Views/Table/Cell'
import { contextOptionsFor } from '../Detail/Views/pipeline/contextOptions'
import { PropertyEditor } from '../Detail/Views/PropertyEditing/PropertyEditor'
import { parseEditorValue } from '../Detail/Views/Cards/cardValueInput'
import { linkAlias, linkEditText, urlValueFromEdit, urlValueFromRename } from '@shared/linkValue'
import { resolveTitle, validateLink } from '@renderer/linkResolve'
import { linkValueMenuTarget, showConnectionMenu } from '@renderer/Embeds/connectionMenu'
import { TextPicker } from '@renderer/design-system/components/TextPicker'
import { solidColorCss } from '@renderer/Detail/Views/Table/solidColor'
import { PropertyPicker, syntheticContextDef } from '../Detail/Views/PropertyEditing/PropertyPicker'
import { DatetimeValuePicker } from '../Detail/Views/PropertyEditing/DatetimeValuePicker'
import { resolveFieldValue } from '../Detail/Views/pipeline/value'
import { fetchPageDetail, readPageDetail } from '../Tabs/warmCache'
import {
  propertyIcon,
  usePropertyRows,
  type Editing,
} from '../Detail/Views/PropertyEditing/usePropertyRows'
import { useSession, type PreviewTarget } from '../store'

// Editable through the SAME primitives the table views use (Cell render, PropertyPicker/
// CalendarPicker, PropertyEditor). Writes ride the table's optimistic-patch pattern; the reconcile
// re-paths the open tab on rename.

export function PreviewInspector({ target }: { target: PreviewTarget }): React.JSX.Element {
  const tree = useSession((s) => s.tree)
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
  } = usePropertyRows(page, fm, setFm)

  // A row shows when it holds a real value OR was assigned this session (session-only — disk
  // never carries an empty key). Contexts included — nothing pre-shows here.
  //
  // A standing design decision, not drift: the Settings pane's Properties leaf deliberately keeps
  // every Context slot open until one is set aside. That surface is where a Page gets filed; this
  // one reads a page you are looking past, so it shows only what the page actually holds.
  const isAssigned = (id: string): boolean => {
    if (revealed.has(id)) return true
    if (isContextRow(id)) return (contextValues?.[id]?.length ?? 0) > 0
    const def = schema.find((d) => d.id === id)
    return def
      ? (fm as Record<string, unknown> | undefined)?.[propertyKey(def)] !== undefined
      : false
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

  // Revealing a row and then editing it is the ORDINARY click one frame later — the row mounts
  // next frame, so its value field can only be anchored to after paint. It routes through the same
  // `editRow` every other click takes, so a new type is taught to one place. A Context row carries no def and opens its own picker.
  const revealAndEdit = (id: string, def?: PropertyDefinition): void => {
    setAddOpen(false)
    setRevealed((prev) => new Set([...prev, id]))
    requestAnimationFrame(() => {
      const el =
        document.querySelector<HTMLElement>(`[data-insp-id="${id}"] .pgpreview-insp-value`) ??
        addRef.current
      if (def && el) return editRow(def, el)
      triggerRef.current = el
      setEditing({ id, mode: 'picker' })
    })
  }

  if (!ctx || !row || !fm) return <div className="pgpreview-insp" />

  // The same native menu the page's own properties pane pops: Clear empties the value and leaves
  // the row to be refilled, Remove empties it and takes the row away, back into Add Property.
  const emptyRow = (id: string, keep: boolean): void => {
    if (isContextRow(id)) commitContext(id, [])
    else commitValue(id, null)
    if (keep) setRevealed((prev) => new Set([...prev, id]))
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
  const rawLinkOf = (id: string): string => {
    const v = resolveFieldValue(row, id, schema)
    return v.kind === 'url' ? v.value : ''
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
                      void rowMenu(id, label, resolveFieldValue(row, id, schema))
                    }}
                  >
                    <span className={cx('pgpreview-insp-label', text.caption.standard)}>
                      <Icon name={icon} size="control" />
                      {label}
                    </span>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix */}
                    <span
                      className="pgpreview-insp-value"
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
                          style: { look: 'pill' },
                          // The chip's hover × hands back what survives it — a Context keeps its
                          // remaining Spaces, a property its remaining options.
                          remove: def
                            ? (next) => commitValue(id, next)
                            : (next) =>
                                commitContext(id, next?.kind === 'context' ? next.value : []),
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
            <Icon name="plus" size="caption" />
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
        {contextRows
          .filter((t) => !isAssigned(t.id))
          .map((t) => (
            <PickerOption
              key={t.id}
              leading={<Icon name={t.icon} size="body" />}
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
              leading={<Icon name={propertyIcon(d)} size="body" />}
              onClick={() => revealAndEdit(d.id, d)}
            >
              {d.name}
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
    </div>
  )
}
