import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.ts';
import { CartPage, NothingToUndoError } from '../src/cartPage.ts';
import {
  AddLine,
  ChangeQuantity,
  EmptyCart,
  RemoveLine,
  minus,
  type Edit,
} from '../src/edits.ts';

test('the message says what the last edit did', () => {
  const cart = new Cart();
  const page = new CartPage();
  page.press(new AddLine(cart, 'KTL-03'));
  assert.equal(page.message, 'Added KTL-03');
  page.press(new ChangeQuantity(cart, 'KTL-03', 3));
  assert.equal(page.message, 'KTL-03 set to 3');
  page.press(new RemoveLine(cart, 'KTL-03'));
  assert.equal(page.message, 'Removed KTL-03');
});

test('undo puts back what remove took', () => {
  const cart = new Cart();
  cart.add('KTL-03', 2);
  const page = new CartPage();
  page.press(new RemoveLine(cart, 'KTL-03'));
  page.undo();
  assert.deepEqual([...cart.lines], [['KTL-03', 2]]);
  assert.equal(page.message, '');
});

test('minus at one removes the line and undo puts it back', () => {
  const cart = new Cart();
  cart.add('MUG-01');
  const page = new CartPage();
  page.press(minus(cart, 'MUG-01'));
  assert.equal(page.message, 'Removed MUG-01');
  assert.equal(cart.isEmpty(), true);
  page.undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 1]]);
});

test('minus above one takes one away', () => {
  const cart = new Cart();
  cart.add('MUG-01', 3);
  const page = new CartPage();
  page.press(minus(cart, 'MUG-01'));
  assert.equal(page.message, 'MUG-01 set to 2');
  page.undo();
  assert.deepEqual([...cart.lines], [['MUG-01', 3]]);
});

test('undo after empty cart puts every line back', () => {
  const cart = new Cart();
  const page = new CartPage();
  page.press(new AddLine(cart, 'KTL-03'));
  page.press(new AddLine(cart, 'MUG-01'));
  page.press(new EmptyCart(cart));
  page.undo();
  assert.deepEqual(
    [...cart.lines],
    [
      ['KTL-03', 1],
      ['MUG-01', 1],
    ],
  );
});

test('the page runs any edit that fills the slot', () => {
  const done: string[] = [];
  const note: Edit = {
    run: () => {
      done.push('run');
    },
    undo: () => {
      done.push('undo');
    },
    label: () => 'Noted',
  };
  const page = new CartPage();
  page.press(note);
  assert.equal(page.message, 'Noted');
  page.undo();
  assert.deepEqual(done, ['run', 'undo']);
});

test('there is nothing to undo before an edit', () => {
  assert.throws(() => new CartPage().undo(), NothingToUndoError);
});
