import { withValidation, ReadonlyJSONValue } from "@rocicorp/zero";
import { mySnippets } from "../lib/syncedQueries";

// Build a map of queries with validation by name.
const validated = Object.fromEntries(
    [mySnippets].map(
        q => [q.queryName, withValidation(q)])
);

export function getQuery(name: string, args: readonly ReadonlyJSONValue[]) {
  const q = validated[name];
  if (!q) {
    throw new Error(`No such query: ${name}`);
  }
  return {
    // First param is the context for contextful queries.
    // `args` are validated using the `parser` you provided with
    // the query definition.
    query: q(undefined, ...args),
  };
}
