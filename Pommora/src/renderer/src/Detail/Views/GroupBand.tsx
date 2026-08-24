import { EntityIcon } from '@renderer/Components/EntityIcon'
import { type ReactNode, useEffect, useRef } from 'react'
import type { CollectionNode, ResolvedGroup, SetNode } from '@shared/types'
import type { SavedView } from '@shared/views'
import { text } from '@renderer/design-system/tokens'
import { labelColorFor } from '@renderer/design-system/tokens/colorMap'
import { cx } from '@renderer/design-system/cx'
import { bare } from '@renderer/design-system/fields'
import { asRenderableIcon, Icon } from '@renderer/design-system/symbols'
import { Reveal } from '@renderer/design-system/components/Reveal'
import { registerDiscloseTarget } from '@renderer/design-system/interactions/dragDisclose'
import { RenamableTitle } from '@renderer/Components/RenamableTitle'
import { declaredType } from './pipeline/value'
import { findOption, groupLabel } from './Table/cellResolve'
import { CheckboxGlyph } from './Table/checkboxLook'
import { formatBucketLabel } from './PropertyEditing/formatValue'
import type { ResolveContext } from './Table/resolveContext'
import './GroupBand.css'
import { onActivateKey } from '@renderer/design-system/interactions/activate'
import { twisty, twistyOpen } from '@renderer/design-system/components/menu/menu.css'
import { ContextChip, Label, optionShapeFor } from '@renderer/design-system/labels'

/** The single home for group-band glyph resolution, shared by the table and cards views. Chip
 *  color/shape resolve from the schema here, so `ResolvedGroup` stays colorless. */
export function resolveBandHead(
  group: ResolvedGroup,
  view: SavedView,
  ctx: ResolveContext,
  setNames: Map<string, string>,
  setIcons: Map<string, string | undefined>,
  source: CollectionNode | SetNode,
  setPath?: string,
): { label: string; glyph: ReactNode } {
  if (group.kind === 'ungrouped') {
    const label = source.title
    return {
      label,
      glyph: (
        <span className="group-name">
          <EntityIcon
            kind={source.kind === 'collection' ? 'collection' : 'set'}
            icon={source.icon}
            size="body"
          />
          {label}
        </span>
      ),
    }
  }
  if (group.kind === 'structural-set') {
    const title = setNames.get(group.key) ?? group.key
    return {
      label: title,
      glyph: (
        <span className="group-name">
          <EntityIcon kind="set" icon={setIcons.get(group.key)} size="body" />
          {setPath ? (
            <RenamableTitle
              path={setPath}
              kind="set"
              title={title}
              className={cx(bare, 'band-title-input')}
              renames="title"
              host="detail"
            />
          ) : (
            title
          )}
        </span>
      ),
    }
  }
  // A property band lives in two homes: top-level property grouping, or a sub-group bucket inside a
  // set band (its raw value rides `bucket`; `key` is the composite collapse id).
  const propId =
    view.group?.kind === 'property'
      ? view.group.property_id
      : view.group?.kind !== 'flat'
        ? view.sub_group?.property_id
        : undefined
  const label = groupLabel(group, view, ctx, setNames)
  if (!propId) return { label, glyph: <span className="group-name">{group.key}</span> }
  const value = group.bucket ?? group.key

  // A Context band names a Space, so it wears that Space's own icon, read from the identity map the
  // cells already use. Routing it through the type registry instead would give every Context one
  // shared glyph, and declaredType classifies a Context column only when handed the registry ids.
  if (ctx.contexts.has(propId)) {
    const space = ctx.contextsById.get(value)
    const title = space?.title ?? value
    return {
      label: title,
      glyph: <ContextChip color={labelColorFor(space?.color)} title={title} icon={space?.icon} />,
    }
  }

  const groupType = declaredType(propId, ctx.schema)
  const def = ctx.schema.find((d) => d.id === propId)
  switch (groupType) {
    case 'status':
    case 'select': {
      const opt = findOption(propId, value, ctx.schema)
      return {
        label,
        glyph: (
          <Label
            color={labelColorFor(opt?.color)}
            text={opt?.label ?? value}
            shape={optionShapeFor(groupType)}
          />
        ),
      }
    }
    case 'checkbox': {
      const on = value === 'true'
      const color = def?.checkbox_color
      return {
        label,
        glyph: (
          <span className="group-name">
            <CheckboxGlyph checked={on} color={color} />
            {on ? 'On' : 'Off'}
          </span>
        ),
      }
    }
    case 'datetime': {
      const icon = asRenderableIcon(def?.icon)
      const style = view.column_styles?.[propId]
      const granularity =
        (view.group?.kind === 'property'
          ? view.group.date_granularity
          : view.sub_group?.date_granularity) ?? 'month'
      const dateLabel = formatBucketLabel(
        value,
        granularity,
        style?.date_format ?? 'full',
        view.date_separator ?? 'dash',
      )
      return {
        label,
        glyph: (
          <span className="group-name">
            {icon ? <Icon name={icon} size="body" /> : null}
            {dateLabel}
          </span>
        ),
      }
    }
    default:
      return { label, glyph: <span className="group-name">{value}</span> }
  }
}

