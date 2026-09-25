import { useState } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import {
  type CardBanner,
  isCompact,
  type SavedView,
  type ViewFormat,
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
  steppedRow,
  pickerRow,
} from '@pommora/uix/Menus'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { useSaveView } from '../ViewTileScope'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { VisibilityFrame } from './VisibilityFrame'
import { switchRows, type SwitchEntry } from './switchRows'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { ViewLeaf, type ViewLeafId } from './ViewLeaf'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { PANE_MIN_H, PANE_MIN_W } from '@pommora/uix/Menus/frame-slide.css'
import { iconForTypeSwitch } from '../viewIcon'
import { ViewItemMenu } from './ViewItemMenu'
import { coerceTenthsScale, TENTHS_SCALE } from '@pommora/core/Settings/personalization'
import { cx } from '@pommora/uix/Utilities/cx'
import * as vs from './layout-frame.css'

interface LayoutOptions {
  switches: SwitchEntry[]
  cardRows: boolean
  leaf: 'visibility' | 'switches'
}

const TABLE_LAYOUT: LayoutOptions = {
  switches: [
    {
      icon: 'columns-3-cog',
      label: 'Column Icons',
      key: 'hide_column_icons',
      invert: true,
      defaultOn: true,
    },
    { icon: 'view-table', label: 'Hide Borders', key: 'hide_borders' },
    { icon: 'file-text', label: 'Page Icons', key: 'hide_page_icons', invert: true },
  ],
  cardRows: false,
  leaf: 'visibility',
}

const LAYOUT_OPTIONS: Partial<Record<ViewType, LayoutOptions>> = {
  table: TABLE_LAYOUT,
  cards: {
    switches: [
      { icon: 'map', label: 'Hide Location', key: 'hide_location' },
      { icon: 'wrap-text', label: 'Wrap Titles', key: 'wrap_titles' },
      { icon: 'eye-off', label: 'Hide Icons', key: 'hide_page_icons' },
      { icon: 'folder-closed', label: 'Set Cards', key: 'set_cards', defaultOn: true },
    ],
    cardRows: true,
    leaf: 'switches',
  },
}

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

const BANNERS: PickerOption<CardBanner>[] = [
  { value: 'preview', label: 'Preview' },
  { value: 'banner', label: 'Banner' },
  { value: 'none', label: 'None' },
]

const FORMATS: PickerOption<ViewFormat>[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'standard', label: 'Standard' },
]

const CARD_ROW_LOOK = { iconSize: ICON.rootEntry, solid: true } as const

// KNOB — LayoutFrame's own height ceiling (not the shared MENU_MAX_HEIGHT): the full door stacks the tallest content, so it earns more room.
const VIEWSETTINGS_MAX_HEIGHT = 410

export type ViewRowId = 'layout' | ViewLeafId
export interface ViewRow<Id extends string = ViewRowId> {
  id: Id
  label: string
  icon: IconName
}

export const VIEW_ROWS: ViewRow[] = [
  { id: 'layout', label: 'Layout', icon: 'layout-dashboard' },
  { id: 'group', label: 'Group', icon: 'layers' },
  { id: 'filter', label: 'Filter', icon: 'list-filter' },
  { id: 'sort', label: 'Sort', icon: 'arrow-up-down' },
]

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
  const [frame, setFrame] = useState<ViewRowId | null>(null)
  const saveView = useSaveView(source)
  const write = (patch: Partial<SavedView>): void => void saveView({ ...view, ...patch })
  const rename = (name: string): void => {
    if (name && name !== view.name) write({ name })
  }
  const options = LAYOUT_OPTIONS[view.type] ?? TABLE_LAYOUT
  const setType = (type: ViewType): void => {
    if (type === view.type) return
    const icon = iconForTypeSwitch(view, type)
    write(icon ? { type, icon } : { type })
  }

  const cardsRows = options.cardRows ? (
    <>
      <MenuSeparator flush />
      <MenuIndex
        sections={[
          {
            rows: [
              pickerRow(
                'image',
                'Card Image',
                view.card_banner ?? 'banner',
                BANNERS,
                (v) => write({ card_banner: v }),
                CARD_ROW_LOOK,
              ),
              pickerRow(
                'palette',
                'Card Style',
                isCompact(view) ? 'compact' : 'standard',
                FORMATS,
                (v) => write({ format: v }),
                CARD_ROW_LOOK,
              ),
              steppedRow(
                'scaling',
                'Card Scale',
                {
                  steps: TENTHS_SCALE.steps,
                  value: coerceTenthsScale(view.card_size),
                  onPick: (v) => write({ card_size: v === TENTHS_SCALE.default ? undefined : v }),
                },
                CARD_ROW_LOOK,
              ),
            ],
          },
        ]}
      />
    </>
  ) : null

  const closeLeaf = (): void => setFrame(null)
  const leafFor = (id: ViewRowId): React.JSX.Element => {
    if (id !== 'layout')
      return (
        <ViewLeaf
          id={id}
          source={source}
          view={view}
          schema={schema}
          label="Views"
          onBack={closeLeaf}
        />
      )
    if (options.leaf === 'switches')
      return (
        <MenuScrollFrame
          header={<MenuTopRow label="Views" current="Layout" onBack={closeLeaf} />}
          maxHeight={VIEWSETTINGS_MAX_HEIGHT}
        >
          <ViewSwitches source={source} view={view} switches={options.switches} />
        </MenuScrollFrame>
      )
    return (
      <VisibilityFrame
        source={source}
        schema={schema}
        view={view}
        label="Views"
        current="Layout"
        maxHeight={VIEWSETTINGS_MAX_HEIGHT}
        onBack={closeLeaf}
        footer={<ViewSwitches source={source} view={view} switches={options.switches} separated />}
      />
    )
  }

  const title = <InlineEditHeader value={view.name} onCommit={rename} />
  const grid = (
    <div className={vs.grid}>
      {VIEW_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          className={cx(vs.tile, t === view.type && vs.tileSelected)}
          aria-label={VIEW_KINDS[t].label}
          onClick={() => t in LAYOUT_OPTIONS && setType(t)}
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
    <MenuScrollFrame header={header} footer={cardsRows} maxHeight={VIEWSETTINGS_MAX_HEIGHT}>
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
              rows: VIEW_ROWS.map((r) => ({
                kind: 'item',
                icon: <Icon name={r.icon} size={ICON.rootEntry} />,
                label: r.label,
                trailing: { kind: 'chevron' },
                onSelect: () => setFrame(r.id),
              })),
            },
          ]}
        />
      ) : (
        <ViewSwitches source={source} view={view} switches={options.switches} separated />
      )}
    </MenuScrollFrame>
  )

  return (
    <FrameSlide
      open={frame !== null}
      root={mainFrame}
      detail={frame && leafFor(frame)}
      minWidth={PANE_MIN_W}
      minHeight={PANE_MIN_H}
    />
  )
}
