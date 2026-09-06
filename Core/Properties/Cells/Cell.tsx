import type { CSSProperties } from 'react'
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import { EntityIcon } from '../../Assets/EntityIcon'
import { DualSwitch } from '@pommora/uix/Controls/Switches/DualSwitch'
import { ProgressBar } from '@pommora/uix/Elements/ProgressBar/ProgressBar'
import { labelColorFor } from '@pommora/uix/Theme/colorMap'
import { OverScroll } from '@pommora/uix/Elements/OverScroll'
import { SEGMENT_INDEX_ATTR } from '@pommora/uix/Fields/SegmentRun'
import { resolveFileValue } from '../../Assets/assetUrl'
import { fileValueWithout } from '../Pickers/filePick'
import { declaredType, fileName, resolveFieldValue } from '../value'
import { formatDate, formatNumber, numberDivisor } from '../formatValue'
import { OptionChip } from './OptionChip'
import { findOption } from './cellResolve'
import { LinkCell } from './LinkCell'
import { solidColorCss } from '@pommora/uix/Theme/solidColor'
import { CheckboxGlyph } from './checkboxLook'
import type { ValueContext } from '../valueContext'
import { FileChip, SpaceChip } from '@pommora/uix/Labels'

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
  ctx: ValueContext
  hideIcon: boolean
  style: ColumnStyle
  showFullLink?: boolean
  /** Only Standard chips wire it — Compact looks clear via their menu instead. */
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
  // A status value is a bare label on disk, indistinguishable from a select — the schema is the only thing that knows the declared type.
  const dt = declaredType(column.id, ctx.schema)
  const def = ctx.schema.find((d) => d.id === column.id)

  // Keyed off the schema TYPE rather than value presence, so a checkbox toggles in place without first assigning the property.
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
      return (
        <OverScroll className="cell-chips">
          <OptionChip
            type={dt ?? ''}
            look={style.look}
            option={opt ?? { value: v.value }}
            def={def}
            {...(remove && style.look !== 'compact' ? { onRemove: () => remove(null) } : {})}
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
              <OptionChip
                key={val}
                type={dt ?? ''}
                look={style.look}
                option={o ?? { value: val }}
                {...(remove && style.look !== 'compact'
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
              <SpaceChip
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
              // Positional, never the value: two identical wikilinks would collide as keys and send the hover-× to the wrong one.
              key={String(i)}
              {...{ [SEGMENT_INDEX_ATTR]: i }}
            >
              <FileChip
                name={fileName(f)}
                // Renders even unresolved, so the user can still see and remove it.
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