export interface BandDragHandle {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: React.PointerEvent) => void }
  isDragging: boolean
  isNestTarget: boolean
}

/** The twisty and "+" isolate their pointerdown so they never arm a band drag; a double-click's
 *  two leading clicks also net out on the disclosure toggle (harmless, not a bug). */
export function GroupBand({
  glyph,
  collapsed,
  onToggle,
  showAdd = false,
  onAdd,
  headless = false,
  fill = false,
  indent,
  subBand = false,
  dragHandle,
  onOpen,
  onContextMenu,
  children,
}: {
  glyph: ReactNode
  collapsed: boolean
  onToggle: () => void
  showAdd?: boolean
  /** The "+"'s creation handler; absent leaves it the bare affordance it renders as today. */
  onAdd?: () => void
  headless?: boolean
  fill?: boolean
  indent?: string
  subBand?: boolean
  dragHandle?: BandDragHandle
  onOpen?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  children: ReactNode
}): React.JSX.Element {
  const outsideRename = (e: React.MouseEvent): boolean =>
    !(e.target as HTMLElement).closest?.('input')
  // Spring-load: while collapsed, register the header so a drag dwelling over it discloses the group
  // (dragDisclose). `toggleRef` keeps the callback fresh without re-registering on every render.
  const rowRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef(onToggle)
  toggleRef.current = onToggle
  useEffect(() => {
    if (headless || !collapsed || !rowRef.current) return
    return registerDiscloseTarget(rowRef.current, () => toggleRef.current())
  }, [headless, collapsed])
  return (
    <div className={cx('group-band', subBand && 'sub-band')}>
      {!headless && (
        // The band row carries the section rhythm + indent + zoom (table); the head inside carries the
        // sticky pin + drag — kept on separate elements so zoom never rides the sticky offset.
        <div
          className="group-band-row"
          ref={rowRef}
          data-disclose={collapsed ? '' : undefined}
          style={indent ? { paddingLeft: indent } : undefined}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
          <div
            ref={dragHandle?.ref}
            className={cx(
              'group-band-head',
              text.body.emphasized,
              dragHandle?.isDragging && 'band-dragging',
              dragHandle?.isNestTarget && 'band-nest-target',
            )}
            onContextMenu={onContextMenu}
          >
            <button
              type="button"
              className="group-band-twisty"
              onClick={onToggle}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={collapsed ? 'Expand group' : 'Collapse group'}
            >
              <Icon
                name="chevron-right"
                size="control"
                className={cx(twisty, !collapsed && twistyOpen)}
                data-twisty
              />
            </button>
            {/* biome-ignore lint/a11y/useSemanticElements: a real <button> cannot host this surface — it doubles as a drag handle and wraps block content */}
            <span
              className="group-band-glyph"
              {...(dragHandle?.handle ?? {})}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if (outsideRename(e)) onToggle()
              }}
              onKeyDown={onActivateKey(onToggle)}
              onDoubleClick={
                onOpen
                  ? (e) => {
                      if (outsideRename(e)) onOpen()
                    }
                  : undefined
              }
            >
              {glyph}
            </span>
            {showAdd ? (
              <button
                type="button"
                className="group-band-add"
                tabIndex={-1}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onAdd}
                data-create
                aria-label="New page in group"
              >
                <Icon name="plus" size="body" />
              </button>
            ) : null}
          </div>
        </div>
      )}
      <Reveal open={headless || !collapsed} fill={fill}>
        {children}
      </Reveal>
    </div>
  )
}
