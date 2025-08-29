import { pgTable, char, text, foreignKey, primaryKey } from "drizzle-orm/pg-core"

export const doc = pgTable("doc", {
	id: char({ length: 12 }).primaryKey().notNull(),
	title: text().notNull(),
});

export const related = pgTable("related", {
	fk_from_doc: char({ length: 12 }).notNull(),
	fk_to_doc: char({ length: 12 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.fk_from_doc],
			foreignColumns: [doc.id],
			name: "related_fk_from_doc"
		}),
	foreignKey({
			columns: [table.fk_to_doc],
			foreignColumns: [doc.id],
			name: "related_fk_to_doc"
		}),
	primaryKey({ columns: [table.fk_from_doc, table.fk_to_doc], name: "related_pkey"}),
]);
