import { assetUrl } from '../Platform/assetScheme'
import { parseConnectionText } from '@pommora/core/Connections/connections'
import { resolveAssetName } from './assetMap'
import { HAS_SCHEME } from '@pommora/core/Paths/url'
import type { AssetMap } from '@pommora/core/Nexus/tree'

type AssetValue =
  | { kind: 'asset'; rel: string }
  | { kind: 'external'; url: string }
  | { kind: 'unresolved' }

export function resolveAssetValue(value: string, map: AssetMap): AssetValue {
  const raw = value.trim()
  if (!raw) return { kind: 'unresolved' }
  const named = namedAsset(raw, map)
  if (named) return named
  if (HAS_SCHEME.test(raw)) return { kind: 'external', url: raw }
  return { kind: 'asset', rel: raw }
}

function namedAsset(raw: string, map: AssetMap): FileValue | null {
  const link = parseConnectionText(raw)
  if (!link) return null
  const rel = resolveAssetName(map, link.title)
  return typeof rel === 'string' ? { kind: 'asset', rel } : { kind: 'unresolved' }
}

type FileValue = Exclude<AssetValue, { kind: 'external' }>

export function resolveFileValue(value: string, map: AssetMap): FileValue {
  return namedAsset(value.trim(), map) ?? { kind: 'unresolved' }
}

export function resolveAssetUrl(value: string | null | undefined, map: AssetMap): string | null {
  if (!value) return null
  const res = resolveAssetValue(value, map)
  if (res.kind === 'external') return res.url
  if (res.kind === 'unresolved') return null
  return `${assetUrl(res.rel)}?v=${map.version}`
}
