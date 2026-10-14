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

/** Authoring moves an alias to the front, an add puts it at the end, and a rename keeps its place. One alias is one name whatever its case, the newest spelling standing, and a page's own title is never one; a list breaking either rule is tidied by its next edit. */
export function applyAliasEdit(worn: readonly string[], e: AliasEdit, title: string): string[] {
  const own = normalizeTitle(title)
  const held = worn.filter((a, i) => {
    const key = normalizeTitle(a)
    return key !== own && worn.findIndex((b) => normalizeTitle(b) === key) === i
  })
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
