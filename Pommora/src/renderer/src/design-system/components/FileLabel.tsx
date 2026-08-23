import type { ReactNode } from 'react'
import { Chip } from '@renderer/Components/Chip'
import { Icon } from '@renderer/design-system/symbols'
import { fileTypeIcon } from '@renderer/design-system/symbols/fileTypes'

/** The app's standard rendering of a named file or folder: a leading glyph and the name, wearing
 *  the `file` chip shape so the hover-× and its melt come from the chip system rather than a second
 *  copy of that machinery. Usable anywhere — a `SegmentRun` entry, a table cell, a settings row.
 *
 *  `icon` is an explicit override for the callers whose glyph isn't read off an extension — a Set
 *  title naming its own entity glyph. Passing `false` means no glyph at all, which is what a path's
 *  segments want: they carry one lead icon on the run rather than a glyph each. */
export function FileLabel({
  name,
  icon,
  onRemove,
}: {
  name: string
  icon?: ReactNode | false
  onRemove?: () => void
}): React.JSX.Element {
  const glyph = icon ?? <Icon name={fileTypeIcon(name)} size="control" />
  return <Chip shape="plain" label={name} icon={glyph} {...(onRemove ? { onRemove } : {})} />
}
