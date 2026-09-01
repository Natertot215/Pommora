import type { CSSProperties } from 'react'
import type { ColumnStyle } from '@shared/columnStyles'
import type { PropertyValue } from '@shared/propertyValue'
import type { ResolvedColumn, ViewRow } from '@shared/types'
import { EntityIcon } from '@renderer/Utilities/EntityIcon'
import { DualSwitch } from '@renderer/DesignSystem/Controls/Switches/DualSwitch'
import { ProgressBar } from '@renderer/DesignSystem/Elements/ProgressBar/ProgressBar'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { OverScroll } from '@renderer/DesignSystem/Interactions/OverScroll'
import { SEGMENT_INDEX_ATTR } from '@renderer/DesignSystem/Fields/SegmentRun'
import { resolveFileValue } from '@renderer/Assets/assetUrl'
import { fileValueWithout } from '@renderer/Properties/Assignment/filePick'
import { declaredType, fileName, resolveFieldValue } from '@renderer/Properties/value'
import {
  formatDate,
  formatNumber,
  numberDivisor,
} from '@renderer/Properties/Assignment/formatValue'
import { OptionChip } from '@renderer/Properties/Assignment/OptionChip'
import { findOption } from '@renderer/Properties/Assignment/cellResolve'
import { LinkCell } from '@renderer/Properties/Assignment/LinkCell'
import { solidColorCss } from '@renderer/DesignSystem/Tokens/solidColor'
import { CheckboxGlyph } from '@renderer/Properties/Assignment/checkboxLook'
import type { ResolveContext } from '@renderer/Properties/resolveContext'
import { FileChip, SpaceChip } from '@renderer/DesignSystem/Labels'

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
   *  Only Standard chips wire it — Compact looks clear via their menu instead. */
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
  // A status value is a bare label on disk, indistinguishable from a select — the schema is the
  // only thing that knows the declared type.
  const dt = declaredType(column.id, ctx.schema)
  const def = ctx.schema.find((d) => d.id === column.id)

  // A checkbox column always shows its box, keyed off the schema TYPE rather than value presence,
  // so it toggles in place without first assigning the property.
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
              // Positional, never the value: two identical wikilinks would collide as keys and
              // send the hover-× to the wrong one.
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
