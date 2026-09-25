import { useCallback, useState } from 'react'
import { thumbKey, thumbRel } from '@pommora/core/Paths/nexusPaths'
import { assetUrl } from '../Platform/assetScheme'
import { useSession } from '../Session/store'

/** A captured preview image for a nav key: the current thumbnail version, and the failure that falls back to a placeholder until the source changes. */
export function useThumb(
  nexusId: string,
  key: string | undefined,
): { src: string | undefined; onError: () => void } {
  const version = useSession((s) => (key ? (s.thumbVersions[key] ?? 0) : 0))
  const [failedSrc, setFailedSrc] = useState<string>()
  const src = key ? `${assetUrl(thumbRel(nexusId, thumbKey(key)))}?v=${version}` : undefined
  const onError = useCallback(() => setFailedSrc(src), [src])
  return { src: src === failedSrc ? undefined : src, onError }
}
