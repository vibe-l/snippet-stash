import { router } from '../trpc';
import { snippetRouter } from './snippets';
import { searchHistoryRouter } from './searchHistory';

export const appRouter = router({
  snippets: snippetRouter,
  searchHistory: searchHistoryRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
