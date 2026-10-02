/** Runs each step once the one before it settles and answers the step's own result; a failed step goes to `onFail` and the steps after it still run. */
export function inTurns(onFail: (e: unknown) => void = () => {}) {
  let last: Promise<unknown> = Promise.resolve()
  return <T>(step: () => T | PromiseLike<T>): Promise<T> => {
    const turn = last.then(step)
    last = turn.catch(onFail)
    return turn
  }
}
