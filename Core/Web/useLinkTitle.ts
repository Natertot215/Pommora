import { useEffect } from 'react'
import { useSession } from '../Session/store'

export function useLinkTitle(url: string, wants: boolean): string | undefined {
  const title = useSession((s) => (wants ? s.linkTitles[url] : undefined))
  const resolveLinkTitle = useSession((s) => s.resolveLinkTitle)
  useEffect(() => {
    if (wants && !title) void resolveLinkTitle(url)
  }, [wants, title, url, resolveLinkTitle])
  return title
}
