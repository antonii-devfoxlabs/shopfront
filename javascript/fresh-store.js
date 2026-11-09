// Loaded before every test file (see "test" in package.json), so that
// every test starts with what lives for the whole run made new.
import { beforeEach } from 'node:test';

import * as orders from './src/orders.js';

beforeEach(() => {
  orders.reset();
});
