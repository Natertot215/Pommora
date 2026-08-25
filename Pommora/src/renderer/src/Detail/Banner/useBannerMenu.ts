import { type RefObject, useContext, useState } from 'react'
import { useSession } from '../../store'
import type { BannerOwnerKind } from '@shared/mutate'
import type { Crop } from '@shared/schemas'
import { GhostSuppress } from '../Views/useGhostAnchor'

/** The one place a banner band pops its menu: Add / Change / Edit / Remove, the image pick, the
 *  setBanner mutation, and the crop editor. `add` is derived from whether a banner is set; the
 *  ghost-suppress Context lets the card seats stand their hover ghost down while the menu owns the
 *  pointer (a pass-through default leaves the others unaffected). Edit opens the picker on the
 *  seat's own box ratio. */
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
  const onSave = (crop: Crop): Promise<void> =>
    mutate({ op: 'setCrop', image: value ?? '', crop }).then((ok) => {
      if (ok) onDone?.()
    })
  const onRepick = (source: string): Promise<boolean> =>
    mutate({ op: 'setBanner', path, kind, source })

  return { openMenu, addOrChange, editing, openEditor, closeEditor, boxAspect, onSave, onRepick }
}
