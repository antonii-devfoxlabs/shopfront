import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart, NotInCartError } from '../src/cart.js';
import {
  AddLine,
  ChangeQuantity,
  EmptyCart,
  RemoveLine,
} from '../src/edits.js';

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

test('undo puts back the line its own removal took', () => {
  const cart = new Cart();
  cart.add('MUG-01');
  cart.add('KTL-03');
  new RemoveLine(cart, 'KTL-03').run();
  const last = new RemoveLine(cart, 'MUG-01');
  last.run();
  last.undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 1]]);
});

test('undoing an add takes a new line away', () => {
  const cart = new Cart();
  cart.add('TEA-02');
  const addition = new AddLine(cart, 'KTL-03');
  addition.run();
  addition.undo();
  assert.deepEqual([...cart.lines], [['TEA-02', 1]]);
});

test('undoing an add puts back the quantity before it', () => {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  const addition = new AddLine(cart, 'MUG-01');
  addition.run();
  assert.deepEqual([...cart.lines], [['MUG-01', 3]]);
  addition.undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 2]]);
});

test('undoing a quantity change sets the old one back', () => {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  const change = new ChangeQuantity(cart, 'MUG-01', 5);
  change.run();
  change.undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 2]]);
});

test('undoing a change to zero puts the line back', () => {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  const change = new ChangeQuantity(cart, 'MUG-01', 0);
  change.run();
  assert.equal(cart.isEmpty(), true);
  change.undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 2]]);
});

test('undoing an emptying puts every line back in order', () => {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  cart.add('KTL-03');
  cart.add('TEA-02', 3);
  const emptying = new EmptyCart(cart);
  emptying.run();
  assert.equal(cart.isEmpty(), true);
  emptying.undo();
  assert.deepEqual(
    [...cart.lines],
    [
      ['MUG-01', 2],
      ['KTL-03', 1],
      ['TEA-02', 3],
    ],
  );
});

test('every edit names itself for the page', () => {
  const cart = new Cart();
  assert.equal(new AddLine(cart, 'KTL-03').label(), 'Added KTL-03');
  assert.equal(
    new ChangeQuantity(cart, 'KTL-03', 3).label(),
    'KTL-03 set to 3',
  );
  assert.equal(
    new ChangeQuantity(cart, 'KTL-03', 0).label(),
    'Removed KTL-03',
  );
  assert.equal(new RemoveLine(cart, 'KTL-03').label(), 'Removed KTL-03');
  assert.equal(new EmptyCart(cart).label(), 'Emptied the cart');
});
