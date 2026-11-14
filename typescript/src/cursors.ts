// Walking any collection Shopfront keeps, one item at a time.

// The next `count` items from the cursor, or fewer at the end.
export function take<T>(cursor: Iterator<T>, count: number): T[] {
  const taken: T[] = [];
  while (taken.length < count) {
    const step = cursor.next();
    if (step.done) break;
    taken.push(step.value);
  }
  return taken;
}
