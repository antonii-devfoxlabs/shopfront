import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const note = readFileSync(
  new URL('../../DESIGN.md', import.meta.url),
  'utf8',
);
// A name such as `payments.Card`: a part of the store, and a name in it.
const names = [...new Set(note.match(/`[a-z]+\.\w+`/g))].sort();

function defined(name: string, source: string): boolean {
  const line = new RegExp(
    `^(export )?(abstract )?(class|function|const|type|interface) ${name}\\b`,
    'm',
  );
  return line.test(source);
}

test('the design note names parts of the store', () => {
  assert.ok(names.length > 0);
});

for (const chip of names) {
  // The pattern above matched one dot, so split answers two pieces.
  const [part, name] = chip.slice(1, -1).split('.') as [string, string];
  test(`${part}.${name} in the design note is defined in its part`, () => {
    const file = new URL(`../src/${part}.ts`, import.meta.url);
    const source = readFileSync(file, 'utf8');
    assert.ok(defined(name, source), `${part}.${name} is not in ${part}.ts`);
  });
}
