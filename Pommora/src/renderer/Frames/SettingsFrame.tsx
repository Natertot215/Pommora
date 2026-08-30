import { useRef, useState } from 'react'
import type { OpenIn } from '@shared/types'
import { Icon, entityIcon, iconNameOr, type IconName } from '@renderer/DesignSystem/Symbols'
import { NavTrail, type TrailSegment } from '@renderer/DesignSystem/Elements/NavTrail'
import { ancestryOf } from '../treeIndex'
import { footerLock, ICON } from './frames.css'
import { useSession } from '../store'
import { findCollection, findSet, findCollectionForSet } from '../Interface/Scope'
import { pickView } from '@renderer/Views/Pipeline/pickView'
import { PropertyFrame } from '../Properties/PropertyFrame'
import { HiddenFrame } from './HiddenFrame'
import { GroupFrame } from './GroupFrame'
import { SortFrame } from './SortFrame'
import { FilterFrame } from './FilterFrame'
import { LayoutFrame } from './LayoutFrame'
import { FrameSlide } from '@renderer/DesignSystem/Menus/frame-slide'
import {
  AccessoryButton,
  MenuFooting,
  MenuIndex,
  MenuRowView,
  MenuScrollFrame,
  MenuSeparator,
  MenuCaption,
  MenuTopRow,
} from '@renderer/DesignSystem/Menus'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { InlineEditHeader } from './InlineEditHeader'
import { useViewTileScope } from '@renderer/SurfacePM/ViewTileScope'
import { lockLabel } from '@shared/toggleLabels'

const NO_TRAIL: TrailSegment[] = []

type FrameId =
  | 'configuration'
  | 'properties'
  | 'visibility'
  | 'layout'
  | 'filter'
  | 'group'
  | 'sort'
interface MenuEntry {
  id: FrameId
  label: string
  icon: IconName
}

const ENTRIES: MenuEntry[] = [
  { id: 'configuration', label: 'Configuration', icon: 'sliders-horizontal' },
  { id: 'properties', label: 'Properties', icon: 'server' },
  { id: 'visibility', label: 'Visibility', icon: 'eye' },
  { id: 'layout', label: 'Layout', icon: 'layout-dashboard' },
  { id: 'group', label: 'Group', icon: 'layers' },
  { id: 'filter', label: 'Filter', icon: 'list-filter' },
  { id: 'sort', label: 'Sort', icon: 'arrow-up-down' },
]

const CURRENT_LABEL: Record<FrameId, string> = {
  configuration: 'Configuration',
  properties: 'Properties',
  visibility: 'Visibility',
  layout: 'Layout',
  group: 'Grouping',
  filter: 'Filtering',
  sort: 'Sorting',
}

