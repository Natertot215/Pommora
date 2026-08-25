import type { ReactNode } from 'react'
import { Icon } from '../Symbols'
import { fileTypeIcon } from '../Symbols/fileTypes'
import { cx } from '../Util/cx'
import { Label, type LabelProps } from './Label'
import type { LabelShape } from './labels.css'
import { fileChip, fileChipIcon, fileChipUnresolved } from './recipes.css'

type Recipe = Omit<LabelProps, 'shape'>

/** One source for the pill-vs-tag choice, so no surface renders a status as an option. */
export function optionShapeFor(type: string): LabelShape {
  return type === 'status' ? 'pill' : 'tag'
}

/** A Space reference — colorless ground, so it reads as something you can open. */
export function SpaceChip({
  title,
  icon,
  ...rest
}: Omit<Recipe, 'text' | 'icon'> & { title: string; icon?: string }): React.JSX.Element {
  return (
    <Label
      shape="tag"
      fill="neutral"
      roomy
      text={title}
      icon={icon ? <Icon name={icon} size="control" /> : undefined}
      {...rest}
    />
  )
}

/**
 * What a file property's VALUE renders as. It stands beside other values in a cell and takes a box
 * the way they do; the empty middle says the box names a file rather than holding a color.
 *
 * Distinct from [[FileLabel]], which names a file inside a FIELD and carries no chrome — a name
 * inside a field is that field's content, and a box around it would be a box in a box.
 */
export function FileChip({
  name,
  unresolved,
  ...rest
}: Omit<Recipe, 'text' | 'icon' | 'color'> & {
  name: string
  /** The name answers to no file — still rendered, since the value is on disk. */
  unresolved?: boolean
}): React.JSX.Element {
  return (
    <Label
      shape="tag"
      fill="none"
      outline="tertiary"
      text={name}
      icon={<Icon name={fileTypeIcon(name)} size="control" className={fileChipIcon} />}
      className={cx(fileChip, unresolved && fileChipUnresolved)}
      {...rest}
    />
  )
}

/**
 * A named file or folder inside a field: a leading glyph and the name, no chrome.
 *
 * `icon` overrides the glyph for callers not reading it off an extension — a Set title naming its
 * own. `false` means no glyph, which is what a path's segments want: one lead icon on the run.
 */
export function FileLabel({
  name,
  icon,
  ...rest
}: Omit<Recipe, 'text' | 'icon' | 'color'> & {
  name: string
  icon?: ReactNode | false
}): React.JSX.Element {
  return (
    <Label
      shape="tag"
      fill="none"
      outline="none"
      align="start"
      text={name}
      icon={icon ?? <Icon name={fileTypeIcon(name)} size="control" />}
      {...rest}
    />
  )
}
