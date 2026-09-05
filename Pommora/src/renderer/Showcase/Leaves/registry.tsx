import type { IconName } from '@renderer/DesignSystem/Symbols'
import { ColorsLeaf } from './ColorsLeaf'
import { TypographyLeaf } from './TypographyLeaf'
import { IconsLeaf } from './IconsLeaf'
import { ButtonsLeaf } from './ButtonsLeaf'
import { ComponentsLeaf } from './ComponentsLeaf'
import { GlassLeaf } from './GlassLeaf'
import { InteractionsLeaf } from './InteractionsLeaf'
import { PanesLeaf } from './PanesLeaf'
import { SurfaceLab } from '@renderer/Tiles/TileLab'

export type SectionId = 'foundations' | 'components' | 'materials' | 'interactions'

export type Leaf = {
  id: string
  label: string
  icon: IconName
  section: SectionId
  render: () => React.JSX.Element
}

export const SECTIONS: ReadonlyArray<{ id: SectionId; label: string }> = [
  { id: 'foundations', label: 'Foundations' },
  { id: 'components', label: 'Components' },
  { id: 'materials', label: 'Materials' },
  { id: 'interactions', label: 'Interactions' },
]

export const LEAVES: readonly Leaf[] = [
  {
    id: 'colors',
    label: 'Colors',
    icon: 'palette',
    section: 'foundations',
    render: () => <ColorsLeaf />,
  },
  {
    id: 'typography',
    label: 'Typography',
    icon: 'type',
    section: 'foundations',
    render: () => <TypographyLeaf />,
  },
  {
    id: 'icons',
    label: 'Icons',
    icon: 'shapes',
    section: 'foundations',
    render: () => <IconsLeaf />,
  },
  {
    id: 'buttons',
    label: 'Buttons',
    icon: 'square-dashed',
    section: 'components',
    render: () => <ButtonsLeaf />,
  },
  {
    id: 'components',
    label: 'Components',
    icon: 'tag',
    section: 'components',
    render: () => <ComponentsLeaf />,
  },
  {
    id: 'glass',
    label: 'Glass',
    icon: 'layers',
    section: 'materials',
    render: () => <GlassLeaf />,
  },
  {
    id: 'interactions',
    label: 'Interaction Lab',
    icon: 'arrow-up-down',
    section: 'interactions',
    render: () => <InteractionsLeaf />,
  },
  {
    id: 'panes',
    label: 'Side Panes',
    icon: 'panel-right',
    section: 'interactions',
    render: () => <PanesLeaf />,
  },
  {
    id: 'surfacepm',
    label: 'Tiles Lab',
    icon: 'layout-dashboard',
    section: 'interactions',
    render: () => <SurfaceLab />,
  },
]

export function leafById(id: string): Leaf {
  return LEAVES.find((l) => l.id === id) ?? LEAVES[0]
}
