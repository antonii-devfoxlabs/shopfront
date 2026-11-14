import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.ts';
import { CartPage, restore } from '../src/cartPage.ts';
import { minus } from '../src/edits.ts';
import { NothingToRedoError, NothingToUndoError } from '../src/history.ts';

test('the message says what the last edit did', () => {
  const cart = new Cart();
  const page = new CartPage(cart);
  page.press({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  assert.equal(page.message, 'Added KTL-03');
  page.press({ kind: 'ChangeQuantity', sku: 'KTL-03', quantity: 3 });
  assert.equal(page.message, 'KTL-03 set to 3');
  page.press({ kind: 'RemoveLine', sku: 'KTL-03' });
  assert.equal(page.message, 'Removed KTL-03');
});

test('undo puts back what remove took', () => {
  const cart = new Cart();
  cart.add('KTL-03', 2);
  const page = new CartPage(cart);
  page.press({ kind: 'RemoveLine', sku: 'KTL-03' });
  page.undo();
  assert.deepEqual([...cart.lines], [['KTL-03', 2]]);
  assert.equal(page.message, '');
});

test('minus at one removes the line and undo puts it back', () => {
  const cart = new Cart();
  cart.add('MUG-01');
  const page = new CartPage(cart);
  page.press(minus(cart, 'MUG-01'));
  assert.equal(page.message, 'Removed MUG-01');
  assert.equal(cart.isEmpty(), true);
  page.undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 1]]);
});

test('minus above one takes one away', () => {
  const cart = new Cart();
  cart.add('MUG-01', 3);
  const page = new CartPage(cart);
  page.press(minus(cart, 'MUG-01'));
  assert.equal(page.message, 'MUG-01 set to 2');
  page.undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 3]]);
});

test('undo after empty cart puts every line back', () => {
  const cart = new Cart();
  const page = new CartPage(cart);
  page.press({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  page.press({ kind: 'AddLine', sku: 'MUG-01', quantity: 1 });
  page.press({ kind: 'EmptyCart' });
  page.undo();
  assert.deepEqual(
    [...cart.lines],
    [
      ['KTL-03', 1],
      ['MUG-01', 1],
    ],
  );
});

test('there is nothing to undo before an edit', () => {
  assert.throws(() => new CartPage(new Cart()).undo(), NothingToUndoError);
});

test('undo twice takes both edits back', () => {
  const cart = new Cart();
  const page = new CartPage(cart);
  page.press({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  page.press({ kind: 'AddLine', sku: 'MUG-01', quantity: 1 });
  page.undo();
  assert.deepEqual([...cart.lines], [['KTL-03', 1]]);
  page.undo();
  assert.equal(cart.isEmpty(), true);
  assert.throws(() => page.undo(), NothingToUndoError);
});

test('redo runs the undone edits again, newest first', () => {
  const cart = new Cart();
  const page = new CartPage(cart);
  page.press({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  page.press({ kind: 'AddLine', sku: 'MUG-01', quantity: 1 });
  page.undo();
  page.undo();
  page.redo();
  assert.deepEqual([...cart.lines], [['KTL-03', 1]]);
  assert.equal(page.message, 'Added KTL-03');
  page.redo();
  assert.deepEqual(
    [...cart.lines],
    [
      ['KTL-03', 1],
      ['MUG-01', 1],
    ],
  );
});

test('there is nothing to redo before an undo', () => {
  const cart = new Cart();
  const page = new CartPage(cart);
  page.press({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  assert.throws(() => page.redo(), NothingToRedoError);
});

test('redo after empty cart has nothing to redo', () => {
  const cart = new Cart();
  const page = new CartPage(cart);
  page.press({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  page.press({ kind: 'RemoveLine', sku: 'KTL-03' });
  page.undo();
  page.press({ kind: 'EmptyCart' });
  assert.throws(() => page.redo(), NothingToRedoError);
  assert.equal(cart.isEmpty(), true);
});

test('the log holds every press, undo and redo in order', () => {
  const cart = new Cart();
  const page = new CartPage(cart);
  page.press({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  page.press({ kind: 'ChangeQuantity', sku: 'KTL-03', quantity: 3 });
  page.undo();
  page.redo();
  assert.deepEqual(page.log, [
    'Added KTL-03',
    'KTL-03 set to 3',
    'Undo',
    'Redo',
  ]);
});

test('a restart brings back the cart from the log', () => {
  const cart = new Cart();
  const page = new CartPage(cart);
  page.press({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  page.press({ kind: 'AddLine', sku: 'MUG-01', quantity: 1 });
  page.press({ kind: 'ChangeQuantity', sku: 'MUG-01', quantity: 3 });
  page.press({ kind: 'RemoveLine', sku: 'KTL-03' });
  page.undo();
  const restoredCart = new Cart();
  restore(restoredCart, page.log);
  assert.deepEqual([...restoredCart.lines], [...cart.lines]);
});

test('undo still works after a restart', () => {
  const cart = new Cart();
  const page = new CartPage(cart);
  page.press({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  page.press({ kind: 'EmptyCart' });
  const restoredCart = new Cart();
  const restored = restore(restoredCart, page.log);
  restored.undo();
  assert.deepEqual([...restoredCart.lines], [['KTL-03', 1]]);
});
