-- Drop triggers and functions
DROP TRIGGER IF EXISTS update_conversation_updated_at_trigger ON conversation_messages;
DROP FUNCTION IF EXISTS update_conversation_updated_at();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS conversation_messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS document_chunks;
DROP TABLE IF EXISTS documents;

-- Drop vector extension (comment out if used by other applications)
-- DROP EXTENSION IF EXISTS vector;