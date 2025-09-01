import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const snippets = pgTable("snippets", {
  id: text("id").primaryKey(),
  body: text("body").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  used_at: timestamp("used_at"),
});

export const searchHistory = pgTable("search_history", {
  id: text("id").primaryKey(),
  query: text("query").notNull(),
  selected_tags: jsonb("selected_tags").$type<string[]>().notNull().default([]),
  filter_mode: text("filter_mode").notNull(),
  score: integer("score").notNull().default(1),
  created_at: timestamp("created_at").defaultNow().notNull(),
  last_used_at: timestamp("last_used_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  id: z.number().optional(),
});

export const insertSnippetSchema = createInsertSchema(snippets).omit({
  created_at: true,
  updated_at: true,
  used_at: true,
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).pick({
  query: true,
  selected_tags: true,
  filter_mode: true,
  score: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSnippet = z.infer<typeof insertSnippetSchema>;
export type Snippet = typeof snippets.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;
