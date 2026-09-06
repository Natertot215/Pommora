import { useSession } from '../Session/store'
import { resolveAssetUrl } from './assetUrl'

/** Resolve a stored asset value — a wikilink, a raw path, or a web address — to what an `<img>`
 *  renders, or null where nothing does. Held here beside the store because every consumer needs
 *  the same map, and `assetUrl.ts` stays free of React so a non-Electron host can reuse it. */
export const useAssetUrl = (value: string | null | undefined): string | null => {
  const map = useSession((s) => s.assetMap)
  return resolveAssetUrl(value, map)
}
