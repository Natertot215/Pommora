import dynamicIconImports from 'lucide-react/dynamicIconImports'

export type IconNodes = [string, Record<string, string>][]

/** The raw drawing of a Lucide icon, for a surface that paints without the DOM; `null` for a name the roster doesn't hold. */
export async function loadIconNodes(name: string): Promise<IconNodes | null> {
  const load = dynamicIconImports[name as keyof typeof dynamicIconImports]
  if (!load) return null
  const mod = (await load()) as unknown as { __iconNode: IconNodes }
  return mod.__iconNode
}
