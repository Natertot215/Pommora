import type { ReactNode } from 'react'
import { Chip } from '@renderer/Components/Chip'
import { Icon } from '@renderer/design-system/symbols'
import { fileTypeIcon } from '@renderer/design-system/symbols/fileTypes'
import { cx } from '@renderer/design-system/cx'
import { fileLabelClickable, fileLabelUnresolved } from './fileLabel.css'

/** The app's standard rendering of a named file or folder: a leading glyph and the name, wearing
 *  the `file` chip shape so the hover-× and its melt come from the chip system rather than a second
 *  copy of that machinery. Usable anywhere — a `SegmentRun` entry, a table cell, a settings row.
 *
 *  `icon` is an explicit override for the callers whose glyph isn't read off an extension: a folder
 *  name has none, and a path's segments carry one lead icon rather than a glyph each. */
export function FileLabel({
  name,
  icon,
  onRemove,
  onClick,
  unresolved,
}: {
  name: string
  icon?: ReactNode
  onRemove?: () => void
  onClick?: () => void
  /** The name answers to no file. It still renders — the value is on disk and has to be
   *  removable — but reads as naming nothing. */
  unresolved?: boolean
}): React.JSX.Element {
  const glyph = icon ?? <Icon name={fileTypeIcon(name)} size="control" />
  const chip = (
    <Chip
      shape="file"
      label={name}
      icon={glyph}
      className={cx(unresolved && fileLabelUnresolved)}
      {...(onRemove ? { onRemove } : {})}
    />
  )
  if (!onClick) return chip
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a value inside a grid cell — per-label tab stops flood the tab order, which is the grid's roving-tabindex gap rather than a lint fix
    <span onClick={onClick} className={fileLabelClickable}>
      {chip}
    </span>
  )
}
