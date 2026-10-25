import { PROPERTY_TYPES, type PropertyDefinition } from '../../Properties/properties'
import { findOption, optionLabel } from '../../Properties/propertyValue'
import { heading, menuDropLine } from '@pommora/uix/Menus'
import { hiddenRow, optionRow } from '@pommora/uix/Menus/frames.css'
import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'
import { cx } from '@pommora/uix/Utilities/cx'
import { OptionChip } from '../../Properties/Cells/OptionChip'
import { liveBucketOrder, type PropertyGroup } from '../Pipeline/group'
import { type HideControls, rowEye } from './paneRows'

type Section = { key: string; label: string | null; values: string[] }

function sectionsOf(
  group: Pick<PropertyGroup, 'order_mode' | 'order'>,
  def: PropertyDefinition,
  order: string[],
): Section[] {
  if (PROPERTY_TYPES[def.type].options !== 'status' || group.order_mode === 'manual')
    return [
      { key: 'options', label: group.order_mode === 'manual' ? 'Options' : null, values: order },
    ]
  const reversed = group.order_mode === 'reversed'
  const groups = def.status_groups ?? []
  return (reversed ? [...groups].reverse() : groups).map((g) => {
    const values = g.options.map((o) => o.id)
    return { key: g.id, label: g.label, values: reversed ? values.reverse() : values }
  })
}

export function OptionOrderList({
  group,
  def,
  onSave,
  isHidden,
  onToggleHidden,
}: {
  group: Pick<PropertyGroup, 'order_mode' | 'order'>
  def: PropertyDefinition | undefined
  onSave?: (order: string[]) => void
} & HideControls): React.JSX.Element | null {
  if (!def) return null
  const order = liveBucketOrder(group, def, [])
  return (
    <LineZone
      {...lineList({
        locked: !onSave,
        commit: (v, slot) => {
          const next = moveBefore(order, (x) => x, v, slot.before)
          if (next) onSave?.(next)
        },
        line: menuDropLine,
        label: (v) => optionLabel(def, v),
        chip: (v) => <OptionChip type={def.type} option={findOption(def, v)} />,
        watch: [def, group.order_mode, group.order],
      })}
    >
      {sectionsOf(group, def, order).map((section) => (
        <div key={section.key}>
          {section.label !== null && <div className={heading}>{section.label}</div>}
          {section.values.flatMap((v) => {
            const option = findOption(def, v)
            if (!option) return []
            return [
              <LineRow key={v} id={v} className={cx(optionRow, isHidden?.(v) && hiddenRow)}>
                <OptionChip type={def.type} option={option} />
                {rowEye(option.label, v, { isHidden, onToggleHidden })}
              </LineRow>,
            ]
          })}
        </div>
      ))}
    </LineZone>
  )
}
