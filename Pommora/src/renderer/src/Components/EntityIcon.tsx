import { Icon, entityIcon } from '@renderer/design-system/symbols'
import type { EntityIconKind } from '@shared/types'
import { useSession } from '../store'

/** An entity's glyph as JSX. Reads the nexus's default-icon overrides itself, so a call
 *  site can't forget them — it only says which kind, and the entity's own icon if it has
 *  one. Data-building code (nav resolution, menu models) uses `entityIcon` directly. */
export function EntityIcon({
  kind,
  icon,
  size,
  className,
}: {
  kind: EntityIconKind
  icon?: unknown
  size?: React.ComponentProps<typeof Icon>['size']
  className?: string
}): React.JSX.Element {
  const defaults = useSession((s) => s.personalization.defaultIcons)
  return <Icon name={entityIcon(kind, icon, defaults)} size={size} className={className} />
}
