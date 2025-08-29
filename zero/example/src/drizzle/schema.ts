import { pgTable, char, timestamp, text, jsonb, foreignKey, smallint, primaryKey } from "drizzle-orm/pg-core"

export const template = pgTable("template", {
	id: char({ length: 12 }).primaryKey().notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	body: text().notNull(),
});

export const doc = pgTable("doc", {
	id: char({ length: 12 }).primaryKey().notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	title: text(),
	body: text(),
	properties: jsonb(),
	fk_template: char({ length: 12 }),
	fk_user: char({ length: 12 }),
});

export const doc_rating = pgTable("doc_rating", {
	id: char({ length: 12 }).primaryKey().notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	fk_doc: char({ length: 12 }).notNull(),
	fk_user: char({ length: 12 }).notNull(),
	rating: smallint().notNull(),
	comment: text(),
}, (table) => [
	foreignKey({
			columns: [table.fk_doc],
			foreignColumns: [doc.id],
			name: "doc_rating_fk_doc"
		}),
	foreignKey({
			columns: [table.fk_user],
			foreignColumns: [users.id],
			name: "doc_rating_fk_user"
		}),
]);

export const users = pgTable("users", {
	id: char({ length: 12 }).primaryKey().notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text().notNull(),
});

export const doc_to_doc = pgTable("doc_to_doc", {
	fk_from_doc: char({ length: 12 }).notNull(),
	fk_to_doc: char({ length: 12 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.fk_from_doc],
			foreignColumns: [doc.id],
			name: "doc_to_doc_fk_from_doc"
		}),
	foreignKey({
			columns: [table.fk_to_doc],
			foreignColumns: [doc.id],
			name: "doc_to_doc_fk_to_doc"
		}),
	primaryKey({ columns: [table.fk_from_doc, table.fk_to_doc], name: "doc_to_doc_pk"}),
]);
