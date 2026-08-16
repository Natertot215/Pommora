import type { CSSProperties } from 'react'
import type { ColumnStyle } from '@shared/columnStyles'
import type { PropertyValue } from '@shared/propertyValue'
import type { ResolvedColumn, ViewRow } from '@shared/types'
import { chipBox, chipColor } from '@renderer/design-system/tokens'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { EntityIcon } from '@renderer/Components/EntityIcon'
import { Switch } from '@renderer/design-system/components/Switches/Switch'
import { ProgressBar } from '@renderer/design-system/components/ProgressBar/ProgressBar'
import { Chip, chipShapeForType } from '@renderer/Components/Chip'
import { ContextChip } from '@renderer/Components/ContextChip'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { OverflowScroll } from '@renderer/design-system/components/OverflowScroll'
import { declaredType, resolveFieldValue } from '../pipeline/value'
import { fileLabel, formatDate, formatNumber, numberDivisor } from '../PropertyEditing/formatValue'
import { statusGroupGlyph, statusGroupOf } from '../PropertyEditing/statusCycle'
import { StatusCapsule } from '../PropertyEditing/StatusCapsule'
import { findOption } from './cellResolve'
import { LinkCell } from './LinkCell'
import { solidColorCss } from './solidColor'
import { CheckboxGlyph } from './checkboxLook'
import type { ResolveContext } from './resolveContext'

/** Type-aware cell render — the per-view `style` picks each type's look + formats. Every value
 *  routes through the resolution context so no raw id ever shows; an empty/unknown value renders
 *  nothing. */
export function Cell({
  row,
  column,
  ctx,
  hideIcon,
  style,
  showFullLink,
  remove,
}: {
  row: ViewRow
  column: ResolvedColumn
  ctx: ResolveContext
  hideIcon: boolean
  style: ColumnStyle
  /** While this cell's Rename popover is open, show the raw URL instead of the alias, so you can see
   *  what you're aliasing (a url cell only). */
  showFullLink?: boolean
  /** Commits the value that remains after a chip's hover × (null = the property clears entirely).
   *  Only PILL chips wire it — capsule/checkbox looks clear via their menu instead. */
  remove?: (next: PropertyValue | null) => void
}): React.JSX.Element | null {
  if (column.kind === 'title') {
    return (
      <OverflowScroll className="cell-title">
        {hideIcon ? null : <EntityIcon kind="page" icon={row.icon} size={14} />}
        <span className="cell-title-text">{row.title}</span>
      </OverflowScroll>
    )
  }

  const v = resolveFieldValue(row, column.id, ctx.schema)
  // The declared type drives every per-type look. A status value is a bare label on disk and in
  // memory, indistinguishable from a select, so the schema is the only thing that knows.
  const dt = declaredType(column.id, ctx.schema)
  const def = ctx.schema.find((d) => d.id === column.id)

  // A checkbox column ALWAYS shows its box — even on a page with no stored value — so it toggles in
  // place without first assigning the property. The box keys off the column's schema TYPE, not the
  // value's presence; unchecked means no frontmatter value at all (the toggle strips the key).
  if (dt === 'checkbox') {
    const checked = v.kind === 'checkbox' && v.value
    const color = def?.checkbox_color
    return style.look === 'switch' ? (
      <span
        className="cell-switch"
        style={{ ...(color ? { '--accent': solidColorCss(color) } : {}) } as CSSProperties}
      >
        <Switch checked={checked} onChange={() => {}} ariaLabel="Checkbox value" />
      </span>
    ) : (
      <CheckboxGlyph checked={checked} color={color} className="cell-checkbox" />
    )
  }

  switch (v.kind) {
    case 'select': {
      const opt = findOption(column.id, v.value, ctx.schema)
      if (dt === 'status' && (style.look === 'capsule' || style.look === 'checkbox')) {
        const group = statusGroupOf(v.value, def)
        return style.look === 'capsule' ? (
          <StatusCapsule color={opt?.color} group={group} />
        ) : (
          <span className={cx(chipBox, chipColor[chipColorFor(opt?.color)])}>
            {group && group !== 'upcoming' ? (
              <Icon name={statusGroupGlyph(group)} size={12} strokeWidth={3} />
            ) : null}
          </span>
        )
      }
      return (
        <OverflowScroll className="cell-chips">
          <Chip
            color={chipColorFor(opt?.color)}
            label={opt?.label ?? v.value}
            shape={chipShapeForType(dt ?? '')}
            {...(remove ? { onRemove: () => remove(null) } : {})}
          />
        </OverflowScroll>
      )
    }
    case 'multiSelect':
      return (
        <OverflowScroll className="cell-chips">
          {v.value.map((val) => {
            const o = findOption(column.id, val, ctx.schema)
            return (
              <Chip
                key={val}
                color={chipColorFor(o?.color)}
                label={o?.label ?? val}
                shape={chipShapeForType(dt ?? '')}
                {...(remove
                  ? {
                      onRemove: () =>
                        remove({ kind: 'multiSelect', value: v.value.filter((x) => x !== val) }),
                    }
                  : {})}
              />
            )
          })}
        </OverflowScroll>
      )
    case 'context':
      return (
        <OverflowScroll className="cell-chips">
          {v.value.map((id) => {
            const c = ctx.contextsById.get(id)
            return (
              <ContextChip
                key={id}
                color={chipColorFor(c?.color)}
                title={c?.title ?? id}
                icon={c?.icon}
                {...(remove
                  ? {
                      onRemove: () =>
                        remove({ kind: 'context', value: v.value.filter((x) => x !== id) }),
                    }
                  : {})}
              />
            )
          })}
        </OverflowScroll>
      )
    case 'url':
      return (
        <LinkCell
          raw={v.value}
          def={ctx.schema.find((d) => d.id === column.id)}
          look={style.look}
          showFullLink={showFullLink}
        />
      )

    case 'datetime':
      return (
        <OverflowScroll className="cell-text-scroll cell-control">
          {formatDate(
            v.value,
            style.date_format ?? 'full',
            style.time_format ?? 'none',
            style.weekday ?? 'none',
          )}
        </OverflowScroll>
      )
    case 'number': {
      const def = ctx.schema.find((d) => d.id === column.id)
      const divisor = numberDivisor(def)
      if (style.look === 'bar' && divisor !== undefined) {
        return (
          <span className="cell-bar">
            <ProgressBar fill={v.value / divisor} />
          </span>
        )
      }
      return (
        <OverflowScroll className="cell-text-scroll">{formatNumber(v.value, def)}</OverflowScroll>
      )
    }
    case 'file':
      // Each chip opens its own file — the click stays on the chip, not the cell/row.
      return (
        <OverflowScroll className="cell-chips">
          {v.value.map((f) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a control inside a grid cell — per-chip tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
            <span
              key={f.path}
              onClick={(e) => {
                e.stopPropagation()
                void window.nexus.openFile(f.path)
              }}
            >
              <Chip
                color="default"
                label={fileLabel(f, style.look === 'path' ? 'path' : 'filename')}
              />
            </span>
          ))}
        </OverflowScroll>
      )
    default:
      return null
  }
}
