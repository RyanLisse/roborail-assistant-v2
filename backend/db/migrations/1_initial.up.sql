-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    chunk_count INTEGER DEFAULT 0,
    
    -- Metadata as JSONB for flexibility
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for documents table
CREATE INDEX documents_user_id_idx ON documents (user_id);
CREATE INDEX documents_status_idx ON documents (status);
CREATE INDEX documents_uploaded_at_idx ON documents (uploaded_at);

-- Document chunks table with vector embeddings
CREATE TABLE document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    
    -- Vector embedding (1024 dimensions for Cohere embed-v4.0)
    embedding vector(1024),
    
    -- Chunk metadata
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    token_count INTEGER NOT NULL,
    
    -- Additional metadata as JSONB
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for document_chunks table
CREATE INDEX chunks_document_id_idx ON document_chunks (document_id);
CREATE INDEX chunks_chunk_index_idx ON document_chunks (chunk_index);

-- Create HNSW index for vector similarity search
CREATE INDEX document_chunks_embedding_idx ON document_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Full-text search index for content
CREATE INDEX document_chunks_content_fts_idx ON document_chunks 
USING gin(to_tsvector('english', content));

-- Conversations table
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for conversations table
CREATE INDEX conversations_user_id_idx ON conversations (user_id);
CREATE INDEX conversations_updated_at_idx ON conversations (updated_at);

-- Conversation messages table
CREATE TABLE conversation_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    
    -- Citations as JSONB array
    citations JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for conversation_messages table
CREATE INDEX messages_conversation_id_idx ON conversation_messages (conversation_id);
CREATE INDEX messages_created_at_idx ON conversation_messages (created_at);

-- Update conversations.updated_at when messages are added
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_updated_at_trigger
    AFTER INSERT ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();