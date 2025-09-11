import { relations } from "drizzle-orm/relations";
import { doc, related } from "./schema.ts";

export const relatedRelations = relations(related, ({one}) => ({
	doc_fk_from_doc: one(doc, {
		fields: [related.fk_from_doc],
		references: [doc.id],
		relationName: "related_fk_from_doc_doc_id"
	}),
	doc_fk_to_doc: one(doc, {
		fields: [related.fk_to_doc],
		references: [doc.id],
		relationName: "related_fk_to_doc_doc_id"
	}),
}));

export const docRelations = relations(doc, ({many}) => ({
	relateds_fk_from_doc: many(related, {
		relationName: "related_fk_from_doc_doc_id"
	}),
	relateds_fk_to_doc: many(related, {
		relationName: "related_fk_to_doc_doc_id"
	}),
}));