import { AssetImage } from './AssetImage'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from './entityIconPolicy'
import { ICON_PX, type IconSize } from '@pommora/uix/Theme/size.css'
import { cx } from '@pommora/uix/Utilities/cx'
import { useSession } from '../Session/store'
import { useAssetUrl } from './useAssetUrl'
import type { ResolvedNav } from '../Navigation/navResolve'
import type { EntityIconKind } from '@pommora/core/Settings/personalization'
import * as assetImage from './asset-image.css'

type EntityIconProps =
  | { item: ResolvedNav; kind?: undefined; icon?: undefined; size?: IconSize; className?: string }
  | { item?: undefined; kind: EntityIconKind; icon?: unknown; size?: IconSize; className?: string }

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
        className={cx(assetImage.photo, className)}
        style={{ width: px, height: px }}
      />
    )
  }
  return <Icon name={item.icon} size={size} className={className} />
}
