import { type RefObject, useContext, useState } from 'react'
import { useSession } from '../../store'
import type { BannerOwnerKind } from '@shared/mutate'
import type { Crop } from '@shared/schemas'
import { GhostSuppress } from '../Views/useGhostAnchor'

/** The one place a banner band pops its menu. The ghost-suppress Context lets the card seats stand
 *  their hover ghost down while the menu owns the pointer (a pass-through default leaves the
 *  others unaffected). */
export function useBannerMenu(
  path: string,
  kind: BannerOwnerKind,
  opts: {
    value: string | null | undefined
    frame: RefObject<HTMLElement | null>
    noun?: string
    noRemove?: boolean
    onDone?: () => void
  },
): {
  openMenu: () => Promise<void>
  addOrChange: () => Promise<void>
  editing: boolean
  openEditor: () => void
  closeEditor: () => void
  boxAspect: number
  onSave: (crop: Crop) => Promise<void>
  onRepick: (source: string) => Promise<boolean>
} {
  const { value, frame, noun, noRemove, onDone } = opts
  const mutate = useSession((s) => s.mutate)
  const holdGhost = useContext(GhostSuppress)
  const [editing, setEditing] = useState(false)
  const [boxAspect, setBoxAspect] = useState(1)
  const add = !value

  const setBanner = async (source: string | null): Promise<void> => {
    if (await mutate({ op: 'setBanner', path, kind, source })) onDone?.()
  }
  const addOrChange = async (): Promise<void> => {
    const picked = await window.nexus.pickFile()
    if (picked) await setBanner(picked)
  }
  const openEditor = (): void => {
    const el = frame.current
    if (el && el.clientWidth > 0) setBoxAspect(el.clientHeight / el.clientWidth)
    setEditing(true)
  }
  const closeEditor = (): void => setEditing(false)
  const openMenu = async (): Promise<void> => {
    const action = await holdGhost(() => window.nexus.bannerMenu({ noun, add, noRemove }))
    if (action === 'change') await addOrChange()
    else if (action === 'edit') openEditor()
    else if (action === 'remove') await setBanner(null)
  }
  const onSave = async (crop: Crop): Promise<void> => {
    closeEditor()
    if (await mutate({ op: 'setCrop', image: value ?? '', crop })) onDone?.()
  }
  // onDone advances the seat's value (a page cover refreshes only on refetch, not a tree push), so
  // the picker's re-pick Save-hold — cleared when value changes — never dead-ends on a page seat.
  const onRepick = (source: string): Promise<boolean> =>
    mutate({ op: 'setBanner', path, kind, source }).then((ok) => {
      if (ok) onDone?.()
      return ok
    })

  return { openMenu, addOrChange, editing, openEditor, closeEditor, boxAspect, onSave, onRepick }
}
