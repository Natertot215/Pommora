import { z } from 'zod'
import { index, op } from '../Files/decoders'
import { normalizeTitle } from '../Paths/caseFold'
import { keepsAlias } from './connections'

const alias = z.string()

export const aliasEdit = z.discriminatedUnion('op', [
  op('add', { alias }),
  op('rename', { from: alias, to: alias }),
  op('move', { alias, toIndex: index }),
  op('forget', { alias }),
])
export type AliasEdit = z.infer<typeof aliasEdit>

/** One alias is one name whatever its case, and a name `keepsAlias` refuses is never one; a list breaking either rule reads tidied, and its next edit stores it so. */
export function heldAliases(worn: readonly string[], title: string): string[] {
  const seen = new Set<string>()
  return worn.filter((a) => {
    const key = normalizeTitle(a)
    if (seen.has(key) || !keepsAlias(a, title)) return false
    seen.add(key)
    return true
  })
}

/** The order is the user's: an add respells a held alias in place or puts a new one at the end, a rename keeps its place, and a move sets it among the others, the newest spelling standing. */
export function applyAliasEdit(worn: readonly string[], e: AliasEdit, title: string): string[] {
  const held = heldAliases(worn, title)
  const named = (e.op === 'rename' ? e.to : e.alias).trim()
  const key = normalizeTitle(named)
  const others = held.filter((a) => normalizeTitle(a) !== key)
  if (e.op === 'forget') return others
  if (!keepsAlias(named, title)) return held
  switch (e.op) {
    case 'add':
      return others.length < held.length
        ? held.map((a) => (normalizeTitle(a) === key ? named : a))
        : [...held, named]
    case 'move': {
      const moved = held.find((a) => normalizeTitle(a) === key)
      return moved === undefined
        ? held
        : [...others.slice(0, e.toIndex), moved, ...others.slice(e.toIndex)]
    }
    case 'rename': {
      const from = normalizeTitle(e.from)
      if (!held.some((a) => normalizeTitle(a) === from)) return held
      return held.flatMap((a) =>
        normalizeTitle(a) === from ? [named] : normalizeTitle(a) === key ? [] : [a],
      )
    }
  }
}

/** The edit that takes back an add of `alias`: re-adding the spelling it respelled, forgetting the alias it appended, or none when it changed nothing. */
export function addUndo(
  worn: readonly string[],
  alias: string,
  title: string,
): AliasEdit | undefined {
  const named = alias.trim()
  if (!keepsAlias(named, title)) return undefined
  const was = heldAliases(worn, title).find((a) => normalizeTitle(a) === normalizeTitle(named))
  if (was === undefined) return { op: 'forget', alias: named }
  return was === named ? undefined : { op: 'add', alias: was }
}
