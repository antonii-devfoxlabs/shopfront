import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.js';
import { CartPage, NothingToUndoError } from '../src/cartPage.js';

test('the message says what the last edit did', () => {
  const page = new CartPage(new Cart());
  page.plus('KTL-03');
  assert.equal(page.message, 'Added KTL-03');
  page.setQuantity('KTL-03', 3);
  assert.equal(page.message, 'KTL-03 set to 3');
  page.remove('KTL-03');
  assert.equal(page.message, 'Removed KTL-03');
});

test('undo puts back what remove took', () => {
  const cart = new Cart();
  cart.add('KTL-03', 2);
  const page = new CartPage(cart);
  page.remove('KTL-03');
  page.undo();
  assert.deepEqual([...cart.lines], [['KTL-03', 2]]);
  assert.equal(page.message, '');
});

test('minus at one removes the line and undo puts it back', () => {
  const cart = new Cart();
  cart.add('MUG-01');
  const page = new CartPage(cart);
  page.minus('MUG-01');
  assert.equal(page.message, 'Removed MUG-01');
  assert.equal(cart.isEmpty(), true);
  page.undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 1]]);
});

test('there is nothing to undo before an edit', () => {
  assert.throws(() => new CartPage(new Cart()).undo(), NothingToUndoError);
});
