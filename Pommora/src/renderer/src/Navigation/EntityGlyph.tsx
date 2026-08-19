import { Icon } from '@renderer/design-system/symbols'
import { ICON_PX } from '@renderer/design-system/tokens/size.css'
import type { IconSize } from '@renderer/design-system/tokens/size.css'
import { cx } from '@renderer/design-system/cx'
import { assetUrl } from '../assetUrl'
import { useSession } from '../store'
import type { ResolvedNav } from './navResolve'
import './entityGlyph.css'

// A nav entity's leading glyph. The Homepage is the nexus itself — when a nexus photo is set it shows
// as a round avatar (its identity), matching the sidebar; otherwise (and for every other kind) the
// resolved icon glyph.
export function EntityGlyph({
  item,
  size,
  className,
}: {
  item: ResolvedNav
  size: IconSize
  className?: string
}): React.JSX.Element {
  const profileImage = useSession((s) => s.tree?.nexus.profileImage ?? null)
  // The photo branch sizes an element rather than a font, so it needs the step's pixel value.
  const px = ICON_PX[size]
  if (item.kind === 'homepage' && profileImage) {
    return (
      <img
        className={cx('entity-glyph-photo', className)}
        style={{ width: px, height: px }}
        src={assetUrl(profileImage)}
        alt=""
      />
    )
  }
  return <Icon name={item.icon} size={size} className={className} />
}
