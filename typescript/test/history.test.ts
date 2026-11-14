import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.ts';
import { AddLine, RemoveLine } from '../src/edits.ts';
import {
  History,
  NothingToRedoError,
  NothingToUndoError,
} from '../src/history.ts';

test('undo takes back the newest edit first', () => {
  const cart = new Cart();
  const history = new History();
  history.run(new AddLine(cart, 'KTL-03'));
  history.run(new AddLine(cart, 'MUG-01'));
  history.undo();
  assert.deepEqual([...cart.lines], [['KTL-03', 1]]);
});

test('redo runs the edit undo took back', () => {
  const cart = new Cart();
  cart.add('KTL-03', 2);
  const history = new History();
  history.run(new RemoveLine(cart, 'KTL-03'));
  history.undo();
  const edit = history.redo();
  assert.equal(cart.isEmpty(), true);
  assert.equal(edit.label(), 'Removed KTL-03');
});

test('an empty history has nothing to undo or redo', () => {
  const history = new History();
  assert.throws(() => history.undo(), NothingToUndoError);
  assert.throws(() => history.redo(), NothingToRedoError);
});

test('a new edit lets go of the undone ones', () => {
  const cart = new Cart();
  const history = new History();
  history.run(new AddLine(cart, 'KTL-03'));
  history.undo();
  history.run(new AddLine(cart, 'MUG-01'));
  assert.throws(() => history.redo(), NothingToRedoError);
  assert.deepEqual([...cart.lines], [['MUG-01', 1]]);
});
