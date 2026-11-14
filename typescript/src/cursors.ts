// Walking any collection Shopfront keeps, one item at a time.

// Every cursor fills this slot, whatever collection it walks: it hands
// over the items one at a time and keeps its own place. Each collection
// makes its own kind.
export interface Cursor<T> {
  // The next item, or undefined once every one is handed over.
  next(): T | undefined;
}

// The next `count` items from the cursor, or fewer at the end.
export function take<T>(cursor: Cursor<T>, count: number): T[] {
  const taken: T[] = [];
  while (taken.length < count) {
    const item = cursor.next();
    if (item === undefined) break;
    taken.push(item);
  }
  return taken;
}
