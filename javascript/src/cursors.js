// Walking any collection Shopfront keeps, one item at a time.
//
// A plain cursor has its stages built in: filter, map and take. An async
// cursor has none yet, so these are the same three, each a walk loop
// written once, which asks the cursor before it only when it is asked.

/**
 * The items of an async cursor that pass `test`.
 * @template T
 * @param {AsyncIterable<T>} cursor
 * @param {(item: T) => boolean} test
 * @returns {AsyncGenerator<T>}
 */
export async function* filterAsync(cursor, test) {
  for await (const item of cursor) {
    if (test(item)) yield item;
  }
}

/**
 * Each item of an async cursor, changed by `change`.
 * @template T, U
 * @param {AsyncIterable<T>} cursor
 * @param {(item: T) => U} change
 * @returns {AsyncGenerator<U>}
 */
export async function* mapAsync(cursor, change) {
  for await (const item of cursor) yield change(item);
}

/**
 * The first `count` items of an async cursor, and none asked for after
 * the last of them.
 * @template T
 * @param {AsyncIterable<T>} cursor
 * @param {number} count
 * @returns {AsyncGenerator<T>}
 */
export async function* takeAsync(cursor, count) {
  if (count <= 0) return;
  let taken = 0;
  for await (const item of cursor) {
    yield item;
    taken += 1;
    if (taken === count) return;
  }
}
