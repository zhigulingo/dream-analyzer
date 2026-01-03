-- Migration: Setup RAG (Retrieval-Augmented Generation) for dream analysis
-- This migration enables vector similarity search for knowledge_chunks table
-- Execute this in Supabase SQL Editor

-- Step 1: Create index for vector similarity search (if not exists)
-- Using ivfflat index for efficient cosine similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 2: Create RPC function for knowledge matching using cosine similarity
-- This function returns the most similar knowledge chunks to a query embedding
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(768),
  match_limit int DEFAULT 5,
  min_similarity float DEFAULT 0.6
)
RETURNS TABLE (
  id uuid,
  source text,
  category text,
  title text,
  chunk text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_chunks.id,
    knowledge_chunks.source,
    knowledge_chunks.category,
    knowledge_chunks.title,
    knowledge_chunks.chunk,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  FROM knowledge_chunks
  WHERE 1 - (knowledge_chunks.embedding <=> query_embedding) > min_similarity
  ORDER BY knowledge_chunks.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION match_knowledge(vector, int, float) TO authenticated;
GRANT EXECUTE ON FUNCTION match_knowledge(vector, int, float) TO anon;
GRANT EXECUTE ON FUNCTION match_knowledge(vector, int, float) TO service_role;

-- Step 4: Add comment for documentation
COMMENT ON FUNCTION match_knowledge(vector, int, float) IS 
'Performs vector similarity search on knowledge_chunks table. 
Returns chunks with cosine similarity above min_similarity threshold, 
ordered by similarity (highest first), limited to match_limit results.';

