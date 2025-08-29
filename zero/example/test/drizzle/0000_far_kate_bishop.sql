-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "doc" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "related" (
	"fk_from_doc" integer NOT NULL,
	"fk_to_doc" integer NOT NULL,
	CONSTRAINT "related_pkey" PRIMARY KEY("fk_from_doc","fk_to_doc")
);
--> statement-breakpoint
ALTER TABLE "related" ADD CONSTRAINT "related_fk_from_doc" FOREIGN KEY ("fk_from_doc") REFERENCES "public"."doc"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related" ADD CONSTRAINT "related_fk_to_doc" FOREIGN KEY ("fk_to_doc") REFERENCES "public"."doc"("id") ON DELETE no action ON UPDATE no action;
*/