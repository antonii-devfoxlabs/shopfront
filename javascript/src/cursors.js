// Walking any collection Shopfront keeps, one item at a time.

/**
 * The next `count` items from an async cursor, or fewer at the end.
 * @template T
 * @param {AsyncIterator<T>} cursor
 * @param {number} count
 * @returns {Promise<T[]>}
 */
export async function takeAsync(cursor, count) {
  const taken = [];
  while (taken.length < count) {
    const step = await cursor.next();
    if (step.done) break;
    taken.push(step.value);
  }
  return taken;
}
