# Zero and React: A Technical Guide for Agents

This document provides a technical guide to integrating the Zero framework with React.

## 1. Setting up the Provider

Every Zero application must be wrapped in a `ZeroProvider` component. This provider is responsible for managing the Zero client instance and making it available to all child components via hooks.

### Recommended Setup

The recommended approach is to create and manage your own `Zero` client instance and pass it to the provider. This gives you more control and makes the data flow more explicit.

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ZeroProvider } from '@rocicorp/zero/react';
import { Zero } from '@rocicorp/zero/client';
import { schema } from './lib/zero-schema.js';
import { createMutators } from './lib/mutators.js';

// 1. Get the server URL from environment variables
const server = import.meta.env.VITE_PUBLIC_ZERO_SERVER;

// 2. Create the Zero client instance
const zero = new Zero({
  server,
  schema,
  mutators: createMutators(),
});

// 3. Render the provider and pass the instance
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ZeroProvider zero={zero}>
      <App />
    </ZeroProvider>
  </React.StrictMode>,
);
```

## 2. Accessing the Client with `useZero`

Within any component wrapped by the `ZeroProvider`, you can get access to the Zero client instance using the `useZero` hook.

```typescript
import { useZero } from "@rocicorp/zero/react";

const MyComponent = () => {
  const zero = useZero();

  const handleCreate = () => {
    // Use the instance to call a mutator
    zero.mutate.createSnippet({ body: "New snippet", tags: [] });
  };

  // ...
};
```

## 3. Fetching Data with `useQuery`

The `useQuery` hook is the primary way to fetch data and subscribe to changes in a React component.

### 3.1. Basic Usage

1.  Construct a ZQL query.
2.  Pass the query to the `useQuery` hook.
3.  Destructure the returned tuple, which contains the data array and a `resultDetails` object.

```typescript
import { useZero, useQuery } from "@rocicorp/zero/react";

const SnippetList = () => {
  const zero = useZero();

  // 1. Construct the query
  const snippetsQuery = zero.query.snippets.orderBy("updated_at", "desc");

  // 2. Pass the query to the hook
  // 3. Destructure the result
  const [snippets = [], snippetsResult] = useQuery(snippetsQuery);

  // ...
};
```

### 3.2. Handling Loading States

The `useQuery` hook does **not** return a simple `isLoading` boolean. Instead, you must inspect the `resultDetails` object to determine the query's state. This provides more granular control over the UI.

The `resultDetails.type` property can be:
*   **`'unknown'`**: The query has been executed against the local cache, but the server has not yet responded. The data may be partial or incomplete. This is the state you should use to display a loading indicator.
*   **`'complete'`**: The server has responded, and the data array contains the full result set for the query.

**Example:**
```typescript
const [snippets = [], snippetsResult] = useQuery(snippetsQuery);

// Derive a loading state from the result details
const isLoading = snippetsResult.type !== 'complete';

if (isLoading) {
  return <p>Loading...</p>;
}

return (
  <ul>
    {snippets.map(s => <li key={s.id}>{s.body}</li>)}
  </ul>
);
```

### 3.3. Handling "Not Found" States

When querying for a single item that may not exist, you must also check `resultDetails.type` to avoid showing a "Not Found" message while the data is still loading.

```typescript
const [issue, issueResult] = useQuery(
  z.query.issue.where('id', 'some-id').one()
);

// Incorrect: This will show "Not Found" flicker on initial load
// if (!issue) {
//   return <div>Not Found</div>;
// }

// Correct: Only show "Not Found" when the query is complete and the item is still missing
if (!issue && issueResult.type === 'complete') {
  return <div>Not Found</div>;
}

if (!issue) {
  // If the item is missing but the query is not yet complete,
  // render null or a loading indicator.
  return <p>Loading...</p>;
}

return <div>{issue.title}</div>;
```
