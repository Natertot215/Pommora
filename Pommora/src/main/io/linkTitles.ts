// The fetched-page-title cache: `.nexus/linkTitles.json`, keyed by URL → the page's <title>. A URL
// property in the `link-title` look shows this instead of the raw URL. It's a regeneratable network
// accelerator excluded from device sync — each machine builds its own. The resolver (../linkTitles.ts)
// owns the authoritative in-memory copy and persists the WHOLE map through here, so there's no
// per-key read-modify-write to race.
import { mkdir } from 'node:fs/promises'
import { nexusConfig, nexusDir, NEXUS_CONFIG_FILES } from '../paths'
import { readJsonObject, writeJson } from './atomicWrite'

/** URL → fetched page title. */
export type LinkTitleCache = Record<string, string>

const storePath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.linkTitles)

/** Lenient read: absent / corrupt → `{}`; keeps only string-valued entries. */
export async function readLinkTitles(root: string): Promise<LinkTitleCache> {
  const obj = await readJsonObject(storePath(root))
  if (obj === null) return {}
  const out: LinkTitleCache = {}
  for (const [url, title] of Object.entries(obj)) {
    if (typeof title === 'string' && title.length > 0) out[url] = title
  }
  return out
}

/** Persist the full cache atomically (temp + rename; sorted, stable JSON). */
export async function persistLinkTitles(root: string, cache: LinkTitleCache): Promise<void> {
  await mkdir(nexusDir(root), { recursive: true })
  await writeJson(storePath(root), cache)
}
