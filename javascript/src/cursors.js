// Walking any collection Shopfront keeps, one item at a time.

/**
 * Every cursor fills this slot, whatever collection it walks: it hands
 * over the items one at a time and keeps its own place. Each collection
 * makes its own kind. `next` answers the next item, or undefined once
 * every one is handed over.
 * @template T
 * @typedef {object} Cursor
 * @property {() => T | undefined} next
 */

/**
 * The next `count` items from the cursor, or fewer at the end.
 * @template T
 * @param {Cursor<T>} cursor
 * @param {number} count
 * @returns {T[]}
 */
export function take(cursor, count) {
  const taken = [];
  while (taken.length < count) {
    const item = cursor.next();
    if (item === undefined) break;
    taken.push(item);
  }
  return taken;
}
