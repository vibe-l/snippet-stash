import { relations } from "drizzle-orm/relations";
import { doc, doc_rating, users, doc_to_doc } from "./schema.ts";

export const doc_ratingRelations = relations(doc_rating, ({one}) => ({
	doc: one(doc, {
		fields: [doc_rating.fk_doc],
		references: [doc.id]
	}),
	user: one(users, {
		fields: [doc_rating.fk_user],
		references: [users.id]
	}),
}));

export const docRelations = relations(doc, ({many}) => ({
	doc_ratings: many(doc_rating),
	doc_to_docs_fk_from_doc: many(doc_to_doc, {
		relationName: "doc_to_doc_fk_from_doc_doc_id"
	}),
	doc_to_docs_fk_to_doc: many(doc_to_doc, {
		relationName: "doc_to_doc_fk_to_doc_doc_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	doc_ratings: many(doc_rating),
}));

export const doc_to_docRelations = relations(doc_to_doc, ({one}) => ({
	doc_fk_from_doc: one(doc, {
		fields: [doc_to_doc.fk_from_doc],
		references: [doc.id],
		relationName: "doc_to_doc_fk_from_doc_doc_id"
	}),
	doc_fk_to_doc: one(doc, {
		fields: [doc_to_doc.fk_to_doc],
		references: [doc.id],
		relationName: "doc_to_doc_fk_to_doc_doc_id"
	}),
}));
