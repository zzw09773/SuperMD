import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// Initialize pgvector extension and create tables
export const initializePgVector = async () => {
  const client = await pool.connect();
  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create documents table for RAG
    await client.query(`
      CREATE TABLE IF NOT EXISTS rag_documents (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create embeddings table with vector column
    await client.query(`
      CREATE TABLE IF NOT EXISTS rag_embeddings (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES rag_documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding vector(1536),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for vector similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS rag_embeddings_embedding_idx
      ON rag_embeddings USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);

    // Conversation memory tables for agent workflows
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_memory_entries (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER NOT NULL DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS agent_memory_entries_user_mode_idx
      ON agent_memory_entries (user_id, mode, created_at)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_memory_summaries (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, mode)
      )
    `);

    console.log('✅ PgVector initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize PgVector:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
