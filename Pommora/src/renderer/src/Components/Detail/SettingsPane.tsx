import { useRef, useState } from 'react'
import type { OpenIn } from '@shared/types'
import { Icon, entityIcon, iconNameOr, type IconName } from '@renderer/DesignSystem/Symbols'
import { PathChevron } from '@renderer/DesignSystem/Elements/PathChevron/PathChevron'
import { EntityIcon } from '@renderer/Components/EntityIcon'
import {
  detail as detailText,
  flushTrailing,
  footingSymbol,
  rowDisabled,
  side,
} from '@renderer/DesignSystem/Components/Menu/menu.css'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { crumbRow, footerLock, footerLockActive, ICON } from './settingsPane.css'
import { useSession } from '../../store'
import { findCollection, findSet, findCollectionForSet } from '../../Detail/Scope'
import { pickView } from '../../Detail/Views/pipeline/pickView'
import { PropertiesPane } from './PropertiesPane'
import { HiddenPane } from './HiddenPane'
import { GroupingPane } from './GroupingPane'
import { SortingPane } from './SortingPane'
import { FilterPane } from './FilterPane'
import { ViewSettings } from './ViewSettings'
import { PaneSlider } from './PaneSlider'
import {
  AccessoryButton,
  MenuBottomRow,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
  MenuCaption,
  MenuPaneTopRow,
} from '@renderer/DesignSystem/Components/Menu'
import { IconPicker } from '../IconPicker'
import { InlineEditHeader } from './InlineEditHeader'
import { useViewEmbedScope } from '@renderer/Embeds/ViewEmbedScope'
import { lockLabel } from '@shared/toggleLabels'

