import { useMemo, useState } from 'react'
import {
  FooterIconButton,
  MenuFooting,
  MenuIndex,
  MenuScrollFrame,
  type MenuSection,
} from '@pommora/uix/Menus'
import { FrameSlide, PANE_MIN_H, PANE_MIN_W } from '@pommora/uix/Menus/frame-slide'
import { factorPickerProps, type PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { useSession } from '../Session/store'
import { FilterFrame } from '../Views/Settings/FilterFrame'
import type { Forces } from './Engine/forces'
import type { GroupMode } from './Engine/graph'
import { clampForce, FORCE_STEPS } from './matrixConfig'
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

export function MatrixMenu(): React.JSX.Element {
  const config = useSession((st) => st.matrixConfig)
  const patch = useSession((st) => st.patchMatrix)
  const tree = useSession((st) => st.tree)
  const [filtering, setFiltering] = useState(false)

  const display = config.display
  const sections: MenuSection[] = [
    {
      rows: [
        {
          kind: 'item',
          label: 'Groups',
          trailing: {
            kind: 'picker',
            ariaLabel: 'Groups',
            value: config.group.mode,
            options: GROUP_OPTIONS,
            onPick: (v: GroupMode) => patch({ group: { mode: v } }),
          },
        },
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
      rows: FORCES.map(({ key, label }) => ({
        kind: 'item',
        label,
        trailing: {
          kind: 'picker',
          ariaLabel: label,
          ...factorPickerProps({
            steps: FORCE_STEPS[key],
            value: config.forces[key],
            coerce: (typed) => clampForce(key, typed),
            onPick: (factor) => patch({ forces: { [key]: factor } }),
          }),
        },
      })),
    },
  ]

  const root = (
    <MenuScrollFrame
      footer={
        <MenuFooting
          leading={
            <FooterIconButton
              icon={display.locked ? 'locked' : 'lock-open'}
              ariaLabel={`${display.locked ? 'Unlock' : 'Lock'} Layout`}
              pressed={display.locked}
              onClick={() => patch({ display: { locked: !display.locked } })}
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

  const filterView = useMemo(
    () => ({ filter: config.filter.rules ?? undefined, filter_enabled: config.filter.enabled }),
    [config.filter],
  )

  return (
    <FrameSlide
      open={filtering && tree !== null}
      root={root}
      detail={
        tree && (
          <FilterFrame
            locations={tree.collections}
            view={filterView}
            schema={tree.registry}
            tree={tree}
            label={MATRIX_TITLE}
            onBack={() => setFiltering(false)}
            onCommit={(next) =>
              patch({
                filter: { rules: next.filter ?? null, enabled: next.filter_enabled !== false },
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
