import { type ReactNode, useEffect, useRef, useState } from 'react'
import { DONE_MS } from './motion'
import { Swap } from './Swap'

export function useTimedLabel(idle: string, active: string): [ReactNode, () => void] {
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const mark = (): void => {
    setDone(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), DONE_MS)
  }
  const label = <Swap swapped={done} from={idle} to={active} />
  return [label, mark]
}
