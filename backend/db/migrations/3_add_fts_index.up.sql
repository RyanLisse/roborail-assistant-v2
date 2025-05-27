-- Add full-text search index for document content
CREATE INDEX "document_chunks_content_fts_idx" ON "document_chunks" USING gin (to_tsvector('english', content));