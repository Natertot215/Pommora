import type { IconName } from '@pommora/uix/Symbols'
import { ColorsLeaf } from './ColorsLeaf'
import { TypographyLeaf } from './TypographyLeaf'
import { IconsLeaf } from './IconsLeaf'
import { ButtonsLeaf } from './ButtonsLeaf'
import { ComponentsLeaf } from './ComponentsLeaf'
import { GlassLeaf } from './GlassLeaf'

export type SectionId = 'foundations' | 'components'

export type Leaf = {
  id: string
  label: string
  icon: IconName
  section: SectionId
  render: () => React.JSX.Element
}

export const SECTIONS: ReadonlyArray<{ id: SectionId; label: string }> = [
  { id: 'foundations', label: 'Primitives' },
  { id: 'components', label: 'Components' },
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
    id: 'glass',
    label: 'Glass',
    icon: 'layers',
    section: 'foundations',
    render: () => <GlassLeaf />,
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
]

export function leafById(id: string): Leaf {
  return LEAVES.find((l) => l.id === id) ?? LEAVES[0]
}
