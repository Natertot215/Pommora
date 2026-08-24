// Press-to-edit: rest content until a click, then a caret over the raw text. The field's width is
// pinned at what it had at rest, so the swap never re-flows the row; the draft commits on Enter or
// blur, drops on Escape, and flushes on unmount so a closing pane can't lose the edit.
import { useCallback, useEffect, useRef, useState } from 'react'

export function useDraftEdit({
  value,
  onCommit,
}: {
  value: string
  onCommit: (next: string) => void
}): {
  draft: string | null
  openEdit: (el: HTMLElement) => void
  restProps: { style: React.CSSProperties | undefined }
  inputProps: Pick<
    React.ComponentProps<'input'>,
    'ref' | 'value' | 'onChange' | 'onBlur' | 'onKeyDown'
  >
} {
  const [draft, setDraft] = useState<string | null>(null)
  // The width the field had at rest, pinned for the whole edit. The input's intrinsic width has
  // nothing to do with the content it replaces, so an unpinned swap re-flows the row on every
  // click into the field. The input itself sizes to its text, so the field grows past the pin
  // only when the typed value actually needs the room.
  const restWidth = useRef(0)
  const openEdit = (el: HTMLElement): void => {
    restWidth.current = el.offsetWidth
    setDraft(value)
  }
  // A STABLE callback ref, so it runs when the input mounts and never again — which is what
  // select-on-open means. An effect keyed on the draft would re-select after every keystroke, and
  // the next character would replace the value; an inline callback ref re-runs per render and does
  // the same.
  const selectOnOpen = useCallback((el: HTMLInputElement | null) => {
    el?.select()
  }, [])
  // A pane that closes while the field is open never fires a blur, so the edit would be lost on
  // the way out. The ref carries what to commit — the cleanup runs after the state is gone.
  const latest = useRef({ draft, value, onCommit })
  latest.current = { draft, value, onCommit }

  useEffect(
    () => () => {
      const { draft: last, value: was, onCommit: commit } = latest.current
      if (last !== null && last.trim() !== was) commit(last)
    },
    [],
  )

  const commit = (next: string): void => {
    setDraft(null)
    if (next.trim() !== value) onCommit(next)
  }

  return {
    draft,
    openEdit,
    restProps: { style: draft === null ? undefined : { minWidth: restWidth.current } },
    inputProps: {
      ref: selectOnOpen,
      value: draft ?? '',
      onChange: (e) => setDraft(e.target.value),
      onBlur: () => commit(draft ?? ''),
      onKeyDown: (e) => {
        if (e.key === 'Enter') commit(draft ?? '')
        else if (e.key === 'Escape') setDraft(null)
      },
    },
  }
}