type PaneId = 'configuration' | 'properties' | 'visibility' | 'layout' | 'filter' | 'group' | 'sort'
interface MenuEntry {
  id: PaneId
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

// A detail pane's right-side breadcrumb — the entry label, but Group/Filter/Sort read the active tense.
const CURRENT_LABEL: Record<PaneId, string> = {
  configuration: 'Configuration',
  properties: 'Properties',
  visibility: 'Visibility',
  layout: 'Layout',
  group: 'Grouping',
  filter: 'Filtering',
  sort: 'Sorting',
}

/** Layout opens the active view's ViewSettings (the flat door); Configuration holds the
 *  collection's Open In. */
export function SettingsPane(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const tree = useSession((st) => st.tree)
  const submitRename = useSession((st) => st.submitRename)
  const mutate = useSession((st) => st.mutate)
  const [pane, setPane] = useState<PaneId | 'root'>('root')
  const lastDetail = useRef<PaneId>('properties')
  const [iconOpen, setIconOpen] = useState(false)
  const iconRef = useRef<HTMLButtonElement>(null)

  // In a view embed the ENTIRE node derivation goes scope-first — the selection names
  // whatever the sidebar has open, not the embed's source; and the pane is a view-config
  // surface there: view-identity header, no Configuration leaf, config writes → payload.
  const scope = useViewEmbedScope()
  const selectionNode =
    selection.kind === 'collection'
      ? findCollection(tree, selection.id)
      : selection.kind === 'set'
        ? findSet(tree, selection.id)
        : undefined
  const node = scope?.source ?? selectionNode
  const activeViewId = useSession((st) => st.activeViews[node?.id ?? ''])
  if (!node) return null

  // Schema lives only on the Collection; a Set inherits its ancestor Collection's schema.
  const schemaCollection = node.kind === 'collection' ? node : findCollectionForSet(tree, node.id)
  const schema = schemaCollection?.properties ?? []
  const view = scope?.view ?? pickView(node, activeViewId, schema)
  const entries = scope
    ? ENTRIES.filter((e) => e.id !== 'configuration' && e.id !== 'filter')
    : ENTRIES
  // A locked tile freezes this view's config, so the leaves that write it don't open — shown,
  // dimmed, inert, the treatment the handle menu already wears. Properties stays live: it writes the
  // collection's schema, not this view's config (its one per-view control reports the refusal).
  const configLocked = scope?.locked ?? false
  const frozen = (id: PaneId): boolean => configLocked && id !== 'properties'

  const open = (id: PaneId): void => {
    lastDetail.current = id
    setPane(id)
  }
  const back = (): void => setPane('root')
  const detailId = pane === 'root' ? lastDetail.current : pane

  // Open In is Collection-owned: a Set writes to (and reads from) its ancestor Collection.
  const openInValue: OpenIn = schemaCollection?.openIn ?? 'full-page'
  const setOpenIn = async (v: OpenIn): Promise<void> => {
    if (!schemaCollection) return
    await window.nexus.container.configure(schemaCollection.path, 'collection', { open_in: v })
  }
  const toggleOpenIn = (): void => {
    void setOpenIn(openInValue === 'page-preview' ? 'full-page' : 'page-preview')
  }

  const blankLeaf = (
    <MenuPaneTopRow label="Settings" current={CURRENT_LABEL[detailId]} onBack={back} />
  )
  const schemaUnavailable = (
    <>
      <MenuPaneTopRow label="Settings" current={CURRENT_LABEL[detailId]} onBack={back} />
      <MenuCaption>Schema unavailable.</MenuCaption>
    </>
  )

  const configurationLeaf = (
    <>
      <MenuPaneTopRow label="Settings" current="Configuration" onBack={back} />
      <MenuItem
        className={flushTrailing}
        leading={<Icon name="layout-grid" size={ICON.rootEntry} />}
        trailing={
          <span className={side}>
            <span className={detailText}>
              {openInValue === 'page-preview' ? 'Preview' : 'Full Page'}
            </span>
            <Icon name="chevrons-up-down" size="control" />
          </span>
        }
        onClick={toggleOpenIn}
      >
        Open In
      </MenuItem>
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
      {entries.map((e) => (
        <MenuItem
          key={e.id}
          className={cx(flushTrailing, frozen(e.id) && rowDisabled)}
          leading={<Icon name={e.icon} size={ICON.rootEntry} />}
          trailing={<Icon name="chevron-right" />}
          onClick={frozen(e.id) ? undefined : () => open(e.id)}
        >
          {e.label}
        </MenuItem>
      ))}
    </>
  )

  const scopedRoot = scope && schemaCollection && (
    <MenuScrollFrame
      footer={
        <MenuBottomRow
          leading={
            <span className={crumbRow}>
              <span className={footingSymbol}>
                <EntityIcon kind="collection" icon={schemaCollection.icon} size="control" />
              </span>
              <span>{schemaCollection.title}</span>
              {node.kind === 'set' && (
                <>
                  <PathChevron size="caption" />
                  <span className={footingSymbol}>
                    <EntityIcon kind="set" icon={node.icon} size="control" />
                  </span>
                  <span>{node.title}</span>
                </>
              )}
            </span>
          }
          trailing={
            <AccessoryButton
              icon="lock"
              size="control"
              box={20}
              ariaLabel={lockLabel(scope.locked, 'view configuration')}
              className={scope.locked ? `${footerLock} ${footerLockActive}` : footerLock}
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
        <PropertiesPane
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
        <HiddenPane source={node} schema={schema} onBack={back} />
      ) : (
        schemaUnavailable
      )
    ) : detailId === 'layout' ? (
      <ViewSettings
        source={node}
        view={view}
        schema={schema}
        door="flat"
        onBack={back}
        onClose={back}
      />
    ) : detailId === 'group' ? (
      <GroupingPane
        source={node}
        view={view}
        schema={schema}
        label="Settings"
        subGrouping={view.type !== 'cards'}
        onBack={back}
      />
    ) : detailId === 'sort' ? (
      <SortingPane source={node} view={view} schema={schema} label="Settings" onBack={back} />
    ) : detailId === 'filter' ? (
      <FilterPane
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
      <PaneSlider
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
