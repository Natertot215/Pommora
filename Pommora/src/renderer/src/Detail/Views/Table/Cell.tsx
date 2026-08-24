import type { CSSProperties } from 'react'
import type { ColumnStyle } from '@shared/columnStyles'
import type { PropertyValue } from '@shared/propertyValue'
import type { ResolvedColumn, ViewRow } from '@shared/types'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { EntityIcon } from '@renderer/Components/EntityIcon'
import { DualSwitch } from '@renderer/DesignSystem/Components/Controls/Switches/DualSwitch'
import { ProgressBar } from '@renderer/DesignSystem/Elements/ProgressBar/ProgressBar'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { OverScroll } from '@renderer/DesignSystem/Interactions/OverScroll'
import { SEGMENT_INDEX_ATTR } from '@renderer/DesignSystem/Labels/SegmentRun'
import { resolveFileValue } from '@renderer/assetUrl'
import { fileValueWithout } from '../PropertyEditing/filePick'
import { declaredType, fileName, resolveFieldValue } from '../pipeline/value'
import { formatDate, formatNumber, numberDivisor } from '../PropertyEditing/formatValue'
import { statusGroupGlyph, statusGroupOf } from '../PropertyEditing/statusCycle'
import { StatusCapsule } from '../PropertyEditing/StatusCapsule'
import { findOption } from './cellResolve'
import { LinkCell } from './LinkCell'
import { solidColorCss } from './solidColor'
import { CheckboxGlyph } from './checkboxLook'
import type { ResolveContext } from './resolveContext'
import {
  ContextChip,
  FileChip,
  Label,
  labelColor,
  optionShapeFor,
  shape,
} from '@renderer/DesignSystem/Labels'

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
      <OverScroll className="cell-title">
        {hideIcon ? null : <EntityIcon kind="page" icon={row.icon} size="body" />}
        <span className="cell-title-text">{row.title}</span>
      </OverScroll>
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
        <DualSwitch checked={checked} onChange={() => {}} ariaLabel="Checkbox value" />
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
          <span className={cx(shape.box, labelColor[labelColorFor(opt?.color)])}>
            {group && group !== 'upcoming' ? (
              <Icon name={statusGroupGlyph(group)} size="control" strokeWidth={3} />
            ) : null}
          </span>
        )
      }
      return (
        <OverScroll className="cell-chips">
          <Label
            color={labelColorFor(opt?.color)}
            text={opt?.label ?? v.value}
            shape={optionShapeFor(dt ?? '')}
            {...(remove ? { onRemove: () => remove(null) } : {})}
          />
        </OverScroll>
      )
    }
    case 'multiSelect':
      return (
        <OverScroll className="cell-chips">
          {v.value.map((val) => {
            const o = findOption(column.id, val, ctx.schema)
            return (
              <Label
                key={val}
                color={labelColorFor(o?.color)}
                text={o?.label ?? val}
                shape={optionShapeFor(dt ?? '')}
                {...(remove
                  ? {
                      onRemove: () =>
                        remove({ kind: 'multiSelect', value: v.value.filter((x) => x !== val) }),
                    }
                  : {})}
              />
            )
          })}
        </OverScroll>
      )
    case 'context':
      return (
        <OverScroll className="cell-chips">
          {v.value.map((id) => {
            const c = ctx.contextsById.get(id)
            return (
              <ContextChip
                key={id}
                color={labelColorFor(c?.color)}
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
        </OverScroll>
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
        <OverScroll className="cell-text-scroll cell-control">
          {formatDate(
            v.value,
            style.date_format ?? 'full',
            style.time_format ?? 'none',
            style.weekday ?? 'none',
          )}
        </OverScroll>
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
      return <OverScroll className="cell-text-scroll">{formatNumber(v.value, def)}</OverScroll>
    }
    case 'file':
      return (
        <OverScroll className="cell-chips">
          {v.value.map((f, i) => (
            <span
              // Positional, never the value: two identical wikilinks — a hand-edit, a sync merge —
              // would collide as keys and send the hover-× to the wrong one. The stamp is what the
              // click and the menu hit-test, so a chip knows which file it names.
              key={String(i)}
              {...{ [SEGMENT_INDEX_ATTR]: i }}
            >
              <FileChip
                name={fileName(f)}
                // A name nothing answers to still renders. The value is in frontmatter and the
                // user has to be able to see it to remove it.
                unresolved={resolveFileValue(f, ctx.assets).kind === 'unresolved'}
                {...(remove ? { onRemove: () => remove(fileValueWithout(v, i)) } : {})}
              />
            </span>
          ))}
        </OverScroll>
      )
    default:
      return null
  }
}
