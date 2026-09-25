import { reportRefusal } from '@pommora/core/Interface/Notifications/notifications'
import { useRef, useState } from 'react'
import { coerceScale } from '@pommora/core/Settings/personalization'
import type { OpenIn } from '@pommora/core/Views/viewRow'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { trailOf } from '../../Nexus/treeIndex'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { useSession } from '../../Session/store'
import { findCollection, findSet, findCollectionForSet } from '../../Nexus/treeIndex'
import { pickView } from '../Pipeline/pickView'
import { viewGlyph } from '../viewIcon'
import { PropertyFrame } from '../../Properties/Schema/PropertyFrame'
import { VisibilityFrame } from './VisibilityFrame'
import { LayoutFrame, VIEW_ROWS, type ViewRow, type ViewRowId } from './LayoutFrame'
import { ViewLeaf } from './ViewLeaf'
import { ScalePicker } from '@pommora/core/Settings/ScalePicker'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { PANE_MIN_H, PANE_MIN_W } from '@pommora/uix/Menus/frame-slide.css'
import {
  FooterIconButton,
  FooterLockButton,
  MenuFooting,
  MenuIndex,
  MenuRowView,
  MenuScrollFrame,
  MenuSeparator,
  MenuTopRow,
  pickerRow,
} from '@pommora/uix/Menus'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { IconChoice } from '../../Assets/IconChoice'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { saveViewIn, useViewTileScope } from '../ViewTileScope'
import { lockLabel } from '@pommora/core/Actions/toggleLabels'
import { dialer } from '../../Platform/dialer'

type FrameId = 'configuration' | 'properties' | 'visibility' | ViewRowId

const ENTRIES: ViewRow<FrameId>[] = [
  { id: 'configuration', label: 'Configuration', icon: 'sliders-horizontal' },
  { id: 'properties', label: 'Properties', icon: 'server' },
  { id: 'visibility', label: 'Visibility', icon: 'eye' },
  ...VIEW_ROWS,
]

const OPEN_IN_OPTIONS: PickerOption<OpenIn>[] = [
  { value: 'full-page', label: 'Full Page' },
  { value: 'page-preview', label: 'Preview' },
]

export function SettingsFrame(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const tree = useSession((st) => st.tree)
  const submitRename = useSession((st) => st.submitRename)
  const mutate = useSession((st) => st.mutate)
  const [pane, setPane] = useState<FrameId | 'root'>('root')
  const [iconOpen, setIconOpen] = useState(false)
  const iconRef = useRef<HTMLButtonElement>(null)

  const scope = useViewTileScope()
  const selectionNode =
    selection.kind === 'collection'
      ? findCollection(tree, selection.id)
      : selection.kind === 'set'
        ? findSet(tree, selection.id)
        : undefined
  const node = scope?.source ?? selectionNode
  const schemaCollection =
    node && (node.kind === 'collection' ? node : findCollectionForSet(tree, node.id))
  if (!node || !schemaCollection) return null

  const schema = schemaCollection.properties ?? []
  const view = scope?.view ?? pickView(node, schema)
  const entries = scope ? ENTRIES.filter((e) => e.id !== 'configuration') : ENTRIES
  const configLocked = scope?.locked ?? false
  const frozen = (id: FrameId): boolean => configLocked && id !== 'properties'

  const back = (): void => setPane('root')
  const detailPane = pane === 'root' || frozen(pane) ? null : pane

  const setOpenIn = (open_in: OpenIn): void => {
    void dialer()
      .ask('container:configure', schemaCollection.path, 'collection', { open_in })
      .then(reportRefusal)
  }

  const viewScale = coerceScale(view.view_scale, 1)
  const setViewScale = (f: number): void => {
    const next = coerceScale(f, 1)
    void saveViewIn(scope, node, { ...view, view_scale: next === 1 ? undefined : next })
  }

  const configurationLeaf = (
    <>
      <MenuTopRow label="Settings" current="Configuration" onBack={back} />
      <MenuRowView
        row={pickerRow(
          'layout-grid',
          'Open In',
          schemaCollection.openIn ?? 'full-page',
          OPEN_IN_OPTIONS,
          setOpenIn,
          { iconSize: ICON.rootEntry },
        )}
      />
    </>
  )

  const root = (
    <>
      <InlineEditHeader
        value={scope ? view.name : node.title}
        readOnly={configLocked}
        icon={scope ? viewGlyph(view) : entityIcon(node.kind, node.icon, defaultIcons)}
        iconRef={iconRef}
        iconOpen={iconOpen}
        onIconClick={() => setIconOpen(true)}
        onCommit={(next) => {
          // The header is the VIEW's identity in scope — renaming the source folder from an embed is exactly the mutation the scope exists to prevent.
          if (scope) {
            if (next && next !== view.name) scope.persistConfig({ ...view, name: next })
          } else void submitRename(node.path, node.kind, next)
        }}
      />
      <MenuSeparator flush />
      <MenuIndex
        sections={[
          {
            rows: entries.map((e) => ({
              kind: 'item',
              icon: <Icon name={e.icon} size={ICON.rootEntry} />,
              label: e.label,
              trailing: { kind: 'chevron' },
              disabled: frozen(e.id),
              onSelect: () => setPane(e.id),
            })),
          },
        ]}
      />
    </>
  )

  const footing = (
    <MenuFooting
      leading={<ScalePicker ariaLabel="View Scale" value={viewScale} onPick={setViewScale} />}
      trailing={
        <FooterIconButton icon="ellipsis" ariaLabel="More actions" onClick={() => {}} disabled />
      }
    />
  )
  const plainRoot = <MenuScrollFrame footer={footing}>{root}</MenuScrollFrame>

  const scopedRoot = scope && (
    <MenuScrollFrame
      footer={
        <MenuFooting
          leading={
            <FooterLockButton
              ariaLabel={lockLabel(scope.locked, 'View Configuration')}
              locked={scope.locked}
              onToggle={() => scope.setLocked(!scope.locked)}
            />
          }
          trailing={
            <NavTrail segments={trailOf(tree, node)} iconSize="control" overScroll={false} />
          }
        />
      }
    >
      {root}
    </MenuScrollFrame>
  )

  const detailFor = (id: FrameId): React.JSX.Element => {
    switch (id) {
      case 'configuration':
        return configurationLeaf
      case 'properties':
        return (
          <PropertyFrame
            collectionPath={schemaCollection.path}
            schema={schema}
            onBack={back}
            source={node}
          />
        )
      case 'visibility':
        return (
          <VisibilityFrame
            source={node}
            schema={schema}
            view={view}
            onBack={back}
            current="Visibility"
          />
        )
      case 'layout':
        return (
          <LayoutFrame
            source={node}
            view={view}
            schema={schema}
            door="flat"
            onBack={back}
            onClose={back}
          />
        )
      default:
        return (
          <ViewLeaf
            id={id}
            source={node}
            view={view}
            schema={schema}
            label="Settings"
            onBack={back}
          />
        )
    }
  }

  return (
    <>
      <FrameSlide
        open={detailPane !== null}
        root={scopedRoot || plainRoot}
        detail={detailPane && detailFor(detailPane)}
        minWidth={PANE_MIN_W}
        minHeight={PANE_MIN_H}
      />
      <IconChoice
        open={iconOpen}
        onClose={() => setIconOpen(false)}
        triggerRef={iconRef}
        value={scope ? view.icon : node.icon}
        onSelect={(id) => {
          if (scope) scope.persistConfig({ ...view, icon: id })
          else void mutate({ op: 'setIcon', path: node.path, kind: node.kind, icon: id })
        }}
      />
    </>
  )
}
