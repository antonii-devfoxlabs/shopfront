// Walking any collection Shopfront keeps, one item at a time.

// The next `count` items from an async cursor, or fewer at the end.
export async function takeAsync<T>(
  cursor: AsyncIterator<T>,
  count: number,
): Promise<T[]> {
  const taken: T[] = [];
  while (taken.length < count) {
    const step = await cursor.next();
    if (step.done) break;
    taken.push(step.value);
  }
  return taken;
}
