import { initTRPC } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  // Create your context based on the request object
  // Will be available as `ctx` in all your resolvers
  // This is just an example, customize it as needed
  return {};
};

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;
