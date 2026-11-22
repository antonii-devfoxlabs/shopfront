import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as services from '../src/services.ts';

test('a service is found by the name it was registered under', () => {
  services.register('clock', "the shop's clock");
  assert.equal(services.get('clock'), "the shop's clock");
});

test('an unknown name is refused', () => {
  assert.throws(() => services.get('no_such_part'), {
    name: 'UnknownServiceError',
    message: 'no_such_part',
  });
});
