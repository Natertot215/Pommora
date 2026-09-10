import { useState } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import {
  type CardBanner,
  isCompact,
  type SavedView,
  VIEW_KINDS,
  VIEW_TYPES,
  type ViewType,
} from '@pommora/core/Views/views'
import { Icon, type IconName } from '@pommora/uix/Symbols'
import {
  MenuIndex,
  MenuSeparator,
  MenuTopRow,
  MenuScrollFrame,
  MenuFooting,
  FootingItem,
} from '@pommora/uix/Menus'
import { footingLabel, footingSymbol } from '@pommora/uix/Menus/menu-base.css'
import { Slider } from '@pommora/uix/Controls/Slider'
import { useSession } from '../../Session/store'
import { useSaveView } from '../ViewTileScope'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { VisibilityList } from './HiddenFrame'
import { switchRows, type SwitchEntry } from './switchRows'
import { PickerControl, type PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { GroupFrame } from './GroupFrame'
import { SortFrame } from './SortFrame'
import { FilterFrame } from './FilterFrame'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { iconForTypeSwitch } from '../viewIcon'
import { VIEW_RENDERERS } from '../Host/ViewHost'
import { ViewItemMenu } from './ViewItemMenu'
import { cx } from '@pommora/uix/Utilities/cx'
import * as vs from './layout-frame.css'

const TABLE_SWITCHES: SwitchEntry[] = [
  {
    icon: 'columns-3-cog',
    label: 'Column Icons',
    key: 'hide_column_icons',
    invert: true,
    defaultOn: true,
  },
  { icon: 'table', label: 'Hide Borders', key: 'hide_borders' },
  { icon: 'file-text', label: 'Page Icons', key: 'hide_page_icons', invert: true },
]

const CARD_SWITCHES: SwitchEntry[] = [
  { icon: 'map', label: 'Hide Location', key: 'hide_location' },
  { icon: 'wrap-text', label: 'Wrap Titles', key: 'wrap_titles' },
  { icon: 'eye-off', label: 'Hide Icons', key: 'hide_page_icons' },
  { icon: 'folder-closed', label: 'Set Cards', key: 'set_cards', defaultOn: true },
]

function ViewSwitches({
  source,
  view,
  switches,
  separated,
}: {
  source: CollectionNode | SetNode
  view: SavedView
  switches: SwitchEntry[]
  separated?: boolean
}): React.JSX.Element {
  const saveView = useSaveView(source)
  return (
    <>
      {separated ? <MenuSeparator flush /> : null}
      <MenuIndex sections={[{ rows: switchRows(switches, view, (next) => void saveView(next)) }]} />
    </>
  )
}

const SCALE_MIN = 0.5
const SCALE_MAX = 1.5

const BANNERS: PickerOption<CardBanner>[] = [
  { value: 'image', label: 'Image' },
  { value: 'preview', label: 'Preview' },
  { value: 'none', label: 'None' },
]

// Live scrub: while the Scale knob drags, push the factor onto the configured view's mounted cards root(s), scoped by data-view-id so a sibling cards view isn't dragged along.
const scrubCardScale = (v: number, viewId: string): void => {
  for (const el of document.querySelectorAll<HTMLElement>(`.cards-view[data-view-id="${viewId}"]`))
    el.style.setProperty('--card-scale', String(v))
}

// KNOB — LayoutFrame's own height ceiling (not the shared MENU_MAX_HEIGHT): the full door stacks the tallest content, so it earns more room.
const VIEWSETTINGS_MAX_HEIGHT = 410
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
  const saveView = useSaveView(source)
  const write = (patch: Partial<SavedView>): void => void saveView({ ...view, ...patch })
  const rename = (name: string): void => {
    if (name && name !== view.name) write({ name })
  }
  const cards = view.type === 'cards'
  const switches = cards ? CARD_SWITCHES : TABLE_SWITCHES
  const setType = (type: ViewType): void => {
    if (type === view.type) return
    const icon = iconForTypeSwitch(view, type)
    write(icon ? { type, icon } : { type })
  }
  const toggleFormat = (): void => write({ format: isCompact(view) ? 'standard' : 'compact' })

  const cardsFooting = cards ? (
    <MenuFooting>
      <FootingItem
        icon="palette"
        label="Style"
        value={isCompact(view) ? 'Compact' : 'Standard'}
        trailing={
          <span className={footingSymbol}>
            <Icon name="chevrons-up-down" size="control" />
          </span>
        }
        onClick={toggleFormat}
      />
      <FootingItem
        icon="image"
        label="Banner"
        trailing={
          <PickerControl
            ariaLabel="Card Banner"
            solid
            value={view.card_banner ?? 'image'}
            options={BANNERS}
            onPick={(v) => write({ card_banner: v })}
          />
        }
      />
      <FootingItem
        icon="scaling"
        label="Size"
        trailing={
          <Slider
            value={view.card_size ?? 1}
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={0.05}
            ariaLabel="Size"
            onInput={(v) => scrubCardScale(v, view.id)}
            onCommit={(v) => write({ card_size: v })}
            format={(v) => `${v.toFixed(2)}x`}
            readoutClassName={footingLabel}
          />
        }
      />
    </MenuFooting>
  ) : null

  const leafPane =
    frame === 'layout' ? (
      cards ? (
        <MenuScrollFrame
          header={<MenuTopRow label="Views" current="Layout" onBack={() => setFrame(null)} />}
          maxHeight={VIEWSETTINGS_MAX_HEIGHT}
        >
          <ViewSwitches source={source} view={view} switches={switches} />
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
          footer={<ViewSwitches source={source} view={view} switches={switches} separated />}
        />
      )
    ) : frame === 'group' ? (
      <GroupFrame
        source={source}
        view={view}
        schema={schema}
        label="Views"
        subGrouping={!VIEW_KINDS[view.type].flat}
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
      {VIEW_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          className={cx(vs.tile, t === view.type && vs.tileSelected)}
          aria-label={VIEW_KINDS[t].label}
          onClick={() => t in VIEW_RENDERERS && setType(t)}
        >
          <Icon name={VIEW_KINDS[t].icon} size="titleMedium" />
        </button>
      ))}
    </div>
  )

  const header =
    door === 'full' ? (
      <MenuTopRow
        label="Views"
        onBack={onBack}
        trailing={<ViewItemMenu source={source} view={view} onDeleted={onClose} />}
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
                icon: <Icon name={r.icon} size="headline" />,
                label: r.label,
                trailing: { kind: 'chevron' },
                onSelect: () => setFrame(r.id),
              })),
            },
          ]}
        />
      ) : (
        <ViewSwitches source={source} view={view} switches={switches} separated />
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
