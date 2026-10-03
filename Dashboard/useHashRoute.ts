import { useEffect, useState } from 'react'

const read = (): string => window.location.hash.slice(1)

export function useHashRoute(): string {
  const [hash, setHash] = useState(read)

  useEffect(() => {
    const onHashChange = (): void => setHash(read())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return hash
}

export function setHashRoute(id: string): void {
  window.location.hash = id
}
