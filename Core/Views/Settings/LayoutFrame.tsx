import { useState } from 'react'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import { type SavedView, VIEW_KINDS, VIEW_TYPES, type ViewType, type ViewWriter } from '../views'
import { Icon, type IconName } from '@pommora/uix/Symbols'
import { MenuIndex } from '@pommora/uix/Menus/MenuIndex'
import {
  AccessoryButton,
  type MenuBack,
  MenuSeparator,
  MenuTopRow,
  MenuScrollFrame,
} from '@pommora/uix/Menus/MenuRows'
import { ICON, SETTINGS_PANE_FLOOR, SETTINGS_PANE_MAX_HEIGHT } from '@pommora/uix/Menus/frames.css'
import { useSaveView } from '../viewWrite'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { useIconChoice } from '../../Assets/IdentityChoice'
import { VisibilityFrame } from './VisibilityFrame'
import { switchRows } from './switchRows'
import { ViewLeaf, type ViewLeafId } from './ViewLeaf'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { iconForTypeSwitch, viewGlyph } from '../viewIcon'
import { cx } from '@pommora/uix/Utilities/cx'
import * as vs from './layout-frame.css'
import { BUILT_KINDS, presentedKind, type SwitchEntry } from '../Host/viewKinds'
import { TABLE_KIND } from '../Table/tableKind'

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
      <MenuIndex
        sections={[{ rows: switchRows(switches, view, (patch) => void saveView(view, patch)) }]}
      />
    </>
  )
}

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

export function LayoutFrame(
  props: {
    source: CollectionNode | SetNode
    view: SavedView
    back: MenuBack
  } & (
    | { door: 'flat' }
    | { door: 'full'; schema: PropertyDefinition[]; onMenu: (trigger: HTMLElement) => void }
  ),
): React.JSX.Element {
  const { source, view, back } = props
  const [frame, setFrame] = useState<ViewRowId | null>(null)
  const saveView = useSaveView(source)
  const write: ViewWriter = (patch) => saveView(view, patch)
  const iconChoice = useIconChoice(view.icon, (icon) => write({ icon }))
  const kind = presentedKind(view.type)
  const setType = (type: ViewType): void => {
    if (type === view.type) return
    const icon = iconForTypeSwitch(view, type)
    write(icon ? { type, icon } : { type })
  }

  const kindRows = kind.layout.rows ? (
    <>
      <MenuSeparator flush />
      <MenuIndex sections={[{ rows: kind.layout.rows(view, write) }]} />
    </>
  ) : null

  const grid = (
    <div className={vs.grid}>
      {VIEW_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          className={cx(vs.tile, t === view.type && vs.tileSelected)}
          aria-label={VIEW_KINDS[t].label}
          onClick={() => t in BUILT_KINDS && setType(t)}
        >
          <Icon name={VIEW_KINDS[t].icon} size="titleMedium" />
        </button>
      ))}
    </div>
  )

  if (props.door === 'flat')
    return (
      <MenuScrollFrame
        header={<MenuTopRow {...back} current="Layout" />}
        footer={kindRows}
        maxHeight={SETTINGS_PANE_MAX_HEIGHT}
      >
        {grid}
        <ViewSwitches source={source} view={view} switches={kind.layout.switches} separated />
      </MenuScrollFrame>
    )

  const rename = (name: string): void => {
    if (name && name !== view.name) write({ name })
  }
  const toView: MenuBack = { label: 'Views', onBack: () => setFrame(null) }
  const leafFor = (id: ViewRowId): React.JSX.Element => {
    if (id !== 'layout')
      return <ViewLeaf id={id} source={source} view={view} schema={props.schema} back={toView} />
    if (kind !== TABLE_KIND)
      return (
        <MenuScrollFrame
          header={<MenuTopRow {...toView} current="Layout" />}
          maxHeight={SETTINGS_PANE_MAX_HEIGHT}
        >
          <ViewSwitches source={source} view={view} switches={kind.layout.switches} />
        </MenuScrollFrame>
      )
    return (
      <VisibilityFrame
        source={source}
        schema={props.schema}
        view={view}
        back={toView}
        current="Layout"
        footer={
          <ViewSwitches source={source} view={view} switches={kind.layout.switches} separated />
        }
      />
    )
  }

  const mainFrame = (
    <MenuScrollFrame
      header={
        <MenuTopRow
          {...back}
          trailing={
            <AccessoryButton
              icon="ellipsis-vertical"
              size={ICON.editorMenu}
              ariaLabel="View Menu"
              onClick={(e) => props.onMenu(e.currentTarget)}
            />
          }
        />
      }
      footer={kindRows}
      maxHeight={SETTINGS_PANE_MAX_HEIGHT}
    >
      <InlineEditHeader
        value={view.name}
        icon={viewGlyph(view)}
        onCommit={rename}
        {...iconChoice}
      />
      <MenuSeparator flush />
      {grid}
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
    </MenuScrollFrame>
  )

  return (
    <FrameSlide
      {...SETTINGS_PANE_FLOOR}
      open={frame !== null}
      root={mainFrame}
      detail={frame && leafFor(frame)}
    />
  )
}
