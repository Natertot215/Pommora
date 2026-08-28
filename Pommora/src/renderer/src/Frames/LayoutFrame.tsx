import { useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import {
  type CardBanner,
  DEFAULT_VIEW_ID,
  isCompact,
  type SavedView,
  type ViewType,
} from '@shared/views'
import { Icon, type IconName } from '@renderer/DesignSystem/Symbols'
import {
  MenuIndex,
  MenuItem,
  MenuSeparator,
  MenuTopRow,
  MenuScrollFrame,
  MenuFooting,
  AccessoryButton,
} from '@renderer/DesignSystem/Menus'
import { footingLabel, footingSymbol } from '@renderer/DesignSystem/Menus/menu-base.css'
import { PickerMenu } from '@renderer/DesignSystem/Components/Pickers/PickerMenu'
import { Slider } from '@renderer/DesignSystem/Components/Controls/Slider/Slider'
import { useSession } from '../store'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { InlineEditHeader } from './InlineEditHeader'
import { VisibilityList } from './HiddenFrame'
import { LayoutToggles } from './LayoutToggles'
import { CardsOptions } from './CardsOptions'
import { PickerControl, type PickerChoice } from '@renderer/DesignSystem/Elements/PickerControl'
import { GroupFrame } from './GroupFrame'
import { SortFrame } from './SortFrame'
import { FilterFrame } from './FilterFrame'
import { FrameSlide } from '@renderer/DesignSystem/Menus/frame-slide'
import { iconForTypeSwitch } from './viewIcon'
import { cx } from '@renderer/DesignSystem/Util/cx'
import * as vs from './layoutFrame.css'

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

const BANNERS: PickerChoice<CardBanner>[] = [
  { value: 'cover', label: 'Cover' },
  { value: 'preview', label: 'Preview' },
  { value: 'none', label: 'None' },
]

// Live scrub: while the Scale knob drags, push the factor straight onto the configured view's mounted
// cards root(s) — scoped by data-view-id so a sibling cards view on the same surface isn't dragged
// along (its own card_size never changed, so React wouldn't reassert it). No per-tick save, no churn.
const scrubCardScale = (v: number, viewId: string): void => {
  for (const el of document.querySelectorAll<HTMLElement>(`.cards-view[data-view-id="${viewId}"]`))
    el.style.setProperty('--card-scale', String(v))
}

// ── KNOB — LayoutFrame's own height ceiling (its own, not the shared MENU_MAX_HEIGHT): the full door
// stacks the tallest content (title + grid + four frame rows + the pinned footing), so it earns more
// room before the body scrolls. Applies to the editor + its Layout frame. ──
const VIEWSETTINGS_MAX_HEIGHT = 410
// ── KNOB — the frame slider's floors (matches the SettingsFrame sibling): a blank Group/Filter/Sort frame
// reserves this square instead of collapsing to a bare header strip mid-slide. ──
const LEAF_MIN_WIDTH = 225
const LEAF_MIN_HEIGHT = 245

type Frame = 'layout' | 'group' | 'filter' | 'sort'
const FRAME_ROWS: { id: Frame; label: string; icon: IconName }[] = [
  { id: 'layout', label: 'Layout', icon: 'layout-dashboard' },
  { id: 'group', label: 'Group', icon: 'layers' },
  { id: 'filter', label: 'Filter', icon: 'list-filter' },
  { id: 'sort', label: 'Sort', icon: 'arrow-up-down' },
]
const LEAF_CURRENT: Record<Exclude<Frame, 'layout'>, string> = {
  group: 'Grouping',
  filter: 'Filtering',
  sort: 'Sorting',
}

export function LayoutFrame({
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
  const tree = useSession((s) => s.tree)
  const [frame, setFrame] = useState<Frame | null>(null)
  const [itemMenuOpen, setItemMenuOpen] = useState(false)
  const itemMenuRef = useRef<HTMLButtonElement>(null)
  const views = source.views ?? []
  const canDelete = views.length > 1 && view.id !== DEFAULT_VIEW_ID

  const saveView = useSaveView(source)
  const write = (patch: Partial<SavedView>): void => void saveView({ ...view, ...patch })
  const rename = (name: string): void => {
    if (name && name !== view.name) write({ name })
  }
  const setType = (type: ViewType): void => {
    if (type === view.type) return
    const icon = iconForTypeSwitch(view.icon, view.type, type, TYPE_GLYPH)
    write(icon ? { type, icon } : { type })
  }
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
  }
  const deleteView = async (): Promise<void> => {
    await window.nexus.views.delete(source.path, source.kind, view.id)
    onClose()
  }

  const cardsFooting =
    view.type === 'cards' ? (
      <MenuFooting>
        <MenuItem
          leading={
            <span className={footingSymbol}>
              <Icon name="palette" size="control" />
            </span>
          }
          value={isCompact(view) ? 'Compact' : 'Standard'}
          trailing={
            <span className={footingSymbol}>
              <Icon name="chevrons-up-down" size="control" />
            </span>
          }
          onClick={toggleFormat}
        >
          <span className={footingLabel}>Style</span>
        </MenuItem>
        <MenuItem
          leading={
            <span className={footingSymbol}>
              <Icon name="image" size="control" />
            </span>
          }
          trailing={
            <PickerControl
              ariaLabel="Card Banner"
              value={view.card_banner ?? 'cover'}
              options={BANNERS}
              onPick={(v) => write({ card_banner: v })}
              solid
              footing
            />
          }
        >
          <span className={footingLabel}>Banner</span>
        </MenuItem>
        <MenuItem
          leading={
            <span className={footingSymbol}>
              <Icon name="scaling" size="control" />
            </span>
          }
          trailing={
            <Slider
              value={view.card_size ?? 1}
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={0.05}
              ariaLabel="Scale"
              onInput={(v) => scrubCardScale(v, view.id)}
              onCommit={(v) => write({ card_size: v })}
              format={(v) => `${v.toFixed(2)}x`}
              readoutClassName={footingLabel}
            />
          }
        >
          <span className={footingLabel}>Scale</span>
        </MenuItem>
      </MenuFooting>
    ) : null

  const leafPane =
    frame === 'layout' ? (
      view.type === 'cards' ? (
        <MenuScrollFrame
          header={<MenuTopRow label="Views" current="Layout" onBack={() => setFrame(null)} />}
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
          onBack={() => setFrame(null)}
          footer={<LayoutToggles source={source} view={view} />}
        />
      )
    ) : frame === 'group' ? (
      <GroupFrame
        source={source}
        view={view}
        schema={schema}
        label="Views"
        subGrouping={view.type !== 'cards'}
        onBack={() => setFrame(null)}
      />
    ) : frame === 'sort' ? (
      <SortFrame
        source={source}
        view={view}
        schema={schema}
        label="Views"
        onBack={() => setFrame(null)}
      />
    ) : frame === 'filter' ? (
      <FilterFrame
        key={view.id}
        source={source}
        view={view}
        schema={schema}
        tree={tree}
        label="Views"
        onBack={() => setFrame(null)}
      />
    ) : frame ? (
      <MenuTopRow label="Views" current={LEAF_CURRENT[frame]} onBack={() => setFrame(null)} />
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
          <Icon name={TYPE_GLYPH[t]} size="title1" />
        </button>
      ))}
    </div>
  )

  const header =
    door === 'full' ? (
      <MenuTopRow
        label="Views"
        onBack={onBack}
        trailing={
          <>
            <AccessoryButton
              ref={itemMenuRef}
              icon="ellipsis-vertical"
              size="body"
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
                leading={<Icon name="copy" size="body" />}
                onClick={() => {
                  setItemMenuOpen(false)
                  void duplicateView()
                }}
              >
                Duplicate
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                disabled={!canDelete}
                leading={<Icon name="trash" size="body" />}
                onClick={() => {
                  setItemMenuOpen(false)
                  void deleteView()
                }}
              >
                Delete
              </MenuItem>
            </PickerMenu>
          </>
        }
      />
    ) : (
      <MenuTopRow label="Settings" current="Layout" onBack={onBack} />
    )

  const mainFrame = (
    <MenuScrollFrame header={header} footer={cardsFooting} maxHeight={VIEWSETTINGS_MAX_HEIGHT}>
      {door === 'full' && (
        <>
          {title}
          <MenuSeparator flush />
        </>
      )}
      {grid}
      {door === 'full' ? (
        <MenuIndex
          sections={[
            {
              rows: FRAME_ROWS.map((r) => ({
                kind: 'item',
                icon: <Icon name={r.icon} size="title3" />,
                label: r.label,
                trailing: { kind: 'chevron' },
                onSelect: () => setFrame(r.id),
              })),
            },
          ]}
        />
      ) : view.type === 'table' ? (
        <LayoutToggles source={source} view={view} />
      ) : (
        <>
          <MenuSeparator flush />
          <CardsOptions source={source} view={view} />
        </>
      )}
    </MenuScrollFrame>
  )

  return (
    <FrameSlide
      open={frame !== null}
      root={mainFrame}
      detail={leafPane}
      minWidth={LEAF_MIN_WIDTH}
      minHeight={LEAF_MIN_HEIGHT}
    />
  )
}
