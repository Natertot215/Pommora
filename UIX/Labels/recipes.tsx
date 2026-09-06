import type { ReactNode } from 'react'
import { Icon } from '../Symbols'
import { fileTypeIcon } from '../Symbols/fileTypes'
import { cx } from '../Utilities/cx'
import { Label, type LabelProps } from './Label'
import type { LabelShape } from './label-base.css'
import { fileChip, fileChipIcon, fileChipUnresolved } from './label-recipes.css'

type Recipe = Omit<LabelProps, 'shape'>

/** One source, so no surface renders a status as an option. */
export function optionShapeFor(type: string): LabelShape {
  return type === 'status' ? 'pill' : 'tag'
}

export function NeutralChip({
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

/** Distinct from [[FileLabel]], which names a file inside a FIELD — a box around that would be a box in a box. */
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

/** `icon` overrides the extension-derived glyph; `false` means none, which is what a path's segments want — one lead icon on the run. */
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
