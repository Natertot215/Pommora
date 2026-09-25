// Schema ops that cascade to pages run one at a time so one can't land inside another's cascade and leave the registry and its pages disagreeing. Wrap entry points ONLY: a chained fn awaiting another chained fn deadlocks.

let chain: Promise<unknown> = Promise.resolve()

export function serializeSchemaOp<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn)
  chain = run.catch(() => undefined)
  return run
}
