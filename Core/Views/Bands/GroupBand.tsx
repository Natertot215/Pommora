import { EntityIcon } from '../../Assets/EntityIcon'
import { Button } from '@pommora/uix/Buttons'
import { type ReactNode, useEffect, useRef } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
import type { SavedView } from '@pommora/core/Views/views'
import { text } from '@pommora/uix/Theme'
import { labelColorFor } from '@pommora/uix/Theme/colorMap'
import { cx } from '@pommora/uix/Utilities/cx'
import { base } from '@pommora/uix/Fields'
import { asRenderableIcon, Icon } from '@pommora/uix/Symbols'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { registerDiscloseTarget } from '@pommora/uix/Interactions/dragDisclose'
import { RenamableTitle } from '../../Interface/RenamableTitle'
import { declaredType } from '../../Properties/value'
import { findOption, groupLabel } from '../../Properties/Cells/cellResolve'
import { CheckboxGlyph } from '../../Properties/Cells/checkboxLook'
import { formatBucketLabel } from '../../Properties/formatValue'
import type { ValueContext } from '../../Properties/valueContext'
import './group-band.css'
import { onActivateKey } from '@pommora/uix/Interactions/activate'
import { dropOutline, dropOutlineOpen } from '@pommora/uix/Menus/listed-outline.css'
import { SpaceChip } from '@pommora/uix/Labels'
import { OptionChip } from '../../Properties/Cells/OptionChip'

export function resolveBandHead(
  group: ResolvedGroup,
  view: SavedView,
  ctx: ValueContext,
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
              className={cx(base, 'band-title-input')}
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
  // A property band lives in two homes: top-level property grouping, or a sub-group bucket inside a set band (its raw value rides `bucket`; `key` is the composite collapse id).
  const propId =
    view.group?.kind === 'property'
      ? view.group.property_id
      : view.group?.kind !== 'flat'
        ? view.sub_group?.property_id
        : undefined
  const label = groupLabel(group, view, ctx, setNames)
  if (!propId) return { label, glyph: <span className="group-name">{group.key}</span> }
  const value = group.bucket ?? group.key

  // A Context band wears its Space's own icon: routing it through the type registry would give every Context one shared glyph, and declaredType classifies a Context column only when handed the registry ids.
  if (ctx.contexts.has(propId)) {
    const space = ctx.contextsById.get(value)
    const title = space?.title ?? value
    return {
      label: title,
      glyph: <SpaceChip color={labelColorFor(space?.color)} title={title} icon={space?.icon} />,
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
        glyph: <OptionChip type={groupType} option={opt ?? { value }} def={def} />,
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

/** The outline and "+" isolate their pointerdown so they never arm a band drag. */
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
  // Spring-load: `toggleRef` keeps the callback fresh without re-registering on every render.
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
        // The band row carries the section rhythm + indent + zoom; the head inside carries the sticky pin + drag — separate elements so zoom never rides the sticky offset.
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
            data-reveal-host
          >
            <button
              type="button"
              className="group-band-drop-outline"
              onClick={onToggle}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={collapsed ? 'Expand group' : 'Collapse group'}
            >
              <Icon
                name="chevron-right"
                size="control"
                className={cx(dropOutline, !collapsed && dropOutlineOpen)}
                data-drop-outline
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
              <Button
                size="button-inline"
                icon="plus"
                iconSize="body"
                revealOnHover
                className="group-band-add"
                tabIndex={-1}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onAdd}
                data-create
                aria-label="New page in group"
              />
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
