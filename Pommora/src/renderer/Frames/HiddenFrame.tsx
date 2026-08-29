import type { ReactNode } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '@shared/properties'
import type { SavedView } from '@shared/views'
import { useSession } from '../store'
import { MenuRowView, MenuTopRow, MenuScrollFrame } from '@renderer/DesignSystem/Menus'
import { resolveColumns } from '@renderer/Views/Pipeline/columns'
import { columnLabel } from '@renderer/Properties/Editing/columnLabel'
import { useActiveView } from '@renderer/Views/useActiveView'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { FrameDnd, RowShell, useFrameRegions } from './frameDnd'
import type { PaneDrop, FrameRow } from './frameDndModel'
import { contextIdsOf, contextsByIdOf } from '@renderer/Properties/contextIdentity'
import { hiddenListIds, hiddenPaneSlot, hideShown, placeInShown, unhide } from './hiddenFrameModel'
import { EyeToggle } from '@renderer/DesignSystem/Elements/EyeToggle'
import { PropertyTypeIcon } from '../Properties/PropertyTypes'
import { cx } from '@renderer/DesignSystem/Util/cx'
import * as s from './frames.css'

function rowIcon(id: string, schema: PropertyDefinition[]): ReactNode {
  const def = schema.find((d) => d.id === id)
  if (def) return <PropertyTypeIcon type={def.type} size={s.ICON.doc} />
  if (id === RESERVED_PROPERTY_ID.title) return <PropertyTypeIcon type="title" size={s.ICON.doc} />
  if (id === RESERVED_PROPERTY_ID.modifiedAt)
    return <PropertyTypeIcon type="last_edited_time" size={s.ICON.doc} />
  return <PropertyTypeIcon type="context" size={s.ICON.doc} />
}

/** Lives outside the frame so rows never remount on its re-renders; the region keys
 *  ('assigned' = shown, 'all' = hidden) are the FrameDnd group names. */
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
  if (!tree) return null

  const contextIds = contextIdsOf(tree)
  const shownIds = resolveColumns(view, schema, contextIds).map((c) => c.id)
  const hiddenIds = hiddenListIds(view, schema, contextIds)
  const hiddenSet = new Set(view.hidden_properties)
  const nameFor = (id: string): string => columnLabel(id, schema, contextsByIdOf(tree))

  const save = async (patch: Partial<SavedView>): Promise<void> => {
    const res = await saveView({ ...view, ...patch })
    if (!res.ok) await window.nexus.showError(res.error.message)
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
