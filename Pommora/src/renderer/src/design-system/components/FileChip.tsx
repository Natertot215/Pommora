import { Chip } from '@renderer/Components/Chip'
import { Icon } from '@renderer/design-system/symbols'
import { fileTypeIcon } from '@renderer/design-system/symbols/fileTypes'
import { cx } from '@renderer/design-system/cx'
import { fileChip, fileChipIcon, fileChipUnresolved } from './fileChip.css'

/** What a file property's VALUE renders as — the file's type glyph and its name inside the
 *  `file` chip shape, which is chip-label's box bordered at the quaternary tone over no fill.
 *
 *  Distinct from [[FileLabel]], which names a file or folder inside a FIELD and carries no chrome:
 *  a value stands beside other values in a cell and takes a box the way they do, while a name
 *  inside a field is that field's content and a box around it would be a box in a box. */
export function FileChip({
  name,
  onRemove,
  unresolved,
}: {
  name: string
  onRemove?: () => void
  /** The name answers to no file — still rendered, since the value is on disk and has to be
   *  removable, but reading as naming nothing. */
  unresolved?: boolean
}): React.JSX.Element {
  return (
    <Chip
      shape="file"
      label={name}
      icon={<Icon name={fileTypeIcon(name)} size="control" className={fileChipIcon} />}
      className={cx(fileChip, unresolved && fileChipUnresolved)}
      {...(onRemove ? { onRemove } : {})}
    />
  )
}