export function SettingsFrame(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const tree = useSession((st) => st.tree)
  const submitRename = useSession((st) => st.submitRename)
  const mutate = useSession((st) => st.mutate)
  const [pane, setPane] = useState<FrameId | 'root'>('root')
  const lastDetail = useRef<FrameId>('properties')
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
  const activeViewId = useSession((st) => st.activeViews[node?.id ?? ''])
  if (!node) return null

  const schemaCollection = node.kind === 'collection' ? node : findCollectionForSet(tree, node.id)
  const schema = schemaCollection?.properties ?? []
  const view = scope?.view ?? pickView(node, activeViewId, schema)
  const entries = scope
    ? ENTRIES.filter((e) => e.id !== 'configuration' && e.id !== 'filter')
    : ENTRIES
  const configLocked = scope?.locked ?? false
  const frozen = (id: FrameId): boolean => configLocked && id !== 'properties'

  const open = (id: FrameId): void => {
    lastDetail.current = id
    setPane(id)
  }
  const back = (): void => setPane('root')
  const detailId = pane === 'root' ? lastDetail.current : pane

  const openInValue: OpenIn = schemaCollection?.openIn ?? 'full-page'
  const setOpenIn = async (v: OpenIn): Promise<void> => {
    if (!schemaCollection) return
    await window.nexus.container.configure(schemaCollection.path, 'collection', { open_in: v })
  }
  const toggleOpenIn = (): void => {
    void setOpenIn(openInValue === 'page-preview' ? 'full-page' : 'page-preview')
  }

  const blankLeaf = <MenuTopRow label="Settings" current={CURRENT_LABEL[detailId]} onBack={back} />
  const schemaUnavailable = (
    <>
      {blankLeaf}
      <MenuCaption>Schema unavailable.</MenuCaption>
    </>
  )

  const configurationLeaf = (
    <>
      <MenuTopRow label="Settings" current="Configuration" onBack={back} />
      <MenuRowView
        row={{
          kind: 'item',
          icon: <Icon name="layout-grid" size={ICON.rootEntry} />,
          label: 'Open In',
          trailing: {
            kind: 'value',
            value: openInValue === 'page-preview' ? 'Preview' : 'Full Page',
            onToggle: toggleOpenIn,
          },
        }}
      />
    </>
  )

  const root = (
    <>
      <InlineEditHeader
        value={scope ? view.name : node.title}
        readOnly={configLocked}
        icon={
          scope ? iconNameOr(view.icon, 'table') : entityIcon(node.kind, node.icon, defaultIcons)
        }
        iconRef={iconRef}
        onIconClick={() => setIconOpen(true)}
        onCommit={(next) => {
          // The header is the VIEW's identity in scope — renaming the source
          // folder from an embed is exactly the mutation the scope exists to prevent.
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
              onSelect: () => open(e.id),
            })),
          },
        ]}
      />
    </>
  )

  const scopedRoot = scope && schemaCollection && (
    <MenuScrollFrame
      footer={
        <MenuFooting
          leading={
            <NavTrail
              segments={(tree && ancestryOf(tree, node)) ?? NO_TRAIL}
              iconSize="control"
              overScroll={false}
            />
          }
          trailing={
            <AccessoryButton
              icon={scope.locked ? 'locked' : 'lock-open'}
              size="control"
              box={20}
              ariaLabel={lockLabel(scope.locked, 'view configuration')}
              className={footerLock}
              pressed={scope.locked}
              onClick={() => scope.setLocked(!scope.locked)}
            />
          }
        />
      }
    >
      {root}
    </MenuScrollFrame>
  )

  const detail =
    detailId === 'configuration' ? (
      configurationLeaf
    ) : detailId === 'properties' ? (
      schemaCollection ? (
        <PropertyFrame
          collectionPath={schemaCollection.path}
          schema={schema}
          onBack={back}
          source={node}
        />
      ) : (
        schemaUnavailable
      )
    ) : detailId === 'visibility' ? (
      schemaCollection ? (
        <HiddenFrame source={node} schema={schema} onBack={back} />
      ) : (
        schemaUnavailable
      )
    ) : detailId === 'layout' ? (
      <LayoutFrame
        source={node}
        view={view}
        schema={schema}
        door="flat"
        onBack={back}
        onClose={back}
      />
    ) : detailId === 'group' ? (
      <GroupFrame
        source={node}
        view={view}
        schema={schema}
        label="Settings"
        subGrouping={view.type !== 'cards'}
        onBack={back}
      />
    ) : detailId === 'sort' ? (
      <SortFrame source={node} view={view} schema={schema} label="Settings" onBack={back} />
    ) : detailId === 'filter' ? (
      <FilterFrame
        key={view.id}
        source={node}
        view={view}
        schema={schema}
        tree={tree}
        label="Settings"
        onBack={back}
      />
    ) : (
      blankLeaf
    )

  return (
    <>
      <FrameSlide
        open={pane !== 'root' && !frozen(pane)}
        root={scopedRoot || root}
        detail={detail}
        minWidth={225}
        minHeight={245}
      />
      <IconPicker
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
