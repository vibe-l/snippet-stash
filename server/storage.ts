import { 
  users, 
  snippets, 
  searchHistory,
  type User, 
  type InsertUser,
  type Snippet,
  type InsertSnippet,
  type SearchHistory,
  type InsertSearchHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Snippet methods
  getSnippets(): Promise<Snippet[]>;
  getSnippet(id: number): Promise<Snippet | undefined>;
  createSnippet(snippet: InsertSnippet): Promise<Snippet>;
  updateSnippet(id: number, snippet: Partial<InsertSnippet>): Promise<Snippet>;
  deleteSnippet(id: number): Promise<void>;
  updateSnippetUsage(id: number): Promise<void>;
  
  // Search history methods
  getSearchHistory(): Promise<SearchHistory[]>;
  addSearchHistory(search: InsertSearchHistory): Promise<SearchHistory>;
  updateSearchHistoryScore(id: number, score: number): Promise<void>;
  deleteSearchHistory(id: number): Promise<void>;
  clearSearchHistory(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Snippet methods
  async getSnippets(): Promise<Snippet[]> {
    return db.select().from(snippets).orderBy(desc(snippets.updated_at));
  }

  async getSnippet(id: number): Promise<Snippet | undefined> {
    const [snippet] = await db.select().from(snippets).where(eq(snippets.id, id));
    return snippet || undefined;
  }

  async createSnippet(snippet: InsertSnippet): Promise<Snippet> {
    const [newSnippet] = await db
      .insert(snippets)
      .values(snippet)
      .returning();
    return newSnippet;
  }

  async updateSnippet(id: number, snippet: Partial<InsertSnippet>): Promise<Snippet> {
    const [updatedSnippet] = await db
      .update(snippets)
      .set({ ...snippet, updated_at: sql`NOW()` })
      .where(eq(snippets.id, id))
      .returning();
    return updatedSnippet;
  }

  async deleteSnippet(id: number): Promise<void> {
    await db.delete(snippets).where(eq(snippets.id, id));
  }

  async updateSnippetUsage(id: number): Promise<void> {
    await db
      .update(snippets)
      .set({ used_at: sql`NOW()` })
      .where(eq(snippets.id, id));
  }

  // Search history methods
  async getSearchHistory(): Promise<SearchHistory[]> {
    return db.select().from(searchHistory).orderBy(desc(searchHistory.score));
  }

  async addSearchHistory(search: InsertSearchHistory): Promise<SearchHistory> {
    // Check if an identical search already exists
    const existingSearch = await db
      .select()
      .from(searchHistory)
      .where(
        and(
          eq(searchHistory.query, search.query),
          sql`${searchHistory.selected_tags} = ${JSON.stringify(search.selected_tags)}::text[]`,
          eq(searchHistory.filter_mode, search.filter_mode)
        )
      )
      .limit(1);

    if (existingSearch.length > 0) {
      // Update existing entry: increment score and update last_used_at
      const [updatedSearch] = await db
        .update(searchHistory)
        .set({
          score: existingSearch[0].score + search.score,
          last_used_at: sql`NOW()`
        })
        .where(eq(searchHistory.id, existingSearch[0].id))
        .returning();
      return updatedSearch;
    } else {
      // Create new entry if no duplicate exists
      const [newSearch] = await db
        .insert(searchHistory)
        .values(search)
        .returning();
      return newSearch;
    }
  }

  async updateSearchHistoryScore(id: number, score: number): Promise<void> {
    await db
      .update(searchHistory)
      .set({ 
        score, 
        last_used_at: sql`NOW()` 
      })
      .where(eq(searchHistory.id, id));
  }

  async deleteSearchHistory(id: number): Promise<void> {
    await db.delete(searchHistory).where(eq(searchHistory.id, id));
  }

  async clearSearchHistory(): Promise<void> {
    await db.delete(searchHistory);
  }
}

export const storage = new DatabaseStorage();
