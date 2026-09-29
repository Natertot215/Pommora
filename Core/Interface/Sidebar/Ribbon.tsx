import {
  type Personalization,
  type SidebarMode,
  settingOf,
} from '@pommora/core/Settings/personalization'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'
import { openOrder } from '../../Actions/menuModel'
import { popMenu } from '../../Actions/menuActions'
import { openLabel } from '../../Actions/toggleLabels'
import { useSession } from '../../Session/store'
import { sidebarModeOf, useExperimental } from '@pommora/core/Settings/experimental'
import { type RibbonKey, resolveRibbonOrder, withHidden } from './ribbonOrder'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { ctxHandler } from './sidebarRows'
import { MATRIX_ICON, MATRIX_REF } from '../../Matrix/matrixKind'
import { NexusPhoto } from './NexusPhoto'
import './sidebar.css'

// An icon that summoned a window dismisses it on the next press.
const RIBBON: Record<
  RibbonKey,
  {
    label: string
    icon: (defaults: Personalization['defaultIcons']) => string
    press: () => void
    menu?: () => void
  }
> = {
  matrix: {
    label: 'Matrix',
    icon: () => MATRIX_ICON,
    press: pressMatrix,
    menu: () => void matrixMenu(),
  },
  agenda: { label: 'Agenda', icon: () => 'calendar', press: () => switchTo('agenda') },
  contexts: {
    label: 'Contexts',
    icon: (d) => entityIcon('context', undefined, d),
    press: () => switchTo('contexts'),
  },
  collections: {
    label: 'Collections',
    icon: (d) => entityIcon('collection', undefined, d),
    press: () => switchTo('collections'),
  },
  settings: {
    label: 'Settings',
    icon: () => 'sliders-horizontal',
    press: () => useSession.getState().toggleSettings(),
  },
}

const switchTo = (mode: SidebarMode): void =>
  useSession.getState().setPersonalization('sidebarMode', mode)

function pressMatrix(): void {
  const s = useSession.getState()
  if (
    settingOf(s.personalization, 'matrixOpenIn') === 'window' &&
    !isOpenInTabs(s.tabs, s.pinned, MATRIX_REF)
  )
    s.toggleMatrixWindow()
  else void s.select(MATRIX_REF)
}

type RibbonMenuAction = 'open' | 'preview'

// No trigger: a right-click presents natively whatever the in-app menu preference says.
async function matrixMenu(): Promise<void> {
  const s = useSession.getState()
  const inTabs = isOpenInTabs(s.tabs, s.pinned, MATRIX_REF)
  const action = await popMenu<RibbonMenuAction>(
    openOrder<RibbonMenuAction>(
      inTabs,
      [{ label: openLabel(inTabs), action: 'open' }],
      [{ label: 'Preview', action: 'preview', disabled: s.windowSlot?.kind === 'matrix' }],
    ),
  )
  if (action === 'open') void s.select(MATRIX_REF)
  else if (action === 'preview') s.openMatrixWindow()
}

export function Ribbon(): React.JSX.Element {
  const select = useSession((s) => s.select)
  const mode = useSession((s) => sidebarModeOf(s.personalization))
  const order = useSession((s) => s.personalization.ribbonOrder)
  const experimental = useExperimental()
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const setPersonalization = useSession((s) => s.setPersonalization)
  const keys = resolveRibbonOrder(order, experimental)

  const moveIcon = (id: string, beforeId: string | null): void => {
    const next = moveBefore(keys, (k) => k, id, beforeId)
    if (next) setPersonalization('ribbonOrder', withHidden(order, next))
  }

  return (
    <div className="sidebar-ribbon" role="tablist" aria-label="Sidebar sections">
      <button
        type="button"
        className="ribbon-icon ribbon-home"
        aria-label="Homepage"
        onClick={() => void select({ kind: 'homepage' })}
      >
        <NexusPhoto size="titleMedium" />
      </button>
      <SortableZone
        items={keys}
        axis="y"
        label={(k) => RIBBON[k as RibbonKey].label}
        onMove={moveIcon}
      >
        {keys.map((k) => (
          <RibbonTab
            key={k}
            tabKey={k}
            icon={RIBBON[k].icon(defaultIcons)}
            active={k === mode}
            onClick={RIBBON[k].press}
            onMenu={RIBBON[k].menu}
          />
        ))}
      </SortableZone>
    </div>
  )
}

function RibbonTab({
  tabKey,
  icon,
  active,
  onClick,
  onMenu,
}: {
  tabKey: RibbonKey
  icon: string
  active: boolean
  onClick: () => void
  onMenu?: () => void
}): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(tabKey, { open: onClick })
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...handle}
      type="button"
      role="tab"
      className="ribbon-icon"
      aria-label={RIBBON[tabKey].label}
      aria-selected={active}
      onClick={onClick}
      onContextMenu={ctxHandler(onMenu)}
    >
      <Icon name={icon} size="titleSmall" />
    </button>
  )
}
