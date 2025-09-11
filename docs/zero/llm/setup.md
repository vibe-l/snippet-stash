# Zero Project Setup: A Technical Guide for Agents

This document provides a technical guide to setting up a new Zero project from scratch.

## 1. Dependencies

A typical Zero project with a React frontend requires the following key dependencies in `package.json`:

### Dependencies:
```json
{
  "@rocicorp/zero": "...",
  "react": "...",
  "react-dom": "...",
  "hono": "...",
  "postgres": "...",
  "drizzle-orm": "...",
  "drizzle-zero": "..."
}
```
*   **`@rocicorp/zero`**: The core Zero client library.
*   **`react` / `react-dom`**: For the frontend UI.
*   **`hono`**: A lightweight server framework for the server-side push endpoint.
*   **`postgres`**: A PostgreSQL client for the server-side push endpoint.
*   **`drizzle-orm`**: The recommended ORM for defining the database schema.
*   **`drizzle-zero`**: The utility for generating a Zero schema from a Drizzle schema.

### Dev Dependencies:
```json
{
  "vite": "...",
  "@vitejs/plugin-react": "...",
  "typescript": "...",
  "drizzle-kit": "...",
  "tsx": "..."
}
```
*   **`vite`**: A modern frontend build tool, suitable for developing the UI.
*   **`typescript`**: The language for the entire stack.
*   **`drizzle-kit`**: The CLI for managing Drizzle schemas and migrations.
*   **`tsx`**: A TypeScript runner for executing the server-side push endpoint during development.

## 2. `package.json` Scripts

A Zero application consists of at least three processes that must run concurrently during development. Your `scripts` should reflect this.

1.  **The UI Development Server:** Serves the frontend application (e.g., with Vite).
2.  **The Push Endpoint Server:** Your server that processes custom mutators.
3.  **The Zero Cache Server:** The `zero-cache` service itself.

```json
"scripts": {
  "dev:ui": "vite",
  "dev:server": "tsx app/server/index.ts",
  "dev:zero-cache": "zero-cache",
  "build": "vite build",
  "db:push": "drizzle-kit push"
}
```
*   `dev:ui`: Starts the Vite dev server for the frontend app.
*   `dev:server`: Starts the Hono push endpoint server using `tsx`.
*   `dev:zero-cache`: Starts the Zero Cache service. This requires `zero-cache` to be installed (e.g., via `npm install -g @rocicorp/zero-cli`).
*   `build`: Creates a production build of the frontend application.
*   `db:push`: Pushes Drizzle schema changes to the database.

## 3. Environment Variables

Your project will need an `.env` file to store environment variables. It is best practice to create a `.env.example` file to commit to source control.

```
# .env.example

# The URL for the Zero Cache server that the client will connect to.
VITE_PUBLIC_ZERO_SERVER=http://localhost:4000

# The connection string for your upstream PostgreSQL database.
# This is used by your server-side push endpoint.
ZERO_UPSTREAM_DB=postgresql://user:password@host:port/database
```

## 4. Project Structure

While flexible, a recommended project structure separates the Zero application code into an `app` directory.

```
/
├── app/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── lib/         # Core logic: schema.ts, zero-schema.ts, mutators.ts
│   │   ├── routes/      # Page components
│   │   ├── App.tsx      # Root React component with routing
│   │   └── main.tsx     # Application entry point
│   ├── server/
│   │   └── index.ts     # Server-side push endpoint
│   └── index.html       # HTML entry point for Vite
├── public/              # Static assets
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### `vite.config.ts`

Your Vite configuration should be updated to use the `app` directory as its root.

```typescript
// vite.config.ts
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  root: "app", // Set the project root for Vite
  resolve: {
    alias: {
      // Setup path alias for cleaner imports
      "@": path.resolve(__dirname, "./app/src"),
    },
  },
  build: {
    // Place the build output in a root-level /dist directory
    outDir: "../dist",
  }
})
```
