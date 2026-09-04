import { EmptyValue } from '@renderer/DesignSystem/Elements/EmptyValue/EmptyValue'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import type { PropertyDefinition } from '@shared/properties'
import { isBlankValue, type PropertyValue } from '@shared/propertyValue'
import type { PageFrontmatter } from '@shared/schemas'
import type { ResolvedColumn } from '@shared/types'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { PickerMenu, PickerRow } from '@renderer/DesignSystem/Pickers/picker-base'
import { MenuTopRow, MenuScrollFrame } from '@renderer/DesignSystem/Menus'
import { Cell } from '@renderer/Properties/Assignment/Cell'
import { linkEditText, urlValueFromEdit } from '@shared/linkValue'
import { resolveTitle, validateLink } from '@renderer/Actions/linkResolve'
import { resolveFieldValue } from '@renderer/Properties/value'
import { PropertyEditor } from '@renderer/Properties/Assignment/PropertyEditor'
import { PropertyValueEditors } from '@renderer/Properties/Assignment/PropertyValueEditors'
import { parseEditorValue } from '@renderer/Properties/Assignment/cardValueInput'
import { side } from '@renderer/DesignSystem/Menus/menu-base.css'
import { usePropertyRows, type Editing } from '@renderer/Properties/Assignment/usePropertyRows'
import { propertyIcon } from '@renderer/Properties/PropertyTypes'
import { Reveal, useEntrance } from '@renderer/Animation'
import { shownDetail, useSession } from '../store'
import * as s from './page-properties.css'
import {
  displayPropertyName,
  useCapitalizeMetadata,
} from '@renderer/Properties/Assignment/columnLabel'

type Field = { id: string; label: string; icon: string; def: PropertyDefinition | null }

export function PageProperties({ onBack }: { onBack: () => void }): React.JSX.Element {
  const capitalize = useCapitalizeMetadata()
  const pageDetail = useSession(shownDetail)
  const tree = useSession((st) => st.tree)
  const [editing, setEditing] = useState<Editing>(null)
  const [addOpen, setAddOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const addRef = useRef<HTMLButtonElement | null>(null)

  const stored = pageDetail?.frontmatter
  const [fm, setFm] = useState<PageFrontmatter | null>(null)
  useEffect(() => setFm((stored ?? null) as PageFrontmatter | null), [stored])

  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
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
    valueMenu: valueMenuShared,
    contextRows,
  } = usePropertyRows(page, fm, setFm)
  const isShown = (def: PropertyDefinition): boolean =>
    revealed.has(def.id) || (fm as Record<string, unknown> | null)?.[def.name] !== undefined
  const groups: [string, Field[]][] = [
    ['contexts', contextRows.filter((t) => !setAside.has(t.id)).map((t) => ({ ...t, def: null }))],
    [
      'properties',
      schema.filter(isShown).map((d) => ({
        id: d.id,
        label: displayPropertyName(d.name, capitalize),
        icon: propertyIcon(d),
        def: d,
      })),
    ],
  ]
  const entering = useEntrance(
    groups.flatMap(([, group]) => group),
    (f) => f.id,
    fm !== null,
  )

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

  const emptyRow = (id: string, keep: boolean): void => {
    const context = isContextRow(id)
    if (context) commitContext(id, [])
    else commitValue(id, null)
    if (keep) {
      if (!context) reveal(id)
      return
    }
    if (context) setSetAside((prev) => new Set([...prev, id]))
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

  const header = <MenuTopRow label="Settings" current="Properties" onBack={onBack} />
  const frame = (body: React.ReactNode): React.JSX.Element => (
    <div className={s.frame}>
      <MenuScrollFrame header={header}>{body}</MenuScrollFrame>
    </div>
  )
  if (!ctx || !row || !fm) return frame(null)

  const hiddenProps = schema.filter((d) => !isShown(d))
  const hiddenContexts = contextRows.filter((t) => setAside.has(t.id))

  return frame(
    <>
      <div className={s.rows}>
        {groups.map(([key, group]) =>
          group.length === 0 ? null : (
            <div key={key} className={s.group}>
              {group.map(({ def, id, label, icon }) => {
                const column: ResolvedColumn = { id, kind: def ? 'property' : 'context' }
                return (
                  <Reveal key={id} open enterOnMount={entering(id)} fill>
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
                    <div
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
                            style: { look: 'standard' },
                            remove: def
                              ? (next) => commitValue(id, next)
                              : (next) =>
                                  commitContext(id, next?.kind === 'context' ? next.value : []),
                          }) ?? <EmptyValue className={s.empty} />)
                        )}
                      </span>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          ),
        )}
        {(hiddenProps.length > 0 || hiddenContexts.length > 0) && (
          <Button
            ref={addRef}
            size="button-inline"
            icon="plus"
            iconSize="control"
            label="Add Property"
            className={s.add}
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
        {hiddenContexts.map((t) => (
          <PickerRow
            key={t.id}
            leading={<Icon name={t.icon} size="body" />}
            onClick={() => {
              setAddOpen(false)
              setSetAside((prev) => new Set([...prev].filter((r) => r !== t.id)))
            }}
          >
            {t.label}
          </PickerRow>
        ))}
        {hiddenProps.map((def) => (
          <PickerRow
            key={def.id}
            leading={<Icon name={propertyIcon(def)} size="body" />}
            onClick={() => revealAndEdit(def)}
          >
            {displayPropertyName(def.name, capitalize)}
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
    </>,
  )
}
