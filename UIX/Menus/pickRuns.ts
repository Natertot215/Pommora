export type PickRun = 'solo' | 'first' | 'middle' | 'last'

/** Each picked row's place among the picked rows touching it, so a run draws as one ring; a run never continues past a row `ends` marks. */
export function pickRuns(
  picked: readonly boolean[],
  ends?: readonly boolean[],
): (PickRun | undefined)[] {
  const joinsAbove = (i: number): boolean => i > 0 && picked[i - 1] && picked[i] && !ends?.[i - 1]
  return picked.map((p, i) => {
    if (!p) return undefined
    const up = joinsAbove(i)
    const down = joinsAbove(i + 1)
    if (up) return down ? 'middle' : 'last'
    return down ? 'first' : 'solo'
  })
}
