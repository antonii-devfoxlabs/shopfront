import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterAsync, mapAsync, takeAsync } from '../src/cursors.ts';

test('a pipeline asks its cursor for no item after the last it hands over', async () => {
  const asked: number[] = [];
  async function* numbers(): AsyncGenerator<number> {
    for (let number = 1; number < 10; number += 1) {
      asked.push(number);
      yield number;
    }
  }
  const odd = filterAsync(numbers(), (number) => number % 2 === 1);
  const tens = mapAsync(odd, (number) => number * 10);
  assert.deepEqual(await Array.fromAsync(takeAsync(tens, 2)), [10, 30]);
  assert.deepEqual(asked, [1, 2, 3]);
});

test('taking none asks for nothing', async () => {
  const asked: number[] = [];
  async function* numbers(): AsyncGenerator<number> {
    asked.push(1);
    yield 1;
  }
  assert.deepEqual(await Array.fromAsync(takeAsync(numbers(), 0)), []);
  assert.deepEqual(asked, []);
});
