import { Icon } from '../Symbols'
import { fileTypeIcon } from '../Symbols/fileTypes'
import { cx } from '../Utilities/cx'
import { Label, type LabelProps } from './Label'
import { fileChip, fileChipIcon, fileChipUnresolved } from './label-recipes.css'

type Recipe = Omit<LabelProps, 'shape'>

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

/** Distinct from [[PlainLabel]], which names a value inside a FIELD. */
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

/** A chrome-less label: a name sitting inside a field, where a chip's box would be a box in a box. */
export function PlainLabel(props: Omit<Recipe, 'color'>): React.JSX.Element {
  return <Label shape="tag" fill="none" outline="none" align="start" {...props} />
}
