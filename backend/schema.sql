-- PostgreSQL + pgvector are required for semantic retrieval.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS search_records (
  id TEXT PRIMARY KEY,
  record_type TEXT NOT NULL CHECK (record_type IN ('part', 'bom', 'document', 'classification', 'change', 'workflow')),
  title TEXT NOT NULL,
  record_url TEXT NOT NULL,
  revision TEXT,
  lifecycle_state TEXT,
  source_snippet TEXT NOT NULL,
  keywords TSVECTOR NOT NULL,
  facets JSONB NOT NULL DEFAULT '{}',
  allowed_groups TEXT[] NOT NULL,
  embedding vector(96) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_records_keywords_idx ON search_records USING GIN (keywords);
CREATE INDEX IF NOT EXISTS search_records_embedding_idx ON search_records USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS search_records_group_idx ON search_records USING GIN (allowed_groups);
