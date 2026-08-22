import { useSession } from '../../store'
import type { BannerOwnerKind } from '@shared/mutate'

/** The banner change/remove flow every banner band shares: the native menu, the image pick, the
 *  setBanner mutation. What differs per surface is only what runs after a landed write. */
export function useBannerMenu(
  path: string,
  kind: BannerOwnerKind,
  onDone?: () => void,
): { openMenu: () => Promise<void>; addOrChange: () => Promise<void> } {
  const mutate = useSession((s) => s.mutate)
  const setBanner = async (source: string | null): Promise<void> => {
    if (await mutate({ op: 'setBanner', path, kind, source })) onDone?.()
  }
  const addOrChange = async (): Promise<void> => {
    const picked = await window.nexus.pickFile()
    if (picked) await setBanner(picked)
  }
  const openMenu = async (): Promise<void> => {
    const action = await window.nexus.bannerMenu()
    if (action === 'change') await addOrChange()
    else if (action === 'remove') await setBanner(null)
  }
  return { openMenu, addOrChange }
}
