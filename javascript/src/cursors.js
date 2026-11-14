// Walking any collection Shopfront keeps, one item at a time.

/**
 * The next `count` items from the cursor, or fewer at the end.
 * @template T
 * @param {Iterator<T>} cursor
 * @param {number} count
 * @returns {T[]}
 */
export function take(cursor, count) {
  const taken = [];
  while (taken.length < count) {
    const step = cursor.next();
    if (step.done) break;
    taken.push(step.value);
  }
  return taken;
}
