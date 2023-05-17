import { deferred } from "../deps/std/async.ts"

export function runWithConcurrency<T>(fns: ReadonlyArray<() => Promise<T>>, concurrency: number) {
  const queue = [...fns]
  let running = 0
  const results: Promise<T>[] = []
  const final = deferred<T[]>()
  flushQueue()
  return final

  function flushQueue() {
    for (; running < concurrency; running++) {
      if (!queue.length) {
        final.resolve(Promise.all(results))
        return
      }
      const promise = queue.shift()!()
      results.push(promise)
      promise.finally(() => {
        running--
        flushQueue()
      })
    }
  }
}
