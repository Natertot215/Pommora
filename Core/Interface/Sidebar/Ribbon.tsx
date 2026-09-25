import type { Personalization, SidebarMode } from '@pommora/core/Settings/personalization'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { reorder, SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { openOrder } from '../../Actions/menuModel'
import { popMenu } from '../../Actions/menuActions'
import { openLabel } from '../../Actions/toggleLabels'
import { useSession } from '../../Session/store'
import { sidebarModeOf, useExperimental } from '@pommora/core/Settings/experimental'
import { type RibbonKey, resolveOrder, withHidden } from './ribbonOrder'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { ctxHandler } from './sidebarRows'
import { MATRIX_ICON, MATRIX_REF } from '../../Matrix/matrixKind'
import { NexusPhoto } from './NexusPhoto'
import './sidebar.css'

// An icon that summoned a window dismisses it on the next press.
const RIBBON: Record<
  RibbonKey,
  {
    icon: (defaults: Personalization['defaultIcons']) => string
    press: () => void
    menu?: () => void
  }
> = {
  matrix: { icon: () => MATRIX_ICON, press: pressMatrix, menu: () => void matrixMenu() },
  agenda: { icon: () => 'calendar', press: () => switchTo('agenda') },
  contexts: { icon: (d) => entityIcon('context', undefined, d), press: () => switchTo('contexts') },
  collections: {
    icon: (d) => entityIcon('collection', undefined, d),
    press: () => switchTo('collections'),
  },
  settings: {
    icon: () => 'sliders-horizontal',
    press: () => useSession.getState().toggleSettings(),
  },
}

const switchTo = (mode: SidebarMode): void =>
  useSession.getState().setPersonalization('sidebarMode', mode)

function pressMatrix(): void {
  const s = useSession.getState()
  if (s.personalization.matrixOpenIn === 'window' && !isOpenInTabs(s.tabs, s.pinned, MATRIX_REF))
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
      [{ label: 'Preview', action: 'preview', disabled: s.pageWindow?.kind === 'matrix' }],
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
  const keys = resolveOrder(order, experimental)

  const reorderIcons = (activeId: string, overId: string): void => {
    const next = reorder(
      keys.map((id) => ({ id })),
      activeId,
      overId,
    ).map((x) => x.id)
    setPersonalization('ribbonOrder', withHidden(order, next))
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
      <SortableZone items={keys} axis="y" onReorder={reorderIcons}>
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
  const { setNodeRef, style, handle, isDragging } = useDragItem(tabKey)
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...handle}
      type="button"
      role="tab"
      className="ribbon-icon"
      aria-label={tabKey}
      aria-selected={active}
      onClick={() => {
        if (!isDragging) onClick()
      }}
      onContextMenu={ctxHandler(onMenu)}
    >
      <Icon name={icon} size="titleSmall" />
    </button>
  )
}
