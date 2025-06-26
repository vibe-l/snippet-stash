import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { storage } from '../storage';
import { insertSearchHistorySchema } from '@shared/schema';

export const searchHistoryRouter = router({
  getSearchHistory: publicProcedure.query(async () => {
    return await storage.getSearchHistory();
  }),
  addSearchHistory: publicProcedure
    .input(insertSearchHistorySchema)
    .mutation(async ({ input }) => {
      return await storage.addSearchHistory(input);
    }),
  updateSearchHistoryScore: publicProcedure
    .input(
      z.object({
        id: z.number(),
        score: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await storage.updateSearchHistoryScore(input.id, input.score);
      return { success: true };
    }),
  deleteSearchHistory: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await storage.deleteSearchHistory(input.id);
      return { success: true };
    }),
  clearSearchHistory: publicProcedure.mutation(async () => {
    await storage.clearSearchHistory();
    return { success: true };
  }),
});
