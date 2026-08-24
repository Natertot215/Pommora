// The house folder-path control. At rest it reads the stored path as a run of segments; a click
// hands over the raw text, since a path is typed as a path. Either half commits through the same
// caller, so a hand-typed folder is refused for exactly the reasons a picked one is.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../symbols'
import { SegmentRun } from '../components/SegmentRun/SegmentRun'
import { onActivateKey } from '../interactions/activate'
import * as pf from './pathField.css'

export function PathField({
  label,
  value,
  placeholder,
  onCommit,
  onBrowse,
}: {
  label: string
  /** The stored path, nexus-relative or root-relative — the caller's scope decides which. */
  value: string
  /** What an empty value reads as at rest. Absent shows nothing. */
  placeholder?: string
  /** A refusal is the caller's to swallow: the draft drops and the stored value paints again. */
  onCommit: (next: string) => void
  onBrowse: () => void
}): React.JSX.Element {
  const [draft, setDraft] = useState<string | null>(null)
  // The width the field had at rest, pinned for the whole edit. The input's intrinsic width has
  // nothing to do with the segments it replaces, so an unpinned swap re-flows the row on every
  // click into the field. The input itself sizes to its text, so the field grows past the pin
  // only when the typed path actually needs the room.
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

  const segments = value
    .split('/')
    .filter(Boolean)
    .map((seg, i, all) => ({ key: all.slice(0, i + 1).join('/'), label: seg }))

  return (
    // biome-ignore lint/a11y/useSemanticElements: a native button would swallow the input and the browse glyph it wraps — both carry their own semantics
    <div
      role="button"
      tabIndex={draft === null ? 0 : -1}
      aria-label={label}
      className={pf.pathField}
      style={draft === null ? undefined : { minWidth: restWidth.current }}
      onClick={(e) => draft === null && openEdit(e.currentTarget)}
      onKeyDown={(e) => onActivateKey(() => openEdit(e.currentTarget))(e)}
    >
      <Icon name="folder-closed" size="body" className={pf.leadIcon} />
      {draft === null ? (
        segments.length > 0 ? (
          <SegmentRun nested entries={segments} />
        ) : (
          <span className={pf.placeholder}>{placeholder}</span>
        )
      ) : (
        <input
          ref={selectOnOpen}
          className={pf.input}
          value={draft}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(draft)
            else if (e.key === 'Escape') setDraft(null)
          }}
        />
      )}
      <button
        type="button"
        className={pf.browse}
        aria-label="Choose Folder"
        onClick={(e) => {
          e.stopPropagation()
          onBrowse()
        }}
      >
        <Icon name="folder-open" size="control" />
      </button>
    </div>
  )
}
