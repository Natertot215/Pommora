import { Button } from '../Controls/Button'
import { NavTrail } from '../../Elements/NavTrail'
import { Icon } from '../../Symbols'
import { InputField } from './InputField'
import * as pf from './pathField.css'

/** The house folder path: one lead glyph, the stored path as a trail, and a browse action. A click
 *  hands over the raw text, since a path is typed as a path. */
export function PathField({
  label,
  value,
  placeholder,
  onCommit,
  onBrowse,
}: {
  label: string
  value: string
  placeholder?: string
  onCommit: (next: string) => void
  onBrowse: () => void
}): React.JSX.Element {
  const segments = value
    .split('/')
    .filter(Boolean)
    .map((title) => ({ title }))
  return (
    <InputField
      chrome="bordered"
      className={pf.pathField}
      label={label}
      edit={{ value, onCommit }}
      trailing={
        <Button
          type="base"
          size="button-inline"
          icon="folder-open"
          aria-label="Choose Folder"
          className={pf.browse}
          onClick={(e) => {
            e.stopPropagation()
            onBrowse()
          }}
        />
      }
    >
      <Icon name="folder-closed" size="body" className={pf.leadIcon} />
      {segments.length > 0 ? (
        <NavTrail segments={segments} className={pf.trail} />
      ) : (
        <span className={pf.placeholder}>{placeholder}</span>
      )}
    </InputField>
  )
}
