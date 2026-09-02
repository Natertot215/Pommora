import { AssetImage } from '@renderer/Assets/AssetImage'
import { Icon, entityIcon } from '@renderer/DesignSystem/Symbols'
import { ICON_PX, type IconSize } from '@renderer/DesignSystem/Tokens/size.css'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useAssetUrl, useSession } from '@renderer/store'
import type { ResolvedNav } from '@renderer/Navigation/navResolve'
import type { EntityIconKind } from '@shared/types'
import './entity-icon.css'

type EntityIconProps =
  | { item: ResolvedNav; kind?: undefined; icon?: undefined; size?: IconSize; className?: string }
  | { item?: undefined; kind: EntityIconKind; icon?: unknown; size?: IconSize; className?: string }

/** An entity's glyph as JSX. Two ways in: a `kind` (with the entity's own icon, resolved
 *  against the nexus defaults here so a call site can't forget them), or an already-resolved
 *  nav `item` — whose Homepage shows the nexus photo as a round avatar, matching the sidebar.
 *  The nav path lives in its own component so the kind path — every table cell, filter, and
 *  group glyph — never subscribes to the asset map it doesn't read. Data-building code (nav
 *  resolution, menu models) calls `entityIcon` directly. */
export function EntityIcon(props: EntityIconProps): React.JSX.Element {
  return props.item ? (
    <NavGlyph item={props.item} size={props.size} className={props.className} />
  ) : (
    <KindGlyph kind={props.kind} icon={props.icon} size={props.size} className={props.className} />
  )
}

function KindGlyph({
  kind,
  icon,
  size,
  className,
}: {
  kind: EntityIconKind
  icon?: unknown
  size?: IconSize
  className?: string
}): React.JSX.Element {
  const defaults = useSession((s) => s.personalization.defaultIcons)
  return <Icon name={entityIcon(kind, icon, defaults)} size={size} className={className} />
}

function NavGlyph({
  item,
  size,
  className,
}: {
  item: ResolvedNav
  size?: IconSize
  className?: string
}): React.JSX.Element {
  const profileImage = useSession((s) => s.tree?.nexus?.profileImage ?? null)
  const photoSrc = useAssetUrl(profileImage)
  if (item.kind === 'homepage' && photoSrc) {
    // The photo branch sizes an element rather than a font, so it needs the step's pixel value.
    const px = size ? ICON_PX[size] : undefined
    return (
      <AssetImage
        value={profileImage}
        className={cx('entity-icon-photo', className)}
        style={{ width: px, height: px }}
      />
    )
  }
  return <Icon name={item.icon} size={size} className={className} />
}
