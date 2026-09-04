import type { SidebarMode } from '@shared/types'
import { Icon, entityIcon } from '@renderer/DesignSystem/Symbols'
import { reorder, SortableZone, useDragItem } from '@renderer/Interactions/drag'
import { useSession } from '../store'
import { NexusPhoto } from './NexusPhoto'
import './Sidebar.css'

// Navigation and settings each toggle their floating window instead of switching sidebarMode — the
// icon that summoned a window dismisses it, matching the keyboard command that shares the state.
type RibbonKey = 'navigation' | 'agenda' | 'contexts' | 'collections' | 'settings'
const MODE_FOR: Partial<Record<RibbonKey, SidebarMode>> = {
  collections: 'collections',
  contexts: 'contexts',
  agenda: 'agenda',
}
const STATIC_ICON: Record<'agenda' | 'navigation' | 'settings', string> = {
  agenda: 'calendar',
  navigation: 'map',
  settings: 'sliders-horizontal',
}
const DEFAULT_ORDER: RibbonKey[] = ['navigation', 'agenda', 'contexts', 'collections', 'settings']

function resolveOrder(persisted: string[] | undefined): RibbonKey[] {
  const known = new Set<string>(DEFAULT_ORDER)
  const keys = (persisted ?? []).filter((k): k is RibbonKey => known.has(k))
  for (const k of DEFAULT_ORDER) if (!keys.includes(k)) keys.push(k)
  return keys
}

export function Ribbon(): React.JSX.Element {
  const select = useSession((s) => s.select)
  const toggleNav = useSession((s) => s.toggleNav)
  const toggleSettings = useSession((s) => s.toggleSettings)
  const mode = useSession((s) => s.personalization.sidebarMode ?? 'collections')
  const order = useSession((s) => s.personalization.ribbonOrder)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const setPersonalization = useSession((s) => s.setPersonalization)
  const keys = resolveOrder(order)

  const iconFor = (k: RibbonKey): string =>
    k === 'collections'
      ? entityIcon('collection', undefined, defaultIcons)
      : k === 'contexts'
        ? entityIcon('context', undefined, defaultIcons)
        : STATIC_ICON[k]

  const onIcon = (k: RibbonKey): void => {
    const m = MODE_FOR[k]
    if (m) setPersonalization('sidebarMode', m)
    else if (k === 'navigation') toggleNav()
    else if (k === 'settings') toggleSettings()
  }

  const reorderIcons = (activeId: string, overId: string): void => {
    const next = reorder(
      keys.map((id) => ({ id })),
      activeId,
      overId,
    ).map((x) => x.id)
    setPersonalization('ribbonOrder', next)
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
      <SortableZone items={keys} layout="list" axis="y" onReorder={reorderIcons}>
        {keys.map((k) => (
          <RibbonTab
            key={k}
            tabKey={k}
            icon={iconFor(k)}
            active={MODE_FOR[k] === mode}
            onClick={() => onIcon(k)}
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
}: {
  tabKey: RibbonKey
  icon: string
  active: boolean
  onClick: () => void
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
    >
      <Icon name={icon} size="titleSmall" />
    </button>
  )
}
