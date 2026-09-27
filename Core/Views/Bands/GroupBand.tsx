import { EntityIcon } from '../../Assets/EntityIcon'
import { Button } from '@pommora/uix/Buttons/Button'
import type { ReactNode } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
import { granularityOf, type SavedView, viewOption } from '@pommora/core/Views/views'
import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import { base } from '@pommora/uix/Fields/fields.css'
import { asRenderableIcon, Icon } from '@pommora/uix/Symbols'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { DropOutline } from '@pommora/uix/Menus'
import { useDiscloseTarget } from '@pommora/uix/Interactions/dragDisclose'
import { RenamableTitle } from '../../Interface/RenamableTitle'
import { declaredType } from '../../Properties/value'
import { specOf } from '@pommora/core/Properties/properties'
import { findOption } from '../../Properties/Cells/cellResolve'
import { bandGrouping } from '../Pipeline/group'
import { formatBucketLabel } from '../../Properties/formatValue'
import type { ValueContext } from '../../Properties/valueContext'
import { type NexusForms, styleFor } from '../Host/useColumnStyles'
import './group-band.css'
import { onActivateKey } from '@pommora/uix/Interactions/activate'
import { OptionChip } from '../../Properties/Cells/OptionChip'

export function resolveBandHead(
  group: ResolvedGroup,
  view: SavedView,
  ctx: ValueContext,
  nexus: NexusForms,
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
              doubleClick={false}
            />
          ) : (
            title
          )}
        </span>
      ),
    }
  }
  // A property band lives in two homes: top-level property grouping, or a sub-group bucket inside a set band (its raw value rides `bucket`; `key` is the composite collapse id).
  const band = bandGrouping(view, ctx.schema)
  const propId = band?.property_id
  const value = group.bucket ?? group.key
  if (!propId) return { label: value, glyph: <span className="group-name">{group.key}</span> }

  const groupType = declaredType(propId, ctx.schema)
  const def = ctx.schema.find((d) => d.id === propId)
  switch (specOf(groupType)?.kind) {
    case 'select': {
      const opt = findOption(propId, value, ctx.schema)
      return {
        label: value,
        glyph: <OptionChip type={groupType ?? ''} option={opt ?? { value }} def={def} />,
      }
    }
    case 'dateTime': {
      const icon = asRenderableIcon(def?.icon)
      const granularity = granularityOf(band)
      const dateLabel = formatBucketLabel(
        value,
        granularity,
        styleFor(propId, ctx.schema, view, nexus).date_format,
        viewOption(view, 'date_separator'),
      )
      return {
        label: value,
        glyph: (
          <span className="group-name">
            {icon ? <Icon name={icon} size="body" /> : null}
            {dateLabel}
          </span>
        ),
      }
    }
    case 'number':
    case 'checkbox':
    case 'multiSelect':
    case 'context':
    case 'link':
    case 'file':
    case undefined:
      return { label: value, glyph: <span className="group-name">{value}</span> }
  }
}

interface BandDragHandle {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: React.PointerEvent) => void }
  isDragging: boolean
  isNestTarget: boolean
}

/** The outline and "+" isolate their pointerdown so they never arm a band drag. */
export function GroupBand({
  glyph,
  collapsed,
  empty = false,
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
  /** Opening a band with nothing inside adds no clearance beneath its head. */
  empty?: boolean
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
  const discloseRef = useDiscloseTarget(!headless && collapsed && !dragHandle?.isDragging, onToggle)
  return (
    <div className={cx('group-band', subBand && 'sub-band')}>
      {!headless && (
        // The band row carries the section rhythm + indent + zoom; the head inside carries the sticky pin + drag — separate elements so zoom never rides the sticky offset.
        <div
          className="group-band-row"
          ref={discloseRef}
          data-collapsed={collapsed ? '' : undefined}
          data-empty={empty ? '' : undefined}
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
            data-reveal-host=""
          >
            <button
              type="button"
              className="group-band-drop-outline"
              onClick={onToggle}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={collapsed ? 'Expand group' : 'Collapse group'}
            >
              <DropOutline open={!collapsed} />
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
                reveal
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
