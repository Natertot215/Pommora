import { useState } from 'react'
import { ZOOM } from '../../Settings/personalization'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { trailOf } from '../../Nexus/treeIndex'
import { SETTINGS_PANE_FLOOR } from '@pommora/uix/Menus/frames.css'
import { useSession } from '../../Session/store'
import { personalizationOf } from '../../Session/configSlice'
import { containerSchema, findContainerById, owningCollection } from '../../Nexus/treePatch'
import { isContainer } from '../../Nexus/entities'
import { viewGlyph } from '../viewIcon'
import { PropertyFrame } from '../../Properties/Schema/PropertyFrame'
import { chevronRows, type SettingsPane, VIEW_PANES, ViewPane, type ViewPaneId } from './ViewPane'
import { ScalePicker } from '../../Settings/ScalePicker'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { MenuIndex } from '@pommora/uix/Menus/MenuIndex'
import {
  FooterIconButton,
  FooterLockButton,
  type MenuBack,
  MenuFooting,
  MenuScrollFrame,
  MenuSeparator,
} from '@pommora/uix/Menus/MenuRows'
import { useIconChoice } from '../../Assets/IdentityChoice'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { useViewTileScope } from '../ViewTileScope'
import { useActiveView, useSaveView } from '../Host/liveView'
import { lockLabel } from '../../Actions/toggleLabels'

type PaneId = 'properties' | ViewPaneId

const ENTRIES: SettingsPane<PaneId>[] = [
  { id: 'properties', label: 'Properties', icon: 'server' },
  ...VIEW_PANES,
]

export function SettingsFrame(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const scope = useViewTileScope()
  const node =
    scope?.source ?? (tree && isContainer(selection) ? findContainerById(tree, selection.id) : null)
  const schemaCollection = node && owningCollection(tree, node)
  if (!node || !schemaCollection) return null
  return <ContainerSettings node={node} schemaCollection={schemaCollection} />
}

function ContainerSettings({
  node,
  schemaCollection,
}: {
  node: CollectionNode | SetNode
  schemaCollection: CollectionNode
}): React.JSX.Element {
  const defaultIcons = useSession((st) => personalizationOf(st).defaultIcons)
  const tree = useSession((st) => st.tree)
  const submitRename = useSession((st) => st.submitRename)
  const mutate = useSession((st) => st.mutate)
  const [pane, setPane] = useState<PaneId | 'root'>('root')
  const scope = useViewTileScope()
  const saveView = useSaveView(node)

  const schema = containerSchema(tree, schemaCollection)
  const view = useActiveView(node)
  const iconChoice = useIconChoice(scope ? view.icon : node.icon, (icon) => {
    if (scope) void saveView(view, { icon })
    else void mutate({ op: 'setIcon', path: node.path, kind: node.kind, icon })
  })
  const configLocked = scope?.locked ?? false
  const frozen = (id: PaneId): boolean => configLocked && id !== 'properties'

  const toRoot: MenuBack = { label: 'Settings', onBack: () => setPane('root') }
  const detailPane = pane === 'root' || frozen(pane) ? null : pane

  const viewScale = view.view_scale ?? ZOOM.default
  const setViewScale = (f: number): void => {
    void saveView(view, { view_scale: f === ZOOM.default ? undefined : f })
  }

  const footing = scope ? (
    <MenuFooting
      leading={
        <FooterLockButton
          ariaLabel={lockLabel(scope.locked, 'View Configuration')}
          locked={scope.locked}
          onToggle={() => scope.setLocked(!scope.locked)}
        />
      }
      trailing={<NavTrail segments={trailOf(tree, node)} iconSize="control" overScroll={false} />}
    />
  ) : (
    <MenuFooting
      leading={<ScalePicker ariaLabel="View Scale" value={viewScale} onPick={setViewScale} />}
      trailing={
        <FooterIconButton icon="ellipsis" ariaLabel="More actions" onClick={() => {}} disabled />
      }
    />
  )

  const root = (
    <MenuScrollFrame footer={footing}>
      <InlineEditHeader
        value={scope ? view.name : node.title}
        readOnly={configLocked}
        icon={scope ? viewGlyph(view) : entityIcon(node.kind, node.icon, defaultIcons)}
        {...iconChoice}
        onCommit={(next) => {
          // The header is the VIEW's identity in scope — renaming the source folder from an embed is exactly the mutation the scope exists to prevent.
          if (scope) {
            if (next && next !== view.name) void saveView(view, { name: next })
          } else void submitRename(node.path, node.kind, next)
        }}
      />
      <MenuSeparator flush />
      <MenuIndex sections={[{ rows: chevronRows(ENTRIES, setPane, frozen) }]} />
    </MenuScrollFrame>
  )

  const detailFor = (id: PaneId): React.JSX.Element =>
    id === 'properties' ? (
      <PropertyFrame
        collectionPath={schemaCollection.path}
        schema={schema}
        back={toRoot}
        source={node}
      />
    ) : (
      <ViewPane id={id} source={node} view={view} schema={schema} back={toRoot} />
    )

  return (
    <FrameSlide
      {...SETTINGS_PANE_FLOOR}
      open={detailPane !== null}
      root={root}
      detail={detailPane && detailFor(detailPane)}
    />
  )
}
