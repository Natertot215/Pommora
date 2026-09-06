import type { OutlineHeading } from './headingScan'

export interface OutlineNode extends OutlineHeading {
  children: OutlineNode[]
}

/** Real documents skip levels freely, so a heading attaches to the nearest previous heading of a strictly smaller level rather than assuming its parent sits exactly one level above it. */
export function outlineTree(headings: readonly OutlineHeading[]): OutlineNode[] {
  const roots: OutlineNode[] = []
  const ancestors: OutlineNode[] = []
  for (const heading of headings) {
    const node: OutlineNode = { ...heading, children: [] }
    while (ancestors.length > 0 && ancestors[ancestors.length - 1].level >= heading.level)
      ancestors.pop()
    const parent = ancestors[ancestors.length - 1]
    if (parent) parent.children.push(node)
    else roots.push(node)
    ancestors.push(node)
  }
  return roots
}
