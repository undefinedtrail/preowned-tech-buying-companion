const Listing = require('../models/Listing');
const { escapeRegex, exactCI } = require('../utils/escapeRegex');
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
 * Calculates cosine similarity between two vectors.
 * Properly divides dot product by the Euclidean norms (magnitudes) of both vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;
  return dotProduct / magnitude;
}

// =============================================================================
// REAL PRODUCTION EMBEDDINGS
// =============================================================================

const EMBEDDING_TIMEOUT_MS = parseInt(process.env.EMBEDDING_TIMEOUT_MS, 10) || 15000;

/**
 * Generates an embedding vector using the real LangChain OllamaEmbeddings service.
 * In non-development environments: throws a controlled 503 error if the service is unreachable.
 * Never silently falls back to hash embeddings outside development/test!
 */
async function getRealEmbedding(text) {
  const embedder = getOllamaEmbedder();

  if (embedder) {
    let timeoutId;
    try {
      const vector = await Promise.race([
        embedder.embedQuery(text),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Embedding service timeout')), EMBEDDING_TIMEOUT_MS);
        }),
      ]);
      if (Array.isArray(vector) && vector.length > 0) {
        return vector;
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
        const error = new Error(`Embedding Service Unavailable: Ollama embedding failed (${err.message}).`);
        error.status = 503;
        throw error;
      }
      console.warn(`[Embedding] Real embedding failed (${err.message}), falling back to dev mock.`);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  // Strictly fail outside explicit development or test mode
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    const error = new Error('Embedding Service Unavailable: Ollama nomic-embed-text embedding service is offline.');
    error.status = 503;
    throw error;
  }

  // Isolated test/local mock: strictly for offline development and unit tests
  console.warn('[Embedding] Ollama unreachable - using MOCK hash embeddings. Semantic search results are NOT meaningful.');
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
    // Audio is checked before smartphones to avoid 'headphones'.includes('phone') misclassification
    if (/\b(headphone|headphones|earphone|earphones|earbuds|audio|airpods|wh-1000xm|sound)\b/i.test(qLower)) {
      targetCategory = 'audio';
    } else if (/\b(laptop|laptops|notebook|notebooks|macbook|thinkpad)\b/i.test(qLower)) {
      targetCategory = 'laptops';
    } else if (/\b(camera|cameras|lens|dslr|mirrorless|fujifilm)\b/i.test(qLower) || qLower.includes('sony a7')) {
      targetCategory = 'cameras';
    } else if (/\b(gaming|handheld|ps5|console|switch)\b/i.test(qLower) || qLower.includes('steam deck')) {
      targetCategory = 'gaming';
    } else if (/\b(phone|phones|smartphone|smartphones|iphone|pixel)\b/i.test(qLower) || qLower.includes('galaxy s')) {
      targetCategory = 'smartphones';
    } else if (/\b(tablet|tablets|ipad)\b/i.test(qLower) || qLower.includes('galaxy tab')) {
      targetCategory = 'tablets';
    } else if (/\b(watch|watches|smartwatch|smartwatches)\b/i.test(qLower) || qLower.includes('apple watch') || qLower.includes('galaxy watch')) {
      targetCategory = 'smartwatches';
    }
  }

  // Atlas Vector Search filter (requires exact scalar values, no RegExp)
  const atlasFilter = { status: 'active' };
  if (budget && Number(budget) > 0) {
    atlasFilter.price = { $lte: Number(budget) };
  }
  if (targetCategory) {
    atlasFilter.category = targetCategory;
  }
  if (brand) {
    atlasFilter.brand = String(brand).trim();
  }
  if (minRamGb) {
    atlasFilter['structuredSpecs.ramGb'] = { $gte: Number(minRamGb) };
  }

  // Local MongoDB query filter (supports regex)
  const localFilter = { status: 'active' };
  if (budget && Number(budget) > 0) {
    localFilter.price = { $lte: Number(budget) };
  }
  if (targetCategory) {
    localFilter.category = targetCategory;
  }
  if (brand) {
    localFilter.brand = exactCI(brand);
  }
  if (minRamGb) {
    localFilter['structuredSpecs.ramGb'] = { $gte: Number(minRamGb) };
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
            filter: atlasFilter,
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
      const candidates = rawAtlasCandidates
        .filter((item) => {
          return !budget || item.price <= Number(budget);
        })
        .slice(0, limit);

      return {
        query,
        appliedHardBudget: budget ? Number(budget) : null,
        totalMatches: candidates.length,
        candidates,
      };
    } catch (atlasErr) {
      if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
        const error = new Error(`Atlas Vector Search failed: ${atlasErr.message}`);
        error.status = 503;
        throw error;
      }
      console.warn(`[Atlas Vector Search] Error in dev/test, falling back to local: ${atlasErr.message}`);
    }
  }

  // 2. Isolated Test/Local Mock Vector Search (strictly for dev and tests when Atlas is not configured)
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_VECTOR_MOCK === 'true';
  if (isDevOrTest) {
    const rawListings = await Listing.find(localFilter)
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

  // Outside development/test if Atlas Vector Search is disabled/unavailable, fail explicitly
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

  const atlasFilter = {};
  if (brand) atlasFilter.brand = String(brand).trim();
  if (modelName) atlasFilter.modelName = String(modelName).trim();

  const brandRegex = brand ? exactCI(brand) : null;
  const modelRegex = modelName ? exactCI(modelName) : null;

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
            filter: atlasFilter,
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
      if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
        const error = new Error(`Atlas Vector Search on specification chunks failed: ${err.message}`);
        error.status = 503;
        throw error;
      }
      console.warn(`[Specification Vector Search] Error in dev/test, falling back to local: ${err.message}`);
    }
  }

  // Outside development/test if Atlas Vector Search is disabled/unavailable, fail explicitly
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_VECTOR_MOCK === 'true';
  if (!isDevOrTest) {
    const error = new Error('Production Vector Search Error: MongoDB Atlas Vector Search on specification chunks is not configured.');
    error.status = 503;
    throw error;
  }

  // 2. Isolated Test/Local Vector Cosine Scoring on Document Chunks (for dev and tests when Atlas is not configured)
  const localChunkFilter = {};
  if (brandRegex) localChunkFilter.brand = brandRegex;
  if (modelRegex) localChunkFilter.modelName = modelRegex;

  const storedChunks = await SpecificationChunk.find(localChunkFilter)
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
