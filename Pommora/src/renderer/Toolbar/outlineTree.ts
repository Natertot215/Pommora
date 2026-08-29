import type { OutlineHeading } from '../MarkdownPM/Editor/folding'

export interface OutlineNode extends OutlineHeading {
  children: OutlineNode[]
}

/** Nest a flat heading list by level. Real documents skip levels freely — an H1 followed by an H3, or
 *  a page that opens at H2 — so a heading attaches to the nearest previous heading of a strictly
 *  smaller level rather than assuming its parent sits exactly one level above it. */
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
