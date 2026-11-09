// Loaded before every test file (see "test" in package.json), so that
// every test starts with what lives for the whole run made new.
import { beforeEach } from 'node:test';

import * as orders from './src/orders.js';
import * as payments from './src/payments.js';

beforeEach(() => {
  orders.reset();
  payments.reset();
});
