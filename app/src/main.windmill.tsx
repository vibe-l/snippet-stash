import { Zero } from '@rocicorp/zero';
import { schema } from './lib/zero-schema.js';
import { createMutators } from './lib/mutators.js';
import * as queries from './lib/syncedQueries.js';

const server = 'http://localhost:4848';

const zero = new Zero({
  userID: "anon",
  server,
  schema,
  mutators: createMutators(),
});

window.zero = zero;
window.zeroSyncedQueries = queries;
