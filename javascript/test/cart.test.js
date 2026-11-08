import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart, NotInCartError } from '../src/cart.js';

test('adding the same product twice adds up', () => {
  const cart = new Cart();
  cart.add('MUG-01');
  cart.add('MUG-01', 2);
  assert.deepEqual([...cart.lines], [['MUG-01', 3]]);
});

test('adding nothing is an error', () => {
  assert.throws(() => new Cart().add('MUG-01', 0), RangeError);
});

test('changing a quantity to zero removes the line', () => {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  cart.changeQuantity('MUG-01', 0);
  assert.equal(cart.isEmpty(), true);
});

test('changing a quantity sets it', () => {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  cart.changeQuantity('MUG-01', 5);
  assert.deepEqual([...cart.lines], [['MUG-01', 5]]);
});

test('a product not in the cart cannot change', () => {
  assert.throws(() => new Cart().changeQuantity('MUG-01', 2), NotInCartError);
  assert.throws(() => new Cart().remove('MUG-01'), NotInCartError);
});

test('removing a line', () => {
  const cart = new Cart();
  cart.add('MUG-01');
  cart.add('TEA-02');
  cart.remove('MUG-01');
  assert.deepEqual([...cart.lines], [['TEA-02', 1]]);
});
