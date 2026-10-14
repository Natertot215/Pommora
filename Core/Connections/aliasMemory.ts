import { z } from 'zod'
import { op } from '../Files/decoders'
import { normalizeTitle } from '../Paths/caseFold'

const alias = z.string()

export const aliasEdit = z.discriminatedUnion('op', [
  op('remember', { alias }),
  op('add', { alias }),
  op('rename', { from: alias, to: alias }),
  op('forget', { alias }),
])
export type AliasEdit = z.infer<typeof aliasEdit>

/** One alias is one name whatever its case, and a page's own title is never one; a list breaking either rule reads tidied, and its next edit stores it so. */
export function heldAliases(worn: readonly string[], title: string): string[] {
  const seen = new Set([normalizeTitle(title)])
  return worn.filter((a) => {
    const key = normalizeTitle(a)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Authoring moves an alias to the front, an add puts it at the end, and a rename keeps its place, the newest spelling standing. */
export function applyAliasEdit(worn: readonly string[], e: AliasEdit, title: string): string[] {
  const own = normalizeTitle(title)
  const held = heldAliases(worn, title)
  const named = (e.op === 'rename' ? e.to : e.alias).trim()
  const key = normalizeTitle(named)
  const others = held.filter((a) => normalizeTitle(a) !== key)
  if (e.op === 'forget') return others
  if (!named || key === own) return held
  switch (e.op) {
    case 'remember':
      return [named, ...others]
    case 'add':
      return [...others, named]
    case 'rename': {
      const from = normalizeTitle(e.from)
      if (!held.some((a) => normalizeTitle(a) === from)) return held
      return held.flatMap((a) =>
        normalizeTitle(a) === from ? [named] : normalizeTitle(a) === key ? [] : [a],
      )
    }
  }
}
