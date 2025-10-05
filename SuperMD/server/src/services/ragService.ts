import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import pool from '../lib/pgvector';
import { cacheService } from '../lib/redis';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small',
});

/**
 * Chunk text into smaller pieces for embedding
 */
export const chunkText = async (
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<string[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const chunks = await splitter.splitText(text);
  return chunks;
};

/**
 * Store document and create embeddings (and invalidate cache)
 */
export const indexDocument = async (
  userId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  content: string,
  metadata: Record<string, any> = {}
): Promise<number> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert document
    const docResult = await client.query(
      `INSERT INTO rag_documents (user_id, file_name, file_type, file_size, content, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, fileName, fileType, fileSize, content, JSON.stringify(metadata)]
    );

    const documentId = docResult.rows[0].id;

    // Chunk the text
    const chunks = await chunkText(content);
    console.log(`📄 Document chunked into ${chunks.length} pieces`);

    // Create embeddings for each chunk
    const embeddingVectors = await embeddings.embedDocuments(chunks);
    console.log(`🔢 Created ${embeddingVectors.length} embeddings`);

    // Insert embeddings
    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        `INSERT INTO rag_embeddings (document_id, content, embedding, metadata)
         VALUES ($1, $2, $3, $4)`,
        [
          documentId,
          chunks[i],
          JSON.stringify(embeddingVectors[i]),
          JSON.stringify({ chunkIndex: i, totalChunks: chunks.length }),
        ]
      );
    }

    await client.query('COMMIT');

    // Invalidate all search caches for this user
    await cacheService.deletePattern(`rag:search:*`);

    console.log(`✅ Document indexed successfully (ID: ${documentId}) and cache invalidated`);

    return documentId;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to index document:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Generate cache key for search query
 */
const generateCacheKey = (query: string, userId: string, limit: number): string => {
  const hash = crypto.createHash('md5').update(`${query}:${userId}:${limit}`).digest('hex');
  return `rag:search:${hash}`;
};

/**
 * Search for similar documents using vector similarity (with caching)
 */
export const searchSimilarDocuments = async (
  query: string,
  userId: string,
  limit: number = 5
): Promise<
  Array<{
    content: string;
    similarity: number;
    fileName: string;
    metadata: any;
  }>
> => {
  // Check cache first
  const cacheKey = generateCacheKey(query, userId, limit);
  const cachedResult = await cacheService.get<any[]>(cacheKey);

  if (cachedResult) {
    console.log(`💾 Cache HIT for query: "${query.substring(0, 50)}..."`);
    return cachedResult;
  }

  console.log(`🔍 Cache MISS for query: "${query.substring(0, 50)}..."`);

  const client = await pool.connect();

  try {
    // Create query embedding
    const queryEmbedding = await embeddings.embedQuery(query);

    // Search for similar vectors
    const result = await client.query(
      `SELECT
        e.content,
        e.metadata,
        d.file_name,
        1 - (e.embedding <=> $1::vector) as similarity
       FROM rag_embeddings e
       JOIN rag_documents d ON e.document_id = d.id
       WHERE d.user_id = $2
       ORDER BY e.embedding <=> $1::vector
       LIMIT $3`,
      [JSON.stringify(queryEmbedding), userId, limit]
    );

    const searchResults = result.rows.map((row) => ({
      content: row.content,
      similarity: parseFloat(row.similarity),
      fileName: row.file_name,
      metadata: row.metadata,
    }));

    // Cache the results for 1 hour
    await cacheService.set(cacheKey, searchResults, 3600);

    return searchResults;
  } catch (error) {
    console.error('❌ Failed to search documents:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all documents for a user
 */
export const getUserDocuments = async (
  userId: string
): Promise<
  Array<{
    id: number;
    fileName: string;
    fileType: string;
    fileSize: number;
    createdAt: Date;
    chunkCount: number;
  }>
> => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT
        d.id,
        d.file_name,
        d.file_type,
        d.file_size,
        d.created_at,
        COUNT(e.id) as chunk_count
       FROM rag_documents d
       LEFT JOIN rag_embeddings e ON d.id = e.document_id
       WHERE d.user_id = $1
       GROUP BY d.id
       ORDER BY d.created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      createdAt: row.created_at,
      chunkCount: parseInt(row.chunk_count),
    }));
  } catch (error) {
    console.error('❌ Failed to get user documents:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Delete a document and its embeddings (and invalidate cache)
 */
export const deleteDocument = async (
  documentId: number,
  userId: string
): Promise<void> => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `DELETE FROM rag_documents
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [documentId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Document not found or access denied');
    }

    // Invalidate all search caches for this user
    await cacheService.deletePattern(`rag:search:*`);

    console.log(`✅ Document ${documentId} deleted and cache invalidated`);
  } catch (error) {
    console.error('❌ Failed to delete document:', error);
    throw error;
  } finally {
    client.release();
  }
};
