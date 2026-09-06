import { EmptyValue } from '@pommora/uix/Elements/EmptyValue/EmptyValue'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { cx } from '@pommora/uix/Utilities/cx'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { PageDetail } from '@pommora/core/Pages/pageDetail'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { ResolvedColumn } from '@pommora/core/Views/viewRow'
import { Icon } from '@pommora/uix/Symbols'
import { PickerMenu, PickerRow } from '@pommora/uix/Pickers/picker-base'
import { MenuTopRow, MenuScrollFrame } from '@pommora/uix/Menus'
import { Cell } from '../Cells/Cell'
import { linkEditText, urlValueFromEdit } from '@pommora/core/Connections/linkValue'
import { resolveTitle, validateLink } from '../Cells/linkResolve'
import { resolveFieldValue } from '../value'
import { PropertyEditor } from '../Pickers/PropertyEditor'
import { PropertyValueEditors } from './PropertyValueEditors'
import { parseEditorValue } from '../parseEditorValue'
import { side } from '@pommora/uix/Menus/menu-base.css'
import { usePropertyRows, type Editing } from './usePropertyRows'
import { propertyIcon } from '../Cells/PropertyTypes'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { useSession } from '../../Session/store'
import type { WindowTarget } from '../../Session/store'
import { fetchPageDetail, readPageDetail } from '../../Session/pageDetailCache'
import * as s from './page-properties.css'
import { displayPropertyName, useCapitalizeMetadata } from '../Cells/columnLabel'
import { host } from '../../Platform/dialer'

type Field = { id: string; label: string; icon: string; def: PropertyDefinition | null }

/** The page variant reads the shown page's live detail; the panel variant addresses a window's own
 *  target and fetches it. Their Context rows differ in kind: set-aside there, assigned here. */
type Props =
  | { variant: 'page'; page: PageDetail; onBack: () => void }
  | { variant: 'panel'; page: WindowTarget }

const ROW_ATTR = { page: 'data-page-prop', panel: 'data-insp-id' } as const

