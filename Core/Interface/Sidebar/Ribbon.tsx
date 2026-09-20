import type { SidebarMode } from '@pommora/core/Settings/personalization'
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

// The Settings icon dismisses the window it summoned, matching the keyboard command that shares the state, and never switches sidebarMode.
const MODE_FOR: Partial<Record<RibbonKey, SidebarMode>> = {
  collections: 'collections',
  contexts: 'contexts',
  agenda: 'agenda',
}
const STATIC_ICON: Record<'matrix' | 'agenda' | 'settings', string> = {
  matrix: MATRIX_ICON,
  agenda: 'calendar',
  settings: 'sliders-horizontal',
}
type RibbonMenuAction = 'open' | 'preview'

export function Ribbon(): React.JSX.Element {
  const select = useSession((s) => s.select)
  const toggleSettings = useSession((s) => s.toggleSettings)
  const toggleMatrixWindow = useSession((s) => s.toggleMatrixWindow)
  const openMatrixWindow = useSession((s) => s.openMatrixWindow)
  const matrixInWindow = useSession((s) => s.personalization.matrixOpenIn === 'window')
  const matrixTab = useSession((s) => isOpenInTabs(s.tabs, s.pinned, MATRIX_REF))
  const matrixWindowOpen = useSession((s) => s.pageWindow?.kind === 'matrix')
  const mode = useSession((s) => sidebarModeOf(s.personalization))
  const order = useSession((s) => s.personalization.ribbonOrder)
  const experimental = useExperimental()
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const setPersonalization = useSession((s) => s.setPersonalization)
  const keys = resolveOrder(order, experimental)

  const iconFor = (k: RibbonKey): string =>
    k === 'collections'
      ? entityIcon('collection', undefined, defaultIcons)
      : k === 'contexts'
        ? entityIcon('context', undefined, defaultIcons)
        : STATIC_ICON[k]

  const onIcon = (k: RibbonKey): void => {
    const m = MODE_FOR[k]
    if (m) setPersonalization('sidebarMode', m)
    else if (k === 'settings') toggleSettings()
    else if (k === 'matrix') {
      if (matrixInWindow && !matrixTab) toggleMatrixWindow()
      else void select(MATRIX_REF)
    }
  }

  // No trigger: a right-click presents natively whatever the in-app menu preference says.
  const openMenu = async (): Promise<void> => {
    const action = await popMenu<RibbonMenuAction>(
      openOrder<RibbonMenuAction>(
        matrixTab,
        [{ label: openLabel(matrixTab), action: 'open' }],
        [{ label: 'Preview', action: 'preview', disabled: matrixWindowOpen }],
      ),
    )
    if (action === 'open') void select(MATRIX_REF)
    else if (action === 'preview') openMatrixWindow()
  }

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
            icon={iconFor(k)}
            active={MODE_FOR[k] === mode}
            onClick={() => onIcon(k)}
            onMenu={k === 'matrix' ? () => void openMenu() : undefined}
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
