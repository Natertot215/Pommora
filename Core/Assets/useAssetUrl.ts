import { useSession } from '../Session/store'
import { resolveAssetUrl } from './assetUrl'

export const useAssetUrl = (value: string | null | undefined): string | null => {
  const map = useSession((s) => s.assetMap)
  return resolveAssetUrl(value, map)
}
