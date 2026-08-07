import { useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import { DEFAULT_VIEW_ID, isCompact, type SavedView, type ViewType } from '@shared/views'
import { Icon, type IconName } from '@renderer/design-system/symbols'
import {
  MenuItem,
  MenuSeparator,
  MenuPaneTopRow,
  MenuScrollFrame,
  MenuBottomRow,
  AccessoryButton,
} from '../../design-system/components/menu'
import {
  detail,
  flushTrailing,
  footingLabel,
  footingSymbol,
  item,
  rowDisabled,
  side,
} from '../../design-system/components/menu/menu.css'
import { PickerMenu } from '../../design-system/components/PickerMenu'
import { Slider } from '../../design-system/components/Slider/Slider'
import { useSession } from '../../store'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { InlineEditHeader } from './InlineEditHeader'
import { VisibilityList } from './HiddenPane'
import { LayoutToggles } from './LayoutToggles'
import { CardsOptions } from './CardsOptions'
import { GroupingPane } from './GroupingPane'
import { SortingPane } from './SortingPane'
import { FilterPane } from './FilterPane'
import { PaneSlider } from './PaneSlider'
import { iconForTypeSwitch } from './viewIcon'
import { cx } from '../../design-system/cx'
import * as vs from './viewSettings.css'

// Unimplemented types render at full weight but their tiles are inert.
const TYPE_ORDER: ViewType[] = ['table', 'cards', 'list', 'gallery', 'calendar', 'timeline']
const TYPE_GLYPH: Record<ViewType, IconName> = {
  table: 'table',
  cards: 'cards-grid',
  list: 'list-rounded',
  gallery: 'layout-dashboard',
  calendar: 'calendar-days',
  timeline: 'chart-gantt',
}
const IMPLEMENTED: ReadonlySet<ViewType> = new Set(['table', 'cards'])

const SCALE_MIN = 0.5
const SCALE_MAX = 1.5

// Live scrub: while the Scale knob drags, push the factor straight onto the configured view's mounted
// cards root(s) — scoped by data-view-id so a sibling cards view on the same surface isn't dragged
// along (its own card_size never changed, so React wouldn't reassert it). No per-tick save, no churn.
const scrubCardScale = (v: number, viewId: string): void => {
  for (const el of document.querySelectorAll<HTMLElement>(`.cards-view[data-view-id="${viewId}"]`))
    el.style.setProperty('--card-scale', String(v))
}

// ── KNOB — ViewSettings' own height ceiling (its own, not the shared MENU_MAX_HEIGHT): the full door
// stacks the tallest content (title + grid + four leaf rows + the pinned footing), so it earns more
// room before the body scrolls. Applies to the editor + its Layout leaf. ──
const VIEWSETTINGS_MAX_HEIGHT = 375
// ── KNOB — the leaf slider's floors (matches the SettingsPane sibling): a blank Group/Filter/Sort leaf
// reserves this square instead of collapsing to a bare header strip mid-slide. ──
const LEAF_MIN_WIDTH = 225
const LEAF_MIN_HEIGHT = 245

// So the view config is reachable without the dropdown (the future Toolbar mode).
type Leaf = 'layout' | 'group' | 'filter' | 'sort'
const LEAF_ROWS: { id: Leaf; label: string; icon: IconName }[] = [
  { id: 'layout', label: 'Layout', icon: 'layout-dashboard' },
  { id: 'group', label: 'Group', icon: 'layers' },
  { id: 'filter', label: 'Filter', icon: 'list-filter' },
  { id: 'sort', label: 'Sort', icon: 'arrow-up-down' },
]
const LEAF_CURRENT: Record<Exclude<Leaf, 'layout'>, string> = {
  group: 'Grouping',
  filter: 'Filtering',
  sort: 'Sorting',
}

/**
 * The full door (a ViewPane row's chevron) carries the ⋮ (Duplicate/Delete) + the
 * Layout/Group/Filter/Sort leaf rows; the flat door (SettingsPane → Layout) drops the ⋮ and the
 * leaf rows and reads `Settings · Layout`.
 */
export function ViewSettings({
  source,
  view,
  schema,
  door,
  onBack,
  onClose,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  schema: PropertyDefinition[]
  door: 'full' | 'flat'
  onBack: () => void
  onClose: () => void
}): React.JSX.Element {
  const load = useSession((s) => s.load)
  const tree = useSession((s) => s.tree)
  const [leaf, setLeaf] = useState<Leaf | null>(null)
  const [itemMenuOpen, setItemMenuOpen] = useState(false)
  const itemMenuRef = useRef<HTMLButtonElement>(null)
  const views = source.views ?? []
  const canDelete = views.length > 1 && view.id !== DEFAULT_VIEW_ID

  const saveView = useSaveView(source, load)
  const write = (patch: Partial<SavedView>): void => void saveView({ ...view, ...patch })
  const rename = (name: string): void => {
    if (name && name !== view.name) write({ name })
  }
  const setType = (type: ViewType): void => {
    if (type === view.type) return
    // Re-icon to the new type's glyph only when the view still wears the old default;
    // a custom icon is preserved.
    const icon = iconForTypeSwitch(view.icon, view.type, type, TYPE_GLYPH)
    write(icon ? { type, icon } : { type })
  }
  // Two-option double-chevron = a direct toggle, never a dropdown (the Open In idiom).
  const toggleFormat = (): void => write({ format: isCompact(view) ? 'standard' : 'compact' })

  const duplicateView = async (): Promise<void> => {
    const res = await window.nexus.views.save(source.path, source.kind, {
      ...view,
      id: DEFAULT_VIEW_ID,
    })
    if (res.ok) {
      const ids = views.map((v) => v.id).filter((id) => id !== res.value.id)
      const at = ids.indexOf(view.id)
      ids.splice(at < 0 ? ids.length : at + 1, 0, res.value.id)
      await window.nexus.views.reorder(source.path, source.kind, ids)
    }
    await load()
  }
  const deleteView = async (): Promise<void> => {
    await window.nexus.views.delete(source.path, source.kind, view.id)
    onClose()
    await load()
  }

  const formatToggle = (glyph: IconName, label: string): React.JSX.Element => (
    <MenuItem
      className={flushTrailing}
      leading={
        <span className={footingSymbol}>
          <Icon name={glyph} size={12} />
        </span>
      }
      trailing={
        <span className={side}>
          <span className={detail}>{isCompact(view) ? 'Compact' : 'Standard'}</span>
          <span className={footingSymbol}>
            <Icon name="chevrons-up-down" size={12} />
          </span>
        </span>
      }
      onClick={toggleFormat}
    >
      <span className={footingLabel}>{label}</span>
    </MenuItem>
  )

  const cardsFooting =
    view.type === 'cards' ? (
      <MenuBottomRow>
        {formatToggle('cards-grid', 'Style')}
        <div className={cx(item, flushTrailing, vs.scaleRow)}>
          <span className={side}>
            <span className={footingSymbol}>
              <Icon name="scaling" size={12} />
            </span>
          </span>
          <span className={footingLabel}>Scale</span>
          <Slider
            value={view.card_size ?? 1}
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={0.05}
            ariaLabel="Scale"
            onInput={(v) => scrubCardScale(v, view.id)}
            onCommit={(v) => write({ card_size: v })}
            format={(v) => `${v.toFixed(2)}x`}
            readoutClassName={detail}
          />
        </div>
      </MenuBottomRow>
    ) : null

  // Only mounted while a leaf is open, so a push measures it before the flip.
  const leafPane =
    leaf === 'layout' ? (
      view.type === 'cards' ? (
        <MenuScrollFrame
          header={<MenuPaneTopRow label="Views" current="Layout" onBack={() => setLeaf(null)} />}
          maxHeight={VIEWSETTINGS_MAX_HEIGHT}
        >
          <CardsOptions source={source} view={view} />
        </MenuScrollFrame>
      ) : (
        <VisibilityList
          source={source}
          schema={schema}
          view={view}
          label="Views"
          current="Layout"
          maxHeight={VIEWSETTINGS_MAX_HEIGHT}
          onBack={() => setLeaf(null)}
          footer={<LayoutToggles source={source} view={view} />}
        />
      )
    ) : leaf === 'group' ? (
      <GroupingPane
        source={source}
        view={view}
        schema={schema}
        label="Views"
        subGrouping={view.type !== 'cards'}
        onBack={() => setLeaf(null)}
      />
    ) : leaf === 'sort' ? (
      <SortingPane
        source={source}
        view={view}
        schema={schema}
        label="Views"
        onBack={() => setLeaf(null)}
      />
    ) : leaf === 'filter' ? (
      <FilterPane
        key={view.id}
        source={source}
        view={view}
        schema={schema}
        tree={tree}
        label="Views"
        onBack={() => setLeaf(null)}
      />
    ) : leaf ? (
      <MenuPaneTopRow label="Views" current={LEAF_CURRENT[leaf]} onBack={() => setLeaf(null)} />
    ) : null

  const title = <InlineEditHeader value={view.name} onCommit={rename} />
  const grid = (
    <div className={vs.grid}>
      {TYPE_ORDER.map((t) => (
        <button
          key={t}
          type="button"
          className={cx(vs.tile, t === view.type && vs.tileSelected)}
          aria-label={t}
          onClick={() => IMPLEMENTED.has(t) && setType(t)}
        >
          <Icon name={TYPE_GLYPH[t]} size={24} />
        </button>
      ))}
    </div>
  )

  const header =
    door === 'full' ? (
      <MenuPaneTopRow
        label="Views"
        onBack={onBack}
        trailing={
          <>
            <AccessoryButton
              ref={itemMenuRef}
              icon="ellipsis-vertical"
              size={14}
              box={20}
              ariaLabel="View menu"
              onClick={() => setItemMenuOpen(true)}
            />
            <PickerMenu
              solid
              open={itemMenuOpen}
              onDismiss={() => setItemMenuOpen(false)}
              triggerRef={itemMenuRef}
            >
              <MenuItem
                leading={<Icon name="copy" size={13} />}
                onClick={() => {
                  setItemMenuOpen(false)
                  void duplicateView()
                }}
              >
                Duplicate
              </MenuItem>
              <MenuSeparator />
              {/* Refusing the last view is the write path's rule; the row mirrors it rather than
                  offering a click that would only bounce. */}
              <MenuItem
                className={canDelete ? undefined : rowDisabled}
                leading={<Icon name="trash" size={13} />}
                onClick={
                  canDelete
                    ? () => {
                        setItemMenuOpen(false)
                        void deleteView()
                      }
                    : undefined
                }
              >
                Delete
              </MenuItem>
            </PickerMenu>
          </>
        }
      />
    ) : (
      <MenuPaneTopRow label="Settings" current="Layout" onBack={onBack} />
    )

  const leafRow = (r: (typeof LEAF_ROWS)[number]): React.JSX.Element => (
    <MenuItem
      key={r.id}
      className={flushTrailing}
      leading={<Icon name={r.icon} size={16} />}
      trailing={<Icon name="chevron-right" size={16} />}
      onClick={() => setLeaf(r.id)}
    >
      {r.label}
    </MenuItem>
  )
  const mainFrame = (
    <MenuScrollFrame
      header={header}
      footer={view.type === 'cards' ? cardsFooting : null}
      maxHeight={VIEWSETTINGS_MAX_HEIGHT}
    >
      {/* The full door carries its own click-to-edit identity; the flat door (SettingsPane → Layout)
          drops it — the TopRow already names the view, so a second title + divider is redundant. */}
      {door === 'full' && (
        <>
          {title}
          <MenuSeparator flush />
        </>
      )}
      {grid}
      {door === 'full' ? (
        LEAF_ROWS.map(leafRow)
      ) : view.type === 'table' ? (
        <LayoutToggles source={source} view={view} />
      ) : (
        <CardsOptions source={source} view={view} />
      )}
    </MenuScrollFrame>
  )

  // Nested here so a full-door leaf slides in over the editor instead of hard-swapping. The flat
  // door never opens a leaf, so this stays parked on the main frame.
  return (
    <PaneSlider
      open={leaf !== null}
      root={mainFrame}
      detail={leafPane}
      minWidth={LEAF_MIN_WIDTH}
      minHeight={LEAF_MIN_HEIGHT}
    />
  )
}
