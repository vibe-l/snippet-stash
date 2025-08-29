
CREATE TABLE doc (
	id CHAR(12) NOT NULL PRIMARY KEY,
	title TEXT NOT NULL
);

CREATE TABLE related (
	fk_from_doc CHAR(12) NOT NULL,
	fk_to_doc CHAR(12) NOT NULL,
	PRIMARY KEY (fk_from_doc, fk_to_doc)
);

ALTER TABLE related ADD CONSTRAINT related_fk_from_doc FOREIGN KEY (fk_from_doc) REFERENCES doc(id);
ALTER TABLE related ADD CONSTRAINT related_fk_to_doc FOREIGN KEY (fk_to_doc) REFERENCES doc(id);
