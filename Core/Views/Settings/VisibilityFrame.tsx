import type { ReactNode } from 'react'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { FILEDATA, FILEDATA_BY_ID, type PropertyDefinition } from '../../Properties/properties'
import type { SavedView } from '../views'
import { useSession } from '../../Session/store'
import { MenuRowView, MenuTopRow, MenuScrollFrame } from '@pommora/uix/Menus'
import { resolveColumn, resolveColumns } from '../Pipeline/columns'
import { columnLabel } from '../../Properties/columnLabel'
import { useSaveView } from '../viewWrite'
import { LineGroup, LineRow, LineZone } from '@pommora/uix/Interactions/drag'
import { PaneRestGroup, type PaneDrop, paneSpec } from '@pommora/uix/Menus/paneDrop'
import { contextIdsOf, contextsByIdOf } from '../../Contexts/contextIdentity'
import { hiddenListIds, hideShown, placeInShown, unhide } from '../visibilityModel'
import { EyeToggle } from '@pommora/uix/Elements/EyeToggle'
import { propertyIcon, propertyTypeIconName } from '../../Properties/typeDisplay'
import { Icon } from '@pommora/uix/Symbols'
import * as s from '@pommora/uix/Menus/frames.css'

function rowGlyph(id: string, schema: PropertyDefinition[]): string {
  const def = schema.find((d) => d.id === id)
  if (def) return propertyIcon(def)
  return propertyTypeIconName(FILEDATA_BY_ID.get(id)?.type ?? 'context')
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
              id === FILEDATA.title.id
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
      <LineGroup id="members">{shownIds.map(row)}</LineGroup>
      <PaneRestGroup className={s.hiddenZone}>{hiddenIds.map(row)}</PaneRestGroup>
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
  if (!tree) return null

  const contextIds = contextIdsOf(tree)
  const shownIds = resolveColumns(view, schema, contextIds).map((c) => c.id)
  const hiddenIds = hiddenListIds(view, schema, contextIds)
  // The hidden list's own membership, not hidden_properties: a prop absent from property_order is hidden by absence and reads as such.
  const hiddenSet = new Set(hiddenIds)
  const nameFor = (id: string): string => {
    const column = resolveColumn(id, schema, contextIds)
    return column ? columnLabel(column, contextsByIdOf(tree)) : id
  }

  const save = (patch: Partial<SavedView>): void => void saveView(view, patch)
  // The hidden list holds no order (`ordersRest: false`), so no drop reorders it.
  const handleDrop = (drop: PaneDrop): void => {
    switch (drop.kind) {
      case 'leave':
        return void save(hideShown(view, drop.id))
      case 'reorder-members':
      case 'join':
        return void save(placeInShown(view, shownIds, drop.id, drop.toIndex))
    }
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
          members: shownIds,
          ordersRest: false,
          pinned: FILEDATA.title.id,
          titles: { members: 'Shown Properties', rest: 'Hidden Properties' },
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
