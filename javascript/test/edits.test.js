import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart, NotInCartError } from '../src/cart.js';
import { apply, label } from '../src/edits.js';

test('a removal takes its line away', () => {
  const cart = new Cart();
  cart.add('KTL-03', 2);
  cart.add('TEA-02');
  apply(cart, { kind: 'RemoveLine', sku: 'KTL-03' });
  assert.deepEqual([...cart.lines], [['TEA-02', 1]]);
});

test('undoing a removal puts its line back', () => {
  const cart = new Cart();
  cart.add('KTL-03', 2);
  cart.add('TEA-02');
  const undo = apply(cart, { kind: 'RemoveLine', sku: 'KTL-03' });
  undo();
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
    () => apply(new Cart(), { kind: 'RemoveLine', sku: 'KTL-03' }),
    NotInCartError,
  );
});

test('undo puts back the line its own removal took', () => {
  const cart = new Cart();
  cart.add('MUG-01');
  cart.add('KTL-03');
  apply(cart, { kind: 'RemoveLine', sku: 'KTL-03' });
  const undo = apply(cart, { kind: 'RemoveLine', sku: 'MUG-01' });
  undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 1]]);
});

test('undoing an add takes a new line away', () => {
  const cart = new Cart();
  cart.add('TEA-02');
  const undo = apply(cart, { kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  undo();
  assert.deepEqual([...cart.lines], [['TEA-02', 1]]);
});

test('undoing an add puts back the quantity before it', () => {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  const undo = apply(cart, { kind: 'AddLine', sku: 'MUG-01', quantity: 1 });
  assert.deepEqual([...cart.lines], [['MUG-01', 3]]);
  undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 2]]);
});

test('undoing a quantity change sets the old one back', () => {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  const undo = apply(cart, {
    kind: 'ChangeQuantity',
    sku: 'MUG-01',
    quantity: 5,
  });
  undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 2]]);
});

test('undoing a change to zero puts the line back', () => {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  const undo = apply(cart, {
    kind: 'ChangeQuantity',
    sku: 'MUG-01',
    quantity: 0,
  });
  assert.equal(cart.isEmpty(), true);
  undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 2]]);
});

test('undoing an emptying puts every line back in order', () => {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  cart.add('KTL-03');
  cart.add('TEA-02', 3);
  const undo = apply(cart, { kind: 'EmptyCart' });
  assert.equal(cart.isEmpty(), true);
  undo();
  assert.deepEqual(
    [...cart.lines],
    [
      ['MUG-01', 2],
      ['KTL-03', 1],
      ['TEA-02', 3],
    ],
  );
});

test('one edit applied twice undoes each time on its own', () => {
  const cart = new Cart();
  const plusKettle = { kind: 'AddLine', sku: 'KTL-03', quantity: 1 };
  const first = apply(cart, plusKettle);
  const second = apply(cart, plusKettle);
  second();
  first();
  assert.equal(cart.isEmpty(), true);
});

test('every edit names itself for the page', () => {
  assert.equal(
    label({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 }),
    'Added KTL-03',
  );
  assert.equal(
    label({ kind: 'ChangeQuantity', sku: 'KTL-03', quantity: 3 }),
    'KTL-03 set to 3',
  );
  assert.equal(
    label({ kind: 'ChangeQuantity', sku: 'KTL-03', quantity: 0 }),
    'Removed KTL-03',
  );
  assert.equal(
    label({ kind: 'RemoveLine', sku: 'KTL-03' }),
    'Removed KTL-03',
  );
  assert.equal(label({ kind: 'EmptyCart' }), 'Emptied the cart');
});

test('an edit holds only plain values', () => {
  assert.equal(
    JSON.stringify({ kind: 'AddLine', sku: 'KTL-03', quantity: 2 }),
    '{"kind":"AddLine","sku":"KTL-03","quantity":2}',
  );
});
