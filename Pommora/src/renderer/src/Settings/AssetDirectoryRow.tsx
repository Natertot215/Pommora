// The Default Asset Directory field. At rest it reads the stored path as a run of segments; a
// click hands over the raw text, since a path is typed as a path. Either half crosses the same
// validator in main, so a hand-typed folder is refused for exactly the reasons a picked one is.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@renderer/design-system/symbols'
import { SegmentRun } from '@renderer/design-system/components/SegmentRun/SegmentRun'
import { onActivateKey } from '@renderer/design-system/interactions/activate'
import { useSession } from '../store'
import { SettingsRow, type RowText } from './SettingsRow'
import * as pr from './pathRow.css'

export function AssetDirectoryRow({ label, hint }: RowText): React.JSX.Element {
  const stored = useSession((s) => s.tree?.assetDirectory ?? '')
  const setAssetDirectory = useSession((s) => s.setAssetDirectory)
  const [draft, setDraft] = useState<string | null>(null)
  // A STABLE callback ref, so it runs when the input mounts and never again — which is what
  // select-on-open means. An effect keyed on the draft would re-select after every keystroke, and
  // the next character would replace the value; an inline callback ref re-runs per render and does
  // the same.
  const selectOnOpen = useCallback((el: HTMLInputElement | null) => {
    el?.select()
  }, [])
  // A pane that closes while the field is open never fires a blur, so the edit would be lost on
  // the way out. The ref carries what to commit — the cleanup runs after the state is gone.
  const latest = useRef({ draft, stored })
  latest.current = { draft, stored }

  useEffect(
    () => () => {
      const { draft: last, stored: was } = latest.current
      if (last !== null && last.trim() !== was) void setAssetDirectory(last)
    },
    [setAssetDirectory],
  )

  // A refusal reverts: the field drops its draft and the stored value paints again. No message —
  // the folder is simply not one this setting accepts.
  const commit = async (next: string): Promise<void> => {
    setDraft(null)
    if (next.trim() !== stored) await setAssetDirectory(next)
  }

  const browse = async (): Promise<void> => {
    const picked = await window.nexus.chooseAssetDir()
    if (picked.ok && picked.value !== null) await setAssetDirectory(picked.value)
  }

  return (
    <SettingsRow label={label} hint={hint}>
      {/* biome-ignore lint/a11y/useSemanticElements: a native button would swallow the input and
          the browse glyph it wraps — both carry their own semantics */}
      <div
        role="button"
        tabIndex={draft === null ? 0 : -1}
        aria-label={label}
        className={pr.pathField}
        onClick={() => draft === null && setDraft(stored)}
        onKeyDown={onActivateKey(() => setDraft(stored))}
      >
        <Icon name="folder-closed" size="body" className={pr.leadIcon} />
        {draft === null ? (
          <SegmentRun
            nested
            entries={stored
              .split('/')
              .filter(Boolean)
              .map((seg, i, all) => ({ key: all.slice(0, i + 1).join('/'), label: seg }))}
          />
        ) : (
          <input
            ref={selectOnOpen}
            className={pr.input}
            value={draft}
            aria-label={label}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit(draft)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commit(draft)
              else if (e.key === 'Escape') setDraft(null)
            }}
          />
        )}
        <button
          type="button"
          className={pr.browse}
          aria-label="Choose Folder"
          onClick={(e) => {
            e.stopPropagation()
            void browse()
          }}
        >
          <Icon name="folder-open" size="control" />
        </button>
      </div>
    </SettingsRow>
  )
}
