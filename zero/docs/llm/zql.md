# ZQL: The Zero Query Language

This document provides a technical guide to ZQL (Zero Query Language), intended for Language Models (LLMs) and Software Engineering (SWE) agents.

## 1. Introduction to ZQL

*   ZQL is a builder-pattern query language inspired by SQL, with a syntax similar to libraries like Drizzle or Kysely.
*   It is used to define reactive views on the client-side database replica. When you execute a ZQL query in a reactive context (e.g., a React component), the results will automatically update whenever the underlying data changes in the cache.
*   Data returned from ZQL is considered immutable and should not be modified directly.

## 2. Basic Querying

All queries are constructed by chaining clauses.

### 2.1. Starting a Query
All queries begin by selecting a table from the `zero.query` object, which is created based on your Zero Schema.
```typescript
// Selects all rows and columns from the 'issue' table.
const myQuery = z.query.issue;
```

### 2.2. Ordering and Paging
*   **`orderBy(column, 'asc' | 'desc')`**: Sorts the results. You can chain multiple `orderBy` clauses for secondary sorting.
    ```typescript
    z.query.issue.orderBy('priority', 'desc').orderBy('created', 'desc');
    ```
*   **`limit(number)`**: Restricts the number of rows returned.
    ```typescript
    z.query.issue.limit(100);
    ```
*   **`start(row, { inclusive?: boolean })`**: Starts the result set at a specific row object, typically used for pagination. It is exclusive by default.
    ```typescript
    const lastSeenIssue = issues[issues.length - 1];
    z.query.issue.start(lastSeenIssue);
    ```

### 2.3. Selecting a Single Result
*   **`one()`**: Use this clause when you expect zero or one results. It changes the return type of the query from `Row[]` to `Row | undefined`.
    ```typescript
    const issue = await z.query.issue.where('id', '=', 42).one().run();
    ```

## 3. Querying Relationships

You can traverse relationships defined in your Zero Schema using the `related` clause.

*   **`related(relationshipName)`**: Fetches the related data and nests it as an array or object under the `relationshipName` property in the result objects.
    ```typescript
    // Get all issues and their related comments
    z.query.issue.related('comments');
    ```
*   **Refining Relationships:** The `related` clause can accept a second argument—a query function—to filter, sort, or limit the related data.
    ```typescript
    z.query.issue.related(
      'comments',
      q => q.orderBy('modified', 'desc').limit(10)
    );
    ```
*   **Nested Relationships:** You can nest `related` calls to fetch data across multiple levels of relationships.
    ```typescript
    z.query.issue.related('comments', q =>
      q.orderBy('modified', 'desc').limit(10).related('reactions')
    );
    ```

## 4. Filtering with `where`

*   **`where(column, operator, value)`**: Filters the query. The operator is optional and defaults to `=`.
*   **Comparison Operators:**
    *   `=`, `!=`
    *   `<`, `<=`, `>`, `>=`
    *   `LIKE`, `NOT LIKE`, `ILIKE`, `NOT ILIKE`
    *   `IN`, `NOT IN` (the `value` must be an array)
    *   `IS`, `IS NOT` (for `null` comparisons)
*   **Compound Filters:** For complex logic, pass a callback to `where`. This provides `and`, `or`, and `not` helpers.
    ```typescript
    z.query.issue.where(({cmp, and, or}) =>
      or(
        cmp('priority', 'critical'),
        and(cmp('priority', 'medium'), cmp('numVotes', '<=', 100))
      )
    );
    ```
*   **Relationship Filters:**
    *   **`whereExists(relationshipName, queryFn?)`**: Filters for rows where at least one related item exists. The filter on the relationship can be refined with an optional query function.
    ```typescript
    // Find all orgs that have at least one employee in Hawaii
    z.query.organization.whereExists('employees', q => q.where('location', 'Hawaii'));
    ```

## 5. Executing Queries

How you execute a query depends on your use case.

*   **Reactive UI Queries (Recommended):** Use framework-specific bindings like `useQuery` for React. This is the most common method. The hook returns the data and details about the query's state.
    ```typescript
    const [issues, issuesDetail] = useQuery(myQuery);

    if (issuesDetail.type !== 'complete') {
      // Data is still loading from the server or is partial.
    }
    ```
*   **One-Time Queries:** Use the `.run()` method to execute a query once and get a promise for the result. This is useful for imperative logic.
    *   `await myQuery.run()`: Returns data currently available on the client *without* fetching from the server.
    *   `await myQuery.run({ type: 'complete' })`: Ensures the query hits the server and returns the complete result set.
*   **Preloading Data:** Use the `.preload()` method to sync data to the client's cache without the overhead of materializing it into JavaScript objects. This is highly efficient for pre-warming the cache at application startup.
    ```typescript
    z.query.issue.orderBy('created', 'desc').limit(1000).preload();
    ```
