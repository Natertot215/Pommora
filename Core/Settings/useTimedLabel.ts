import { useEffect, useRef, useState } from 'react'

const ACTIVE_MS = 1500

export function useTimedLabel(idle: string, active: string): [string, () => void] {
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const mark = (): void => {
    setDone(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), ACTIVE_MS)
  }
  return [done ? active : idle, mark]
}
