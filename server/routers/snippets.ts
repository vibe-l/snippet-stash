import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { storage } from '../storage';
import { insertSnippetSchema } from '@shared/schema';

export const snippetRouter = router({
  getSnippets: publicProcedure.query(async () => {
    return await storage.getSnippets();
  }),
  createSnippet: publicProcedure
    .input(insertSnippetSchema)
    .mutation(async ({ input }) => {
      return await storage.createSnippet(input);
    }),
  updateSnippet: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: insertSnippetSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      return await storage.updateSnippet(input.id, input.data);
    }),
  deleteSnippet: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await storage.deleteSnippet(input.id);
      return { success: true };
    }),
  updateSnippetUsage: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await storage.updateSnippetUsage(input.id);
      return { success: true };
    }),
});
