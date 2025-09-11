# Zero Authentication: A Technical Guide for Agents

This document provides a technical guide to handling authentication in the Zero framework.

## 1. Core Concepts

*   **Stateless Authentication:** Zero itself is unopinionated about how you authenticate users. You can use any authentication method you prefer (e.g., JWTs, sessions).
*   **Token Propagation:** The core idea is to pass an authentication token from your application to the `Zero` client. This token is then automatically sent with every request to the `zero-cache` and, subsequently, to your server-side push endpoint.
*   **Server-Side Enforcement:** Your server-side push endpoint is responsible for validating the token and using its payload (e.g., user ID) to enforce write permissions within your custom mutators. Read permissions are handled separately in the Zero Schema definition.

## 2. Client-Side Implementation

### 2.1. Passing the Auth Token to Zero

When you instantiate the `Zero` client, pass the user's authentication token to the `auth` property in the constructor.

```typescript
// src/main.tsx
import { Zero } from '@rocicorp/zero';

// Assume getAuthToken() retrieves the JWT from localStorage, a cookie, etc.
const authToken = getAuthToken();

const zero = new Zero({
  server: import.meta.env.VITE_PUBLIC_ZERO_SERVER,
  schema,
  mutators: createMutators(),
  auth: authToken, // Pass the token here
});
```

### 2.2. Handling Token Refresh

If the `zero-cache` or your push endpoint determines that the token is invalid or expired (typically by returning an HTTP 401 or 403 status), the `Zero` client will automatically try to refresh it.

It does this by looking for an `onAuthUpdate` function that you can provide in the `Zero` constructor. This function should contain your application's logic for obtaining a new token.

```typescript
const zero = new Zero({
  // ...
  auth: getAuthToken(),
  onAuthUpdate: async () => {
    // 1. Call your API to get a new token
    const newToken = await refreshToken();
    // 2. Store the new token
    saveAuthToken(newToken);
    // 3. Return the new token to Zero
    return newToken;
  },
});
```

### 2.3. Data Cleanup on Logout

When a user logs out, you must clear all of Zero's local data from the browser to ensure no sensitive information remains. Zero provides a utility function for this.

```typescript
import { dropAllDatabases } from '@rocicorp/zero';

const handleLogout = async () => {
  // Clear all local IndexedDB databases used by Zero
  await dropAllDatabases();
  // Redirect to login page
  window.location.href = '/login';
};
```

## 3. Server-Side Implementation

### 3.1. Validating the Token

Your server-side push endpoint must validate the auth token sent with each request. The token is passed in the `Authorization` header as a Bearer token.

```typescript
// src/server/index.ts
app.post('/push', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];

    // Throws an error if token is invalid
    const decodedJWT = await validateToken(token);

    const mutators = createServerMutators(decodedJWT); // Pass decoded token to mutators
    const result = await processor.process(mutators, c.req.raw);
    return c.json(result);

  } catch (error) {
    // If auth fails, return a 401 Unauthorized
    return c.json({ error: 'Unauthorized' }, 401);
  }
});
```

### 3.2. Using Auth Data in Mutators

Your `createMutators` function should be designed to accept the decoded authentication payload (`authData`). This allows your mutators to perform fine-grained permission checks.

**1. Update the `createMutators` signature:**

```typescript
// src/lib/mutators.ts

// Define the shape of your decoded token payload
type AuthData = {
  sub: string; // User ID
  // ... other properties
};

export function createMutators(authData: AuthData | undefined) {
  return {
    deleteSnippet: async (tx: Transaction, { id }: { id: number }) => {
      // 1. Check if user is authenticated
      if (!authData) {
        throw new Error("Not authorized");
      }

      // 2. Check if user owns the resource
      const snippet = await tx.query.snippets.where('id', id).one();
      if (snippet.userId !== authData.sub) {
        throw new Error("Permission denied: You do not own this snippet.");
      }

      // 3. Proceed with the mutation
      await tx.mutate.snippets.delete({ id });
    },
    // ... other mutators
  };
}
```

By throwing an error within a mutator, you prevent the write operation from occurring and propagate the error message back to the calling client.
