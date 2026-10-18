const Listing = require('../models/Listing');
const SpecificationChunk = require('../models/SpecificationChunk');
const { OllamaEmbeddings } = require('@langchain/ollama');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

let ollamaEmbedderInstance = null;

/**
 * Returns or initializes the LangChain OllamaEmbeddings client
 */
function getOllamaEmbedder() {
  if (!ollamaEmbedderInstance) {
    try {
      ollamaEmbedderInstance = new OllamaEmbeddings({
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_EMBED_MODEL,
      });
    } catch (e) {
      ollamaEmbedderInstance = null;
    }
  }
  return ollamaEmbedderInstance;
}

// =============================================================================
// ISOLATED TEST/LOCAL MOCK (Unit Testing / Offline CI Boundary Only)
// =============================================================================

/**
 * ISOLATED TEST-ONLY MOCK: Generates deterministic normalized unit vectors
 * strictly during automated unit tests when an external embedding model is absent.
 * NEVER used in production.
 */
function generateTestMockEmbedding(text, dimensions = 64) {
  const normalized = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);
  const vector = new Array(dimensions).fill(0);

  words.forEach((word) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % dimensions;
    vector[index] += 1;
  });

  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = Number((vector[i] / magnitude).toFixed(6));
    }
  }

  return vector;
}

/**
 * Calculates cosine similarity between two unit vectors.
 * Strictly vector-based dot product of normalized vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

// =============================================================================
// REAL PRODUCTION EMBEDDINGS
// =============================================================================

/**
 * Generates an embedding vector using the real LangChain OllamaEmbeddings service.
 * In production: throws a controlled 503 error if the service is unreachable.
 * Never silently falls back to hash embeddings in production!
 */
async function getRealEmbedding(text) {
  const embedder = getOllamaEmbedder();

  if (embedder) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const vector = await Promise.race([
        embedder.embedQuery(text),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Embedding service timeout')), 1500)),
      ]);
      clearTimeout(timeoutId);
      if (Array.isArray(vector) && vector.length > 0) {
        return vector;
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        const error = new Error(`Embedding Service Unavailable: Ollama embedding failed (${err.message}).`);
        error.status = 503;
        throw error;
      }
    }
  }

  // In production: strictly fail if real embedding model is offline
  if (process.env.NODE_ENV === 'production') {
    const error = new Error('Embedding Service Unavailable: Ollama nomic-embed-text embedding service is offline.');
    error.status = 503;
    throw error;
  }

  // Isolated test/local mock: strictly for offline development and unit tests
  return generateTestMockEmbedding(text);
}

// Backwards-compatible alias for existing imports
const getEmbedding = getRealEmbedding;

// =============================================================================
// PRODUCTION PRODUCT DISCOVERY (MongoDB Atlas Vector Search)
// =============================================================================

/**
 * Semantic product discovery:
 * Real Ollama query embedding -> MongoDB Atlas $vectorSearch on Listing collection -> Hard budget filtering.
 * CRITICAL RULE: High similarity score CANNOT override the buyer's hard budget limit!
 */
async function searchListingsSemantic({
  query,
  budget,
  category,
  brand,
  minRamGb,
  limit = 5,
}) {
  const queryVector = await getRealEmbedding(query);

  let targetCategory = category;
  if (!targetCategory && query) {
    const qLower = query.toLowerCase();
    if (qLower.includes('laptop') || qLower.includes('notebook') || qLower.includes('macbook') || qLower.includes('thinkpad')) {
      targetCategory = 'laptops';
    } else if (qLower.includes('camera') || qLower.includes('lens') || qLower.includes('dslr') || qLower.includes('mirrorless')) {
      targetCategory = 'cameras';
    } else if (qLower.includes('gaming') || qLower.includes('handheld') || qLower.includes('steam deck') || qLower.includes('console')) {
      targetCategory = 'gaming';
    }
  }

  // Strict deterministic filter criteria
  const filter = { status: 'active' };
  if (budget && Number(budget) > 0) {
    filter.price = { $lte: Number(budget) };
  }
  if (targetCategory) {
    filter.category = targetCategory;
  }
  if (brand) {
    filter.brand = new RegExp(`^${brand}$`, 'i');
  }
  if (minRamGb) {
    filter['structuredSpecs.ramGb'] = { $gte: Number(minRamGb) };
  }

  // 1. Production MongoDB Atlas Vector Search Execution
  if (process.env.ATLAS_VECTOR_SEARCH_ENABLED === 'true') {
    try {
      const atlasPipeline = [
        {
          $vectorSearch: {
            index: 'listing_vector_index',
            path: 'embedding',
            queryVector,
            numCandidates: limit * 10,
            limit: limit * 2,
            filter,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'sellerId',
            foreignField: '_id',
            as: 'seller',
          },
        },
        { $unwind: '$seller' },
        {
          $project: {
            title: 1,
            description: 1,
            category: 1,
            brand: 1,
            modelName: 1,
            price: 1,
            condition: 1,
            structuredSpecs: 1,
            conditionDisclosures: 1,
            status: 1,
            evidenceStatus: 1,
            images: 1,
            createdAt: 1,
            sellerId: {
              _id: '$seller._id',
              name: '$seller.name',
              reputationScore: '$seller.reputationScore',
              verifiedSalesCount: '$seller.verifiedSalesCount',
            },
            similarityScore: { $meta: 'vectorSearchScore' },
            passesHardBudget: { $literal: true },
          },
        },
      ];

      const rawAtlasCandidates = await Listing.aggregate(atlasPipeline);
      const candidates = rawAtlasCandidates.filter((item) => {
        return !budget || item.price <= Number(budget);
      });

      return {
        query,
        appliedHardBudget: budget ? Number(budget) : null,
        totalMatches: candidates.length,
        candidates,
      };
    } catch (atlasErr) {
      if (process.env.NODE_ENV === 'production') {
        const error = new Error(`Atlas Vector Search failed in production: ${atlasErr.message}`);
        error.status = 503;
        throw error;
      }
    }
  }

  // 2. Isolated Test/Local Mock Vector Search (for dev and tests when Atlas is not configured)
  if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_TEST_VECTOR_MOCK === 'true') {
    const rawListings = await Listing.find(filter)
      .select('+embedding')
      .populate('sellerId', 'name reputationScore verifiedSalesCount')
      .lean();

    const scored = rawListings.map((item) => {
      let sim = 0;
      if (item.embedding && item.embedding.length > 0 && item.embedding.length === queryVector.length) {
        sim = cosineSimilarity(queryVector, item.embedding);
      } else {
        sim = 0.5;
      }

      const passesHardBudget = !budget || item.price <= Number(budget);
      return {
        ...item,
        similarityScore: Number(sim.toFixed(4)),
        passesHardBudget,
      };
    });

    const candidates = scored
      .filter((item) => item.passesHardBudget)
      .sort((a, b) => b.similarityScore - a.similarityScore || a.price - b.price)
      .slice(0, limit);

    return {
      query,
      appliedHardBudget: budget ? Number(budget) : null,
      totalMatches: candidates.length,
      candidates,
    };
  }

  // In production if Atlas Vector Search is disabled/unavailable, fail explicitly
  const error = new Error('Production Vector Search Error: MongoDB Atlas Vector Search index is not configured.');
  error.status = 503;
  throw error;
}

// =============================================================================
// PRODUCTION SPECIFICATION RAG VECTOR RETRIEVAL (Atlas Vector Search)
// =============================================================================

/**
 * Retrieves official manufacturer manual chunks via MongoDB Atlas Vector Search.
 * Pipeline: question -> real Ollama embedding -> Atlas $vectorSearch on SpecificationChunk -> top-k chunks.
 */
async function searchSpecificationChunksVector({
  query,
  brand,
  modelName,
  limit = 3,
}) {
  const queryVector = await getRealEmbedding(query);

  const brandRegex = new RegExp(`^${brand}$`, 'i');
  const modelRegex = new RegExp(`^${modelName}$`, 'i');

  // 1. Production Atlas Vector Search on SpecificationChunk
  if (process.env.ATLAS_VECTOR_SEARCH_ENABLED === 'true') {
    try {
      const atlasPipeline = [
        {
          $vectorSearch: {
            index: 'specification_chunk_vector_index',
            path: 'embedding',
            queryVector,
            numCandidates: limit * 10,
            limit,
            filter: {
              brand: brandRegex,
              modelName: modelRegex,
            },
          },
        },
        {
          $project: {
            pageContent: 1,
            brand: 1,
            modelName: 1,
            sourceDoc: 1,
            sectionTitle: 1,
            pageNumber: 1,
            chunkIndex: 1,
            similarityScore: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      const chunks = await SpecificationChunk.aggregate(atlasPipeline);
      if (chunks && chunks.length > 0) {
        return chunks;
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        const error = new Error(`Atlas Vector Search on specification chunks failed: ${err.message}`);
        error.status = 503;
        throw error;
      }
    }
  }

  // In production if Atlas Vector Search is disabled/unavailable, fail explicitly
  if (process.env.NODE_ENV === 'production') {
    const error = new Error('Production Vector Search Error: MongoDB Atlas Vector Search on specification chunks is not configured.');
    error.status = 503;
    throw error;
  }

  // 2. Isolated Test/Local Vector Cosine Scoring on Document Chunks (for dev and tests when Atlas is not configured)
  const storedChunks = await SpecificationChunk.find({
    brand: brandRegex,
    modelName: modelRegex,
  })
    .select('+embedding')
    .lean();

  if (storedChunks.length > 0) {
    const scored = storedChunks.map((chunk) => {
      let sim = 0;
      if (chunk.embedding && chunk.embedding.length === queryVector.length) {
        sim = cosineSimilarity(queryVector, chunk.embedding);
      }
      return {
        ...chunk,
        similarityScore: Number(sim.toFixed(4)),
      };
    });

    return scored
      .filter((chunk) => chunk.similarityScore >= 0.15)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  return [];
}

module.exports = {
  getEmbedding,
  getRealEmbedding,
  generateTestMockEmbedding,
  cosineSimilarity,
  searchListingsSemantic,
  searchSpecificationChunksVector,
};
