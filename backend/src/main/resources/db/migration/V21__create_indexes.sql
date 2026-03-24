-- V21: HNSW vector indexes for AI similarity search

-- Job embedding index (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_jobs_embedding
    ON jobs USING hnsw (embedding vector_cosine_ops);

-- Resume embedding index (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_resumes_embedding
    ON resumes USING hnsw (embedding vector_cosine_ops);
