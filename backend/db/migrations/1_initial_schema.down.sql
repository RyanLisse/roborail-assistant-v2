-- Drop tables in reverse order to handle foreign key constraints
DROP TABLE IF EXISTS "conversation_messages";
DROP TABLE IF EXISTS "document_chunks";
DROP TABLE IF EXISTS "conversations";
DROP TABLE IF EXISTS "documents";