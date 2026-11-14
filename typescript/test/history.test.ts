import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.ts';
import { apply, type Edit } from '../src/edits.ts';
import {
  History,
  NothingToRedoError,
  NothingToUndoError,
  type Undo,
} from '../src/history.ts';

function cartHistory(cart: Cart): History<Edit> {
  return new History((edit: Edit) => apply(cart, edit));
}

test('undo takes back the newest edit first', () => {
  const cart = new Cart();
  const history = cartHistory(cart);
  history.run({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  history.run({ kind: 'AddLine', sku: 'MUG-01', quantity: 1 });
  history.undo();
  assert.deepEqual([...cart.lines], [['KTL-03', 1]]);
});

test('redo runs the edit undo took back', () => {
  const cart = new Cart();
  cart.add('KTL-03', 2);
  const history = cartHistory(cart);
  history.run({ kind: 'RemoveLine', sku: 'KTL-03' });
  history.undo();
  const edit = history.redo();
  assert.equal(cart.isEmpty(), true);
  assert.deepEqual(edit, { kind: 'RemoveLine', sku: 'KTL-03' });
});

test('an empty history has nothing to undo or redo', () => {
  const history = cartHistory(new Cart());
  assert.throws(() => history.undo(), NothingToUndoError);
  assert.throws(() => history.redo(), NothingToRedoError);
});

test('a new edit lets go of the undone ones', () => {
  const cart = new Cart();
  const history = cartHistory(cart);
  history.run({ kind: 'AddLine', sku: 'KTL-03', quantity: 1 });
  history.undo();
  history.run({ kind: 'AddLine', sku: 'MUG-01', quantity: 1 });
  assert.throws(() => history.redo(), NothingToRedoError);
  assert.deepEqual([...cart.lines], [['MUG-01', 1]]);
});

test('the history runs any edit it is given a way to apply', () => {
  const notes: string[] = [];
  const history = new History((note: string): Undo => {
    notes.push(note);
    return () => notes.splice(notes.indexOf(note), 1);
  });
  history.run('Gift wrap');
  history.undo();
  assert.deepEqual(notes, []);
  assert.equal(history.redo(), 'Gift wrap');
  assert.deepEqual(notes, ['Gift wrap']);
});
