
export interface Snippet {
  id: number;
  body: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  used_at: Date | null;
}
