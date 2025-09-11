import { syncedQuery } from '@rocicorp/zero';
import z from "zod";
import { builder } from './zero-schema.ts';

export const mySnippets = syncedQuery(
  'snippets',
  z.tuple([z.number()]),
  (authorID: number) => {
    return builder.snippets.where('author_id', authorID);
  }
);
