import type { StatusGroupId } from '@shared/properties'
import { labelColor, shape } from '@renderer/design-system/labels'
import { labelColorFor } from '@renderer/design-system/tokens/colorMap'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { statusGroupGlyph } from './statusCycle'

/** The capsule look for a status value — an icon-only chip carrying its group glyph (upcoming falls
 *  back to the dashed circle). Shared by the table cell and the picker's capsule options so the two
 *  can't drift. */
export function StatusCapsule({
  color,
  group,
}: {
  color?: string
  group: StatusGroupId | undefined
}): React.JSX.Element {
  return (
    <span className={cx(shape.chip, labelColor[labelColorFor(color)])}>
      <Icon name={statusGroupGlyph(group)} size="body" />
    </span>
  )
}
