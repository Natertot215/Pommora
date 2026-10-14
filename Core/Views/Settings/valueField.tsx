import { useState } from 'react'
import { MenuCaption } from '@pommora/uix/Menus'
import { sameItems } from '@pommora/uix/Utilities/same'
import { toggleValue } from '../../Properties/Pickers/PropertyPicker'

export const emptyPicker = (label: string): React.JSX.Element => <MenuCaption>{label}</MenuCaption>

export function useMultiValue(
  values: string[],
  onCommit: (next: string[]) => void,
): { shown: string[]; toggle: (v: string) => void } {
  const [local, setLocal] = useState<string[] | null>(null)
  if (local && sameItems(local, values)) setLocal(null)
  const shown = local ?? values
  const toggle = (v: string): void => {
    const next = toggleValue(shown, v)
    setLocal(next)
    onCommit(next)
  }
  return { shown, toggle }
}
