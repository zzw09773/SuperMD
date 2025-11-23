import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import pool from '../lib/pgvector';
import { cacheService } from '../lib/redis';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { requireEmbeddingConfig } from '../config/aiConfig';

dotenv.config();

const embeddingConfig = requireEmbeddingConfig('ragService');

const embeddings = new OpenAIEmbeddings({
  modelName: embeddingConfig.modelName,
  configuration: {
    apiKey: embeddingConfig.apiKey,
    baseURL: embeddingConfig.baseURL,
  },
});

/**
 * Chunk text into smaller pieces for embedding
 */
export const chunkText = async (
  text: string,
  chunkSize: number = 800,
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
    await cacheService.deletePattern(`rag:search:${userId}:*`);

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
  return `rag:search:${userId}:${hash}`;
};

/**
 * Search for similar documents using vector similarity (with caching)
 */
export const searchSimilarDocuments = async (
  query: string,
  userId: string,
  limit: number = 3
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

    // 1. Vector Search
    const vectorQuery = `
      SELECT
        e.id,
        e.content,
        e.metadata,
        d.file_name,
        1 - (e.embedding <=> $1::vector) as similarity
       FROM rag_embeddings e
       JOIN rag_documents d ON e.document_id = d.id
       WHERE d.user_id = $2
       ORDER BY e.embedding <=> $1::vector
       LIMIT $3
    `;
    
    const vectorResult = await client.query(vectorQuery, [JSON.stringify(queryEmbedding), userId, limit]);

    // 2. Keyword Search (Basic Full-Text)
    // Note: This is slower without a TSVECTOR index, but functional for smaller datasets.
    // We give keyword matches a fixed high similarity score to boost them if they aren't in vector results.
    const keywordQuery = `
      SELECT
        e.id,
        e.content,
        e.metadata,
        d.file_name,
        0.8 as similarity
       FROM rag_embeddings e
       JOIN rag_documents d ON e.document_id = d.id
       WHERE d.user_id = $2
       AND to_tsvector('english', e.content) @@ plainto_tsquery('english', $1)
       LIMIT $3
    `;

    // Run keyword search only if query has text
    let keywordRows: any[] = [];
    if (query.trim().length > 0) {
        try {
            const keywordResult = await client.query(keywordQuery, [query, userId, limit]);
            keywordRows = keywordResult.rows;
        } catch (err) {
            console.warn('Keyword search failed (likely syntax), falling back to vector only:', err);
        }
    }

    // 3. Merge & Deduplicate (Hybrid)
    const combinedMap = new Map<number, any>();
    
    // Add Vector Results first (priority)
    vectorResult.rows.forEach((row) => combinedMap.set(row.id, row));
    
    // Add Keyword Results if not present
    keywordRows.forEach((row) => {
        if (!combinedMap.has(row.id)) {
            combinedMap.set(row.id, row);
        }
    });

    // Convert to array and sort by similarity
    const mergedRows = Array.from(combinedMap.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    const searchResults = mergedRows.map((row) => ({
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
    await cacheService.deletePattern(`rag:search:${userId}:*`);

    console.log(`✅ Document ${documentId} deleted and cache invalidated`);
  } catch (error) {
    console.error('❌ Failed to delete document:', error);
    throw error;
  } finally {
    client.release();
  }
};
