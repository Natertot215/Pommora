import { Button } from '../Controls/Button'
import { NavTrail, pathSegments } from '../../Elements/NavTrail'
import { Icon } from '../../Symbols'
import { InputField } from './InputField'
import { placeholder } from './fields.css'

export function BrowseButton({
  label,
  onBrowse,
}: {
  label: string
  onBrowse: () => void
}): React.JSX.Element {
  return (
    <Button
      type="base"
      size="button-inline"
      icon="folder-open"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onBrowse()
      }}
    />
  )
}

export function PathField({
  label,
  value,
  empty,
  onCommit,
  onBrowse,
  browseLabel = 'Choose Folder',
}: {
  label: string
  value: string
  empty: string
  onCommit: (next: string) => void
  onBrowse: () => void
  browseLabel?: string
}): React.JSX.Element {
  const segments = pathSegments(value)
  return (
    <InputField
      chrome="bordered"
      label={label}
      edit={{ value, onCommit, renames: 'row', emptyCommits: true }}
      leading={<Icon name="folder-closed" size="body" />}
      trailing={<BrowseButton label={browseLabel} onBrowse={onBrowse} />}
    >
      {segments.length > 0 ? (
        <NavTrail segments={segments} />
      ) : (
        <span className={placeholder}>{empty}</span>
      )}
    </InputField>
  )
}
