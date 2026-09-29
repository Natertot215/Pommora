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
import { useSaveView } from '../viewWrite'
import { LineGroup, LineRow, LineZone } from '@pommora/uix/Interactions/drag'
import { PaneAllGroup, type PaneDrop, paneSpec } from '@pommora/core/Properties/paneDrop'
import { contextIdsOf, contextsByIdOf } from '../../Contexts/contextIdentity'
import { hiddenListIds, hideShown, placeInShown, unhide } from '../visibilityModel'
import { EyeToggle } from '@pommora/uix/Elements/EyeToggle'
import { propertyIcon, propertyTypeIconName } from '../../Properties/Cells/PropertyTypes'
import { Icon } from '@pommora/uix/Symbols'
import * as s from '@pommora/uix/Menus/frames.css'

function rowGlyph(id: string, schema: PropertyDefinition[]): string {
  const def = schema.find((d) => d.id === id)
  if (def) return propertyIcon(def)
  if (id === RESERVED_PROPERTY_ID.title) return propertyTypeIconName('title')
  return propertyTypeIconName(STAMP_TYPE[id] ?? 'context')
}

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
  const row = (id: string): React.JSX.Element => {
    const hidden = hiddenSet.has(id)
    return (
      <LineRow key={id} id={id}>
        <MenuRowView
          row={{
            kind: 'item',
            icon: <Icon name={rowGlyph(id, schema)} size={s.ICON.doc} />,
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
      </LineRow>
    )
  }
  return (
    <>
      <LineGroup id="assigned">{shownIds.map(row)}</LineGroup>
      <PaneAllGroup className={s.hiddenZone}>{hiddenIds.map(row)}</PaneAllGroup>
    </>
  )
}

export function VisibilityFrame({
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

  const save = (patch: Partial<SavedView>): void => void saveView(view, patch)
  const handleDrop = (drop: PaneDrop): void => {
    if (drop.kind === 'unassign') save(hideShown(view, drop.propId))
    else if (drop.kind === 'reorder-assigned' || drop.kind === 'assign')
      save(placeInShown(view, shownIds, drop.propId, drop.toIndex))
  }

  return (
    <MenuScrollFrame
      header={<MenuTopRow label={label} current={current} onBack={onBack} />}
      footer={footer}
      maxHeight={maxHeight}
    >
      <LineZone
        className={s.frameZone}
        {...paneSpec({
          assigned: shownIds,
          ordersAll: false,
          pinned: RESERVED_PROPERTY_ID.title,
          titles: { assigned: 'Shown Properties', all: 'Hidden Properties' },
          label: nameFor,
          glyph: (id) => <Icon name={rowGlyph(id, schema)} />,
          onDrop: handleDrop,
          watch: [view, schema, tree],
        })}
      >
        <VisibilityGroups
          shownIds={shownIds}
          hiddenIds={hiddenIds}
          hiddenSet={hiddenSet}
          schema={schema}
          nameFor={nameFor}
          onToggle={(id, hidden) => save(hidden ? unhide(view, id) : hideShown(view, id))}
        />
      </LineZone>
    </MenuScrollFrame>
  )
}
