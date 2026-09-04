import { type RefObject, useContext, useState } from 'react'
import { useSession } from '../store'
import type { BannerOwnerKind } from '@shared/mutate'
import type { Crop } from '@shared/schemas'
import { GhostSuppress } from '@renderer/Interactions/ghostCreate'

/** The one place a banner band pops its menu. The ghost-suppress Context lets card seats stand
 *  their hover ghost down while the menu owns the pointer. */
export function useBannerMenu(
  path: string,
  kind: BannerOwnerKind,
  opts: {
    value: string | null | undefined
    frame: RefObject<HTMLElement | null>
    noun?: string
    noRemove?: boolean
    onDone?: () => void
    /** Pop the crop editor right after a fresh pick lands — a card frames its cover on set; the
     *  banner band and the other add surfaces leave it off. */
    autoEdit?: boolean
  },
): {
  openMenu: () => Promise<void>
  addOrChange: () => Promise<void>
  editing: boolean
  openEditor: () => void
  closeEditor: () => void
  boxAspect: number
  onSave: (crop: Crop) => Promise<void>
  onRepick: (source: string) => Promise<string | undefined>
} {
  const { value, frame, noun, noRemove, onDone, autoEdit } = opts
  const mutate = useSession((s) => s.mutate)
  const holdGhost = useContext(GhostSuppress)
  const [editing, setEditing] = useState(false)
  const [boxAspect, setBoxAspect] = useState(1)
  const add = !value

  // onDone advances the seat's value so a re-pick's picker resets its draft to the new image —
  // a page cover refreshes only on refetch, not a tree push.
  const setBanner = async (source: string | null): Promise<string | undefined> => {
    let adopted: string | undefined
    const ok = await mutate({ op: 'setBanner', path, kind, source }, undefined, (a) => {
      adopted = a
    })
    if (ok) onDone?.()
    return ok ? adopted : undefined
  }
  const addOrChange = async (): Promise<void> => {
    const picked = await window.nexus.pickFile()
    if (picked && (await setBanner(picked)) && autoEdit) openEditor()
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
  const onRepick = setBanner

  return { openMenu, addOrChange, editing, openEditor, closeEditor, boxAspect, onSave, onRepick }
}
