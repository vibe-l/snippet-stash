
import { Snippet } from "@/types/snippet";

const STORAGE_KEY = "snippets";

export const loadSnippets = (): Snippet[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading snippets from localStorage:", error);
    return [];
  }
};

export const saveSnippets = (snippets: Snippet[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch (error) {
    console.error("Error saving snippets to localStorage:", error);
  }
};

export const createExampleSnippets = (): Snippet[] => {
  const now = new Date().toISOString();
  
  return [
    {
      id: "1",
      body: "console.log('Hello, World!');",
      tags: ["javascript", "debug", "basic"],
      created_at: now,
      updated_at: now,
      used_at: null,
    },
    {
      id: "2",
      body: `import React from 'react';

const Component = () => {
  return <div>Hello React!</div>;
};

export default Component;`,
      tags: ["react", "javascript", "component", "template"],
      created_at: now,
      updated_at: now,
      used_at: null,
    },
    {
      id: "3",
      body: `SELECT * FROM users 
WHERE created_at > '2024-01-01' 
ORDER BY created_at DESC 
LIMIT 10;`,
      tags: ["sql", "database", "query", "users"],
      created_at: now,
      updated_at: now,
      used_at: null,
    },
  ];
};
