import type { OutlineHeading } from './headingScan'

export type OutlineNode<T = OutlineHeading> = T & { children: OutlineNode<T>[] }

/** Real documents skip levels freely, so a heading attaches to the nearest previous heading of a strictly smaller level rather than assuming its parent sits exactly one level above it. */
export function outlineTree<T extends { level: number }>(headings: readonly T[]): OutlineNode<T>[] {
  const roots: OutlineNode<T>[] = []
  const ancestors: OutlineNode<T>[] = []
  for (const heading of headings) {
    const node: OutlineNode<T> = { ...heading, children: [] }
    while (ancestors.length > 0 && ancestors[ancestors.length - 1].level >= heading.level)
      ancestors.pop()
    const parent = ancestors[ancestors.length - 1]
    if (parent) parent.children.push(node)
    else roots.push(node)
    ancestors.push(node)
  }
  return roots
}
