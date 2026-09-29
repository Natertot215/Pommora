import type { ReactNode } from 'react'
import { LineZone } from '@pommora/uix/Interactions/drag'
import { laneSpec } from '@pommora/uix/Menus'
import { sectionEnd, type OutlineHeading } from '../../MarkdownPM/Engine/headingScan'
import { moveHeadingSection } from '../../Pages/pageEditor'

function sectionOf(flat: readonly OutlineHeading[], key: string): ReadonlySet<string> {
  const h = flat.findIndex((x) => x.key === key)
  return new Set(h < 0 ? [key] : flat.slice(h, sectionEnd(flat, h)).map((x) => x.key))
}

export function OutlineDnd({
  flat,
  children,
}: {
  flat: OutlineHeading[]
  children: ReactNode
}): React.JSX.Element {
  return (
    <LineZone
      {...laneSpec({
        laneOf: (key) => {
          const section = sectionOf(flat, key)
          return (x) => (x === key || !section.has(x) ? 'outline' : undefined)
        },
        commit: (key, slot) => moveHeadingSection(key, slot.before),
        label: (key) => flat.find((x) => x.key === key)?.text ?? '',
        watch: [flat],
      })}
      disclose
    >
      {children}
    </LineZone>
  )
}
