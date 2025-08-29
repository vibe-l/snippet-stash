import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ZeroProvider } from '@rocicorp/zero/react';
import { Zero } from '@rocicorp/zero/client';
import { schema } from './lib/zero-schema.js';
import { createMutators } from './lib/mutators.js';

// The server URL will be loaded from environment variables.
const server = import.meta.env.VITE_PUBLIC_ZERO_SERVER;

const zero = new Zero({
  server,
  schema,
  mutators: createMutators(),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ZeroProvider zero={zero}>
      <App />
    </ZeroProvider>
  </React.StrictMode>,
);
