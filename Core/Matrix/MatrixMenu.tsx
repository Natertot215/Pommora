import { useMemo, useState } from 'react'
import {
  steppedRow,
  FooterIconButton,
  FooterLockButton,
  MenuFooting,
  MenuIndex,
  MenuScrollFrame,
  type MenuSection,
  pickerRow,
} from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { PANE_MIN_H, PANE_MIN_W } from '@pommora/uix/Menus/frame-slide.css'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { lockLabel } from '../Actions/toggleLabels'
import { useSession } from '../Session/store'
import { FilterFrame, type FilterView } from '../Views/Settings/FilterFrame'
import type { Forces } from './Engine/forces'
import type { GroupMode } from './Engine/graph'
import { FORCE_RANGES, type MatrixConfig } from './matrixConfig'
import { MATRIX_TITLE } from './matrixKind'
import { matrixRuntime } from './matrixRuntime'

const GROUP_OPTIONS: readonly PickerOption<GroupMode>[] = [
  { value: 'connection', label: 'Connection' },
  { value: 'location', label: 'Location' },
  { value: 'space', label: 'Space' },
]

const FORCES: Array<{ key: keyof Forces; label: string }> = [
  { key: 'gravity', label: 'Gravity' },
  { key: 'spread', label: 'Spread' },
  { key: 'strength', label: 'Strength' },
  { key: 'distance', label: 'Distance' },
]

const filterViewOf = (filter: MatrixConfig['filter']): FilterView => ({
  filter: filter.rules ?? undefined,
  filter_enabled: filter.enabled,
})

export function MatrixMenu(): React.JSX.Element {
  const config = useSession((st) => st.matrixConfig)
  const patch = useSession((st) => st.patchMatrix)
  const tree = useSession((st) => st.tree)
  const [filtering, setFiltering] = useState(false)

  const display = config.display
  const mode = config.group.mode
  const forces = config.forces[mode]
  const sections: MenuSection[] = [
    {
      rows: [
        pickerRow(undefined, 'Groups', mode, GROUP_OPTIONS, (v: GroupMode) =>
          patch({ group: { mode: v } }),
        ),
        {
          kind: 'item',
          label: 'Filter',
          trailing: { kind: 'chevron' },
          onSelect: () => setFiltering(true),
        },
        { kind: 'separator' },
        {
          kind: 'item',
          label: 'Unlinked Items',
          trailing: {
            kind: 'switch',
            checked: display.unlinked,
            onChange: (next) => patch({ display: { unlinked: next } }),
            ariaLabel: 'Unlinked Items',
          },
        },
        {
          kind: 'item',
          label: 'Hide Icons',
          trailing: {
            kind: 'switch',
            checked: display.hideIcon,
            onChange: (next) => patch({ display: { hideIcon: next } }),
            ariaLabel: 'Hide Icons',
          },
        },
        {
          kind: 'item',
          label: 'Hide Paths',
          trailing: {
            kind: 'switch',
            checked: display.hidePath,
            onChange: (next) => patch({ display: { hidePath: next } }),
            ariaLabel: 'Hide Paths',
          },
        },
      ],
    },
    {
      title: 'Link Forces',
      rows: FORCES.map(({ key, label }) =>
        steppedRow(undefined, label, {
          range: FORCE_RANGES[key],
          value: forces[key],
          onPick: (factor) => patch({ forces: { [mode]: { [key]: factor } } }),
        }),
      ),
    },
  ]

  const root = (
    <MenuScrollFrame
      footer={
        <MenuFooting
          leading={
            <FooterLockButton
              ariaLabel={lockLabel(display.locked, 'Layout')}
              locked={display.locked}
              onToggle={() => patch({ display: { locked: !display.locked } })}
            />
          }
          trailing={
            <FooterIconButton
              icon="shuffle"
              ariaLabel="Shuffle Layout"
              disabled={display.locked}
              onClick={() => matrixRuntime.shuffle()}
            />
          }
        />
      }
    >
      <MenuIndex sections={sections} />
    </MenuScrollFrame>
  )

  const filterView = useMemo(() => filterViewOf(config.filter), [config.filter])

  return (
    <FrameSlide
      open={filtering && tree !== null}
      root={root}
      detail={
        tree && (
          <FilterFrame
            locations={tree.collections}
            view={filterView}
            read={() => filterViewOf(useSession.getState().matrixConfig.filter)}
            schema={tree.config.registry}
            tree={tree}
            label={MATRIX_TITLE}
            onBack={() => setFiltering(false)}
            onCommit={(next) =>
              patch({
                filter:
                  'filter' in next
                    ? { rules: next.filter ?? null }
                    : { enabled: next.filter_enabled },
              })
            }
          />
        )
      }
      minWidth={PANE_MIN_W}
      minHeight={PANE_MIN_H}
    />
  )
}
