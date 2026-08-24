// The house folder-path control. At rest it reads the stored path as a run of segments; a click
// hands over the raw text, since a path is typed as a path. Either half commits through the same
// caller, so a hand-typed folder is refused for exactly the reasons a picked one is.
import { Icon } from '../symbols'
import { SegmentRun } from '../components/SegmentRun/SegmentRun'
import { onActivateKey } from '../interactions/activate'
import { useDraftEdit } from './useDraftEdit'
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
  const { draft, openEdit, restProps, inputProps } = useDraftEdit({ value, onCommit })

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
      {...restProps}
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
        <input className={pf.input} aria-label={label} {...inputProps} />
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
