-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "template" (
	"id" char(12) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc" (
	"id" char(12) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text,
	"body" text,
	"properties" jsonb,
	"fk_template" char(12),
	"fk_user" char(12)
);
--> statement-breakpoint
CREATE TABLE "doc_rating" (
	"id" char(12) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fk_doc" char(12) NOT NULL,
	"fk_user" char(12) NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" char(12) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_to_doc" (
	"fk_from_doc" char(12) NOT NULL,
	"fk_to_doc" char(12) NOT NULL,
	CONSTRAINT "doc_to_doc_pk" PRIMARY KEY("fk_from_doc","fk_to_doc")
);
--> statement-breakpoint
ALTER TABLE "doc_rating" ADD CONSTRAINT "doc_rating_fk_doc" FOREIGN KEY ("fk_doc") REFERENCES "public"."doc"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_rating" ADD CONSTRAINT "doc_rating_fk_user" FOREIGN KEY ("fk_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_to_doc" ADD CONSTRAINT "doc_to_doc_fk_from_doc" FOREIGN KEY ("fk_from_doc") REFERENCES "public"."doc"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_to_doc" ADD CONSTRAINT "doc_to_doc_fk_to_doc" FOREIGN KEY ("fk_to_doc") REFERENCES "public"."doc"("id") ON DELETE no action ON UPDATE no action;
*/