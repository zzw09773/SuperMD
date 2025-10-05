import { chunkText, indexDocument } from './ragService';
import { OpenAIEmbeddings } from '@langchain/openai';
import pool from '../lib/pgvector';
import dotenv from 'dotenv';

dotenv.config();

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small',
});

interface BatchJob {
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  content: string;
  metadata: Record<string, any>;
}

/**
 * Process large document in batches to avoid memory issues
 * Splits embedding generation into batches of 50 chunks at a time
 */
export const processBatchIndex = async (job: BatchJob): Promise<number> => {
  const { userId, fileName, fileType, fileSize, content, metadata } = job;

  const BATCH_SIZE = 50; // Process 50 chunks at a time
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert document first
    const docResult = await client.query(
      `INSERT INTO rag_documents (user_id, file_name, file_type, file_size, content, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, fileName, fileType, fileSize, content, JSON.stringify(metadata)]
    );

    const documentId = docResult.rows[0].id;
    console.log(`📄 Document created (ID: ${documentId}), starting batch processing...`);

    // Chunk the text
    const chunks = await chunkText(content);
    const totalChunks = chunks.length;
    console.log(`📄 Document chunked into ${totalChunks} pieces`);

    // Process chunks in batches
    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, totalChunks);
      const batchChunks = chunks.slice(i, batchEnd);

      console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalChunks / BATCH_SIZE)} (chunks ${i + 1}-${batchEnd})`);

      // Generate embeddings for this batch
      const batchEmbeddings = await embeddings.embedDocuments(batchChunks);

      // Insert embeddings for this batch
      for (let j = 0; j < batchChunks.length; j++) {
        const chunkIndex = i + j;
        await client.query(
          `INSERT INTO rag_embeddings (document_id, content, embedding, metadata)
           VALUES ($1, $2, $3, $4)`,
          [
            documentId,
            batchChunks[j],
            JSON.stringify(batchEmbeddings[j]),
            JSON.stringify({ chunkIndex, totalChunks }),
          ]
        );
      }

      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} completed (${batchEnd}/${totalChunks} chunks processed)`);

      // Small delay to avoid rate limiting
      if (batchEnd < totalChunks) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Document ${documentId} fully indexed with ${totalChunks} embeddings`);

    return documentId;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Batch processing failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Determine if a document should use batch processing
 * Files > 100KB or > 100 chunks should use batch processing
 */
export const shouldUseBatchProcessing = async (
  content: string,
  fileSize: number
): Promise<boolean> => {
  // Use batch processing for files > 100KB
  if (fileSize > 100 * 1024) {
    return true;
  }

  // Or if the content will create many chunks
  const estimatedChunks = Math.ceil(content.length / 1000); // Rough estimate
  if (estimatedChunks > 100) {
    return true;
  }

  return false;
};

/**
 * Smart document indexer that chooses between normal and batch processing
 */
export const smartIndexDocument = async (
  userId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  content: string,
  metadata: Record<string, any> = {}
): Promise<number> => {
  const useBatch = await shouldUseBatchProcessing(content, fileSize);

  if (useBatch) {
    console.log(`📦 Using batch processing for large file: ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`);
    return processBatchIndex({
      userId,
      fileName,
      fileType,
      fileSize,
      content,
      metadata,
    });
  } else {
    console.log(`⚡ Using standard processing for file: ${fileName}`);
    return indexDocument(userId, fileName, fileType, fileSize, content, metadata);
  }
};