export function PagePropertyRows(props: Props): React.JSX.Element {
  const { page, variant } = props
  const capitalize = useCapitalizeMetadata()
  const tree = useSession((st) => st.tree)
  const [editing, setEditing] = useState<Editing>(null)
  const [addOpen, setAddOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const addRef = useRef<HTMLButtonElement | null>(null)
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  const [setAside, setSetAside] = useState<ReadonlySet<string>>(new Set())
  const [fm, setFm] = useState<PageFrontmatter | null>(null)
  const [fetchedTitle, setFetchedTitle] = useState('')

  const stored = props.variant === 'page' ? props.page.frontmatter : null
  useEffect(() => {
    if (variant !== 'page') return
    setFm((stored ?? null) as PageFrontmatter | null)
  }, [variant, stored])

  useEffect(() => {
    if (variant !== 'panel') return
    setEditing(null)
    // The warm path-keyed detail slot first, so the page is fetched once per window; any frontmatter write drops the slot, so a hit is never staler than the page beside it.
    const cached = readPageDetail(page.path)
    if (cached) {
      setFm(cached.frontmatter as PageFrontmatter)
      setFetchedTitle(cached.title)
      return
    }
    let live = true
    setFm(null)
    void fetchPageDetail(page.path).then((detail) => {
      if (!live || !detail) return
      setFm(detail.frontmatter as PageFrontmatter)
      setFetchedTitle(detail.title)
    })
    return () => {
      live = false
    }
  }, [variant, page.path])

  // Keyed on the NEXUS, not the tree: assigning a Space writes contextValues, which IS tree data, so keying on tree identity tore down the multi-toggle Context picker on the very pick that opened it.
  const nexusId = tree?.nexus.id
  useEffect(() => {
    setEditing(null)
    setRevealed(new Set())
    setSetAside(new Set())
  }, [nexusId])

  const title = props.variant === 'page' ? props.page.title : fetchedTitle
  const rowsPage = useMemo(
    () => ({ id: page.id, title, path: page.path }),
    [page.id, page.path, title],
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
    contextValues,
  } = usePropertyRows(rowsPage, fm, setFm)

  const isShownProp = (def: PropertyDefinition): boolean =>
    revealed.has(def.id) || (fm as Record<string, unknown> | null)?.[def.name] !== undefined
  // A panel row shows when it holds a real value or was assigned this session — disk never carries an empty key.
  const isShownContext = (id: string): boolean =>
    variant === 'page'
      ? !setAside.has(id)
      : revealed.has(id) || (contextValues?.[id]?.length ?? 0) > 0

  const groups: [string, Field[]][] = [
    ['contexts', contextRows.filter((t) => isShownContext(t.id)).map((t) => ({ ...t, def: null }))],
    [
      'properties',
      schema.filter(isShownProp).map((d) => ({
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
    const setAsideRow = context && variant === 'page'
    if (keep) {
      if (!setAsideRow) reveal(id)
      return
    }
    if (setAsideRow) setSetAside((prev) => new Set([...prev, id]))
    else setRevealed((prev) => new Set([...prev].filter((r) => r !== id)))
  }
  const rowMenu = async (id: string, name: string, value: PropertyValue): Promise<void> => {
    const action = await host().ask('property-menu', {
      kind: 'page-value',
      name,
      filled: !isBlankValue(value),
    })
    if (action === 'value:clear' || action === 'value:remove')
      emptyRow(id, action === 'value:clear')
  }

  // The row mounts next frame, so its value field can only be anchored to after paint.
  const revealAndEdit = (id: string, def?: PropertyDefinition): void => {
    setAddOpen(false)
    reveal(id)
    requestAnimationFrame(() => {
      const el =
        document.querySelector<HTMLElement>(`[${ROW_ATTR[variant]}="${id}"] .${s.value}`) ??
        addRef.current
      if (def && el) return editRow(def, el)
      triggerRef.current = el
      setEditing({ id, mode: 'picker' })
    })
  }
  const showContext = (id: string): void => {
    if (variant !== 'page') {
      revealAndEdit(id)
      return
    }
    setAddOpen(false)
    setSetAside((prev) => new Set([...prev].filter((r) => r !== id)))
  }

  const frame = (body: React.ReactNode): React.JSX.Element =>
    variant === 'panel' ? (
      <div className="window-panel-column">{body}</div>
    ) : (
      <div className={s.frame}>
        <MenuScrollFrame
          header={<MenuTopRow label="Settings" current="Properties" onBack={props.onBack} />}
        >
          {body}
        </MenuScrollFrame>
      </div>
    )
  if (!ctx || !row || !fm) return frame(null)

  const hiddenProps = schema.filter((d) => !isShownProp(d))
  const hiddenContexts = contextRows.filter((t) => !isShownContext(t.id))

  return frame(
    <>
      <div className={variant === 'panel' ? cx(s.panelRows, 'over-scroll') : s.rows}>
        {groups.map(([key, group]) =>
          group.length === 0 ? null : (
            <div key={key} className={s.group}>
              {group.map(({ def, id, label, icon }) => {
                const column: ResolvedColumn = { id, kind: def ? 'property' : 'context' }
                const rowBody = (
                  // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
                  <div
                    key={variant === 'panel' ? id : undefined}
                    className={s.row}
                    {...{ [ROW_ATTR[variant]]: id }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      void rowMenu(id, label, resolveFieldValue(row, id, schema))
                    }}
                  >
                    {variant === 'page' ? (
                      <>
                        <span className={side}>
                          <Icon name={icon} size="control" />
                        </span>
                        <span className={s.label}>{label}</span>
                      </>
                    ) : (
                      <span className={s.label}>
                        <Icon name={icon} size="control" />
                        {label}
                      </span>
                    )}
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
                )
                return variant === 'page' ? (
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
        {(hiddenProps.length > 0 || hiddenContexts.length > 0) && (
          <Button
            ref={addRef}
            size="button-inline"
            icon="plus"
            iconSize={variant === 'page' ? 'control' : 'caption'}
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
            onClick={() => showContext(t.id)}
          >
            {t.label}
          </PickerRow>
        ))}
        {hiddenProps.map((def) => (
          <PickerRow
            key={def.id}
            leading={<Icon name={propertyIcon(def)} size="body" />}
            onClick={() => revealAndEdit(def.id, def)}
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
