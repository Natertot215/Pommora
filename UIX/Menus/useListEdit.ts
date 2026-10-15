import { useState } from 'react'
import { useRenameKeys } from '../Animations/useRenameKeys'

export interface ListRow {
  key: string
  value: string
  draft: boolean
}

/** A list edited in place: a rename keeps its row's key, and a draft at the end is keyed for the value it writes, so it keeps its row wherever the value lands before the reply. A refusal leaves the draft open, and a commit hands back its write, so a label holds the committed text until it lands. */
export function useListEdit(
  values: readonly string[],
  {
    onAdd,
    onRename,
  }: {
    onAdd: (value: string) => Promise<boolean>
    onRename: (from: string, to: string) => Promise<boolean>
  },
): {
  rows: ListRow[]
  drafting: boolean
  begin: () => void
  cancel: () => void
  commit: (row: ListRow, next: string) => Promise<boolean> | undefined
} {
  const [draft, setDraft] = useState<string | null>(null)
  const keys = useRenameKeys(values)
  const rows = values.map((value) => ({ key: keys.keyOf(value), value, draft: false }))
  const drafting = draft !== null && !rows.some((r) => r.key === draft)
  if (drafting) rows.push({ key: draft, value: '', draft: true })
  return {
    rows,
    drafting,
    begin: () => setDraft(keys.mint()),
    cancel: () => setDraft(null),
    commit: (row, next) => {
      if (!next || next === row.value) return
      const landed = keys.land(row.draft ? row.key : row.value, next, () =>
        row.draft ? onAdd(next) : onRename(row.value, next),
      )
      if (row.draft)
        void landed.then((ok) => {
          if (ok) setDraft((d) => (d === row.key ? null : d))
        })
      return landed
    },
  }
}
