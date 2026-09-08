import { type RefObject, useContext, useState } from 'react'
import { valueOr } from '@pommora/core/Contract/result'
import { useSession } from '../../Session/store'
import type { BannerOwnerKind } from '@pommora/core/Pages/mutateRequest'
import type { Crop } from '@pommora/core/Nexus/schemas'
import { GhostSuppress } from '@pommora/uix/Interactions/ghostCreate'
import { host } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { bannerMenuItems } from '@pommora/core/Actions/identityMenus'

export function useBannerMenu(
  path: string,
  kind: BannerOwnerKind,
  opts: {
    value: string | null | undefined
    frame: RefObject<HTMLElement | null>
    noun?: string
    noRemove?: boolean
    onDone?: () => void
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

  // onDone advances the seat's value so a re-pick's picker resets its draft — a page cover refreshes only on refetch, not a tree push.
  const setBanner = async (source: string | null): Promise<string | undefined> => {
    let adopted: string | undefined
    const ok = await mutate({ op: 'setBanner', path, kind, source }, undefined, (a) => {
      adopted = a
    })
    if (ok) onDone?.()
    return ok ? adopted : undefined
  }
  const addOrChange = async (): Promise<void> => {
    const picked = valueOr(await host().ask('nexus:pickFile'), null)
    if (picked && (await setBanner(picked)) && autoEdit) openEditor()
  }
  const openEditor = (): void => {
    const el = frame.current
    if (el && el.clientWidth > 0) setBoxAspect(el.clientHeight / el.clientWidth)
    setEditing(true)
  }
  const closeEditor = (): void => setEditing(false)
  const openMenu = async (): Promise<void> => {
    const action = await holdGhost(() => popMenu(bannerMenuItems({ noun, add, noRemove })))
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
