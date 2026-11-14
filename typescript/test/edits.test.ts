import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart, NotInCartError } from '../src/cart.ts';
import { RemoveLine } from '../src/edits.ts';

test('a removal takes its line away', () => {
  const cart = new Cart();
  cart.add('KTL-03', 2);
  cart.add('TEA-02');
  new RemoveLine(cart, 'KTL-03').run();
  assert.deepEqual([...cart.lines], [['TEA-02', 1]]);
});

test('undoing a removal puts its line back', () => {
  const cart = new Cart();
  cart.add('KTL-03', 2);
  cart.add('TEA-02');
  const removal = new RemoveLine(cart, 'KTL-03');
  removal.run();
  removal.undo();
  assert.deepEqual(
    [...cart.lines],
    [
      ['TEA-02', 1],
      ['KTL-03', 2],
    ],
  );
});

test('a product not in the cart cannot be removed', () => {
  assert.throws(
    () => new RemoveLine(new Cart(), 'KTL-03').run(),
    NotInCartError,
  );
});
