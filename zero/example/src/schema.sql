
-- For transcripts, questions, answers, instructions, prompts, generation
CREATE TABLE doc (
	id CHAR(12) NOT NULL PRIMARY KEY,
	created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	title TEXT,
	body TEXT,
	properties JSONB,
	fk_user CHAR(12)
);

CREATE TABLE task (
	id CHAR(12) NOT NULL PRIMARY KEY,
	created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	dify_workflow_id TEXT NOT NULL,
	fk_user CHAR(12)
);

CREATE TABLE doc_input (
	fk_from_doc CHAR(12) NOT NULL,
	fk_to_doc CHAR(12) NOT NULL,
	fk_task CHAR(12) NOT NULL,
	PRIMARY KEY (fk_from_doc, fk_to_doc)
);

CREATE TABLE doc_rating (
	id CHAR(12) NOT NULL PRIMARY KEY,
	created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	fk_doc CHAR(12) NOT NULL,
	fk_user CHAR(12) NOT NULL,
	rating SMALLINT NOT NULL,
	comment TEXT
);

CREATE TABLE users (
	id CHAR(12) NOT NULL PRIMARY KEY,
	created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
	name TEXT NOT NULL
);

ALTER TABLE doc_input ADD CONSTRAINT doc_input_fk_from_doc FOREIGN KEY (fk_from_doc) REFERENCES doc(id);
ALTER TABLE doc_input ADD CONSTRAINT doc_input_fk_to_doc FOREIGN KEY (fk_to_doc) REFERENCES doc(id);
ALTER TABLE doc_input ADD CONSTRAINT doc_input_fk_task FOREIGN KEY (fk_task) REFERENCES task(id);
ALTER TABLE task ADD CONSTRAINT task_fk_user FOREIGN KEY (fk_user) REFERENCES users(id);
ALTER TABLE doc_rating ADD CONSTRAINT doc_rating_fk_doc FOREIGN KEY (fk_doc) REFERENCES doc(id);
ALTER TABLE doc_rating ADD CONSTRAINT doc_rating_fk_user FOREIGN KEY (fk_user) REFERENCES users(id);
