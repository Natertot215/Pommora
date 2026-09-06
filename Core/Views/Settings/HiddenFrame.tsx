import type { ReactNode } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import {
  type PropertyDefinition,
  RESERVED_PROPERTY_ID,
  STAMP_TYPE,
} from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { useSession } from '../../Session/store'
import { MenuRowView, MenuTopRow, MenuScrollFrame } from '@pommora/uix/Menus'
import { resolveColumns } from '../Pipeline/columns'
import { columnLabel, useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import { useActiveView } from '../Host/useActiveView'
import { useSaveView } from '../ViewTileScope'
import { FrameDnd, RowShell, useFrameRegions } from '@pommora/uix/Interactions/frameDnd'
import type { PaneDrop, FrameRow } from '@pommora/uix/Interactions/frameDndModel'
import { contextIdsOf, contextsByIdOf } from '../../Properties/contextIdentity'
import { hiddenListIds, hiddenPaneSlot, hideShown, placeInShown, unhide } from '../hiddenFrameModel'
import { EyeToggle } from '@pommora/uix/Elements/EyeToggle/EyeToggle'
import { PropertyTypeIcon, propertyIcon } from '../../Properties/Cells/PropertyTypes'
import { Icon } from '@pommora/uix/Symbols'
import { cx } from '@pommora/uix/Utilities/cx'
import * as s from '@pommora/uix/Menus/frames.css'
import { host } from '../../Platform/dialer'

function rowIcon(id: string, schema: PropertyDefinition[]): ReactNode {
  const def = schema.find((d) => d.id === id)
  if (def) return <Icon name={propertyIcon(def)} size={s.ICON.doc} />
  if (id === RESERVED_PROPERTY_ID.title) return <PropertyTypeIcon type="title" size={s.ICON.doc} />
  const stamp = STAMP_TYPE[id]
  if (stamp) return <PropertyTypeIcon type={stamp} size={s.ICON.doc} />
  return <PropertyTypeIcon type="context" size={s.ICON.doc} />
}

/** The region keys ('assigned' = shown, 'all' = hidden) are the FrameDnd group names. */
function VisibilityGroups({
  shownIds,
  hiddenIds,
  hiddenSet,
  schema,
  nameFor,
  onToggle,
}: {
  shownIds: string[]
  hiddenIds: string[]
  hiddenSet: Set<string>
  schema: PropertyDefinition[]
  nameFor: (id: string) => string
  onToggle: (id: string, hidden: boolean) => void
}): React.JSX.Element {
  const { assignedRef, allRef, allHighlighted } = useFrameRegions()
  const row = (id: string): React.JSX.Element => {
    const hidden = hiddenSet.has(id)
    return (
      <RowShell key={id} id={id}>
        <MenuRowView
          row={{
            kind: 'item',
            icon: rowIcon(id, schema),
            label: nameFor(id),
            trailing:
              id === RESERVED_PROPERTY_ID.title
                ? {
                    // PLACEHOLDER
                    kind: 'button',
                    icon: 'eye',
                    ariaLabel: 'Always Shown',
                    disabled: true,
                    onClick: () => {},
                  }
                : {
                    kind: 'field',
                    children: (
                      <EyeToggle
                        hidden={hidden}
                        name={nameFor(id)}
                        onToggle={() => onToggle(id, hidden)}
                      />
                    ),
                  },
            className: hidden ? s.hiddenRow : undefined,
          }}
        />
      </RowShell>
    )
  }
  return (
    <>
      <div data-group="assigned" ref={assignedRef}>
        {shownIds.map(row)}
      </div>
      <div
        data-group="all"
        ref={allRef}
        className={cx(s.hiddenZone, allHighlighted && s.allHighlight)}
      >
        {hiddenIds.map(row)}
      </div>
    </>
  )
}

export function VisibilityList({
  source,
  schema,
  view,
  onBack,
  footer,
  label = 'Settings',
  current,
  maxHeight,
}: {
  source: CollectionNode | SetNode
  schema: PropertyDefinition[]
  view: SavedView
  onBack: () => void
  footer?: ReactNode
  label?: string
  current?: string
  maxHeight?: number
}): React.JSX.Element | null {
  const saveView = useSaveView(source)
  const tree = useSession((st) => st.tree)
  const capitalize = useCapitalizeMetadata()
  if (!tree) return null

  const contextIds = contextIdsOf(tree)
  const shownIds = resolveColumns(view, schema, contextIds).map((c) => c.id)
  const hiddenIds = hiddenListIds(view, schema, contextIds)
  // The hidden list's own membership, not hidden_properties: a prop absent from property_order is hidden by absence and reads as such.
  const hiddenSet = new Set(hiddenIds)
  const nameFor = (id: string): string => columnLabel(id, schema, contextsByIdOf(tree), capitalize)

  const save = async (patch: Partial<SavedView>): Promise<void> => {
    const res = await saveView({ ...view, ...patch })
    if (!res.ok) await host().ask('error:show', res.error.message)
  }
  const handleDrop = (drop: PaneDrop): void => {
    if (drop.kind === 'unassign') void save(hideShown(view, drop.propId))
    else if (drop.kind === 'reorder-assigned' || drop.kind === 'assign')
      void save(placeInShown(view, shownIds, shownIds, drop.propId, drop.toIndex))
  }

  const paneRows: FrameRow[] = [
    ...shownIds.map((id) => ({ id, group: 'assigned' as const })),
    ...hiddenIds.map((id) => ({ id, group: 'all' as const })),
  ]

  return (
    <MenuScrollFrame
      header={<MenuTopRow label={label} current={current} onBack={onBack} />}
      footer={footer}
      maxHeight={maxHeight}
    >
      <FrameDnd rows={paneRows} labelFor={nameFor} onDrop={handleDrop} slot={hiddenPaneSlot}>
        <VisibilityGroups
          shownIds={shownIds}
          hiddenIds={hiddenIds}
          hiddenSet={hiddenSet}
          schema={schema}
          nameFor={nameFor}
          onToggle={(id, hidden) => void save(hidden ? unhide(view, id) : hideShown(view, id))}
        />
      </FrameDnd>
    </MenuScrollFrame>
  )
}

export function HiddenFrame({
  source,
  schema,
  onBack,
}: {
  source: CollectionNode | SetNode
  schema: PropertyDefinition[]
  onBack: () => void
}): React.JSX.Element | null {
  const { view } = useActiveView(source, schema)
  return (
    <VisibilityList
      source={source}
      schema={schema}
      view={view}
      onBack={onBack}
      current="Visibility"
    />
  )
}
