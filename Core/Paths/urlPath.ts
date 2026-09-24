/** A target carrying a scheme is left as-written and refused as a page title. */
export const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/** Written-out rather than inferred: normalization promotes a bare `example.com` to https, so surfaces that must know what the author actually wrote layer this on top of link validity. */
export const WEB_ADDRESS = /^https?:\/\//i

export function normalizeLinkUrl(url: string): string {
  const u = url.trim()
  return HAS_SCHEME.test(u) ? u : `https://${u}`
}

export function linkDomain(url: string): string {
  try {
    return new URL(normalizeLinkUrl(url)).hostname.replace(/^www\./i, '') || url.trim()
  } catch {
    return url.trim()
  }
}

export function isHttpLink(url: string): boolean {
  return isValidLink(url) && WEB_ADDRESS.test(normalizeLinkUrl(url))
}

export function isValidLink(url: string): boolean {
  const u = url.trim()
  if (!u || /\s/.test(u)) return false
  const n = normalizeLinkUrl(u)
  if (/^mailto:/i.test(n)) return /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(n)
  if (!WEB_ADDRESS.test(n)) return false
  try {
    const host = new URL(n).hostname
    return host.length > 2 && host.includes('.') && !host.startsWith('.') && !host.endsWith('.')
  } catch {
    return false
  }
}
