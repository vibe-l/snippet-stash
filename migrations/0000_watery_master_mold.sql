CREATE TABLE "search_history" (
	"id" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"selected_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"filter_mode" text NOT NULL,
	"score" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snippets" (
	"id" text PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
