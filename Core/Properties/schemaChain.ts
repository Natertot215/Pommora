// Schema ops that cascade to pages run one at a time so one can't land inside another's cascade and leave the registry and its pages disagreeing. They chain here rather than on the machine's lock because a quit drains the machine's file locks, so a cascade queued there would hold the quit until it finished; one on this chain is cut once the locked writes in flight land, and a property's rename or delete, or an option's rename or removal, finishes from its journal at the next open. Wrap entry points ONLY: a chained fn awaiting another chained fn deadlocks.

let chain: Promise<unknown> = Promise.resolve()

export function serializeSchemaOp<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn)
  chain = run.catch(() => undefined)
  return run
}
