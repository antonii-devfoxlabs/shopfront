// Walking any collection Shopfront keeps, one item at a time.
//
// A plain cursor has its stages built in: filter, map and take. An async
// cursor has none yet, so these are the same three, each a walk loop
// written once, which asks the cursor before it only when it is asked.

// The items of an async cursor that pass `test`.
export async function* filterAsync<T>(
  cursor: AsyncIterable<T>,
  test: (item: T) => boolean,
): AsyncGenerator<T> {
  for await (const item of cursor) {
    if (test(item)) yield item;
  }
}

// Each item of an async cursor, changed by `change`.
export async function* mapAsync<T, U>(
  cursor: AsyncIterable<T>,
  change: (item: T) => U,
): AsyncGenerator<U> {
  for await (const item of cursor) yield change(item);
}

// The first `count` items of an async cursor, and none asked for after
// the last of them.
export async function* takeAsync<T>(
  cursor: AsyncIterable<T>,
  count: number,
): AsyncGenerator<T> {
  if (count <= 0) return;
  let taken = 0;
  for await (const item of cursor) {
    yield item;
    taken += 1;
    if (taken === count) return;
  }
}
