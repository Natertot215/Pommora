import { type RefObject, useContext, useState } from 'react'
import { valueOr } from '@pommora/core/Contract/result'
import { useSession } from '../../Session/store'
import type { BannerOwnerKind } from '@pommora/core/Nexus/mutateRequest'
import type { Crop } from '@pommora/core/Nexus/schemas'
import { GhostSuppress } from '@pommora/uix/Interactions/ghostCreate'
import { host } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import {
  type BannerMenuAction,
  bannerMenuItems,
  withSearchRow,
} from '@pommora/core/Actions/identityMenus'

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
  openMenu: (onSearch?: () => void) => Promise<void>
  run: (action: BannerMenuAction) => Promise<void>
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
  const run = async (action: BannerMenuAction): Promise<void> => {
    switch (action) {
      case 'change':
        return addOrChange()
      case 'edit':
        return openEditor()
      case 'remove':
        await setBanner(null)
    }
  }
  const openMenu = async (onSearch?: () => void): Promise<void> => {
    const items = bannerMenuItems({ noun, add, noRemove })
    const action = await holdGhost(() => popMenu(onSearch ? withSearchRow(items) : items))
    if (action === 'search') onSearch?.()
    else if (action) await run(action)
  }
  const onSave = async (crop: Crop): Promise<void> => {
    closeEditor()
    if (await mutate({ op: 'setCrop', image: value ?? '', crop })) onDone?.()
  }
  const onRepick = setBanner

  return {
    openMenu,
    run,
    addOrChange,
    editing,
    openEditor,
    closeEditor,
    boxAspect,
    onSave,
    onRepick,
  }
}
