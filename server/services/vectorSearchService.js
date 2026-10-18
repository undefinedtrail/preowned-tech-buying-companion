const Listing = require('../models/Listing');
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

/**
 * Creates a normalized deterministic embedding vector from text.
 * Used for storing embeddings and calculating cosine similarity when
 * running in local test mode, offline environments, or fallback scenarios.
 */
function generateLocalEmbedding(text, dimensions = 64) {
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

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = Number((vector[i] / magnitude).toFixed(6));
    }
  }

  return vector;
}

/**
 * Generates an embedding vector using LangChain OllamaEmbeddings if available,
 * gracefully falling back to deterministic local unit embedding.
 */
async function getEmbedding(text, dimensions = 64) {
  const embedder = getOllamaEmbedder();
  if (embedder) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      const vector = await Promise.race([
        embedder.embedQuery(text),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Embedding timeout')), 800)),
      ]);
      clearTimeout(timeoutId);
      if (Array.isArray(vector) && vector.length > 0) {
        return vector;
      }
    } catch (err) {
      // Gracefully fall back to deterministic unit embedding
    }
  }
  return generateLocalEmbedding(text, dimensions);
}

/**
 * Calculates cosine similarity between two unit vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

/**
 * Semantic product discovery:
 * Combines vector search with STRICT hard budget and specification constraints.
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
  const queryVector = await getEmbedding(query);

  // Auto-detect category from query terms if not explicitly passed
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

  // 1. Strict Filter Definition
  const filter = { status: 'active' };

  // STRICT HARD BUDGET GUARDRAIL: Never return listings over budget
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

  // 2. Attempt MongoDB Atlas Vector Search if enabled/configured
  let candidates = [];
  let isAtlasSearchUsed = false;

  try {
    if (process.env.ATLAS_VECTOR_SEARCH_ENABLED === 'true') {
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
      // Re-verify hard budget strictly in memory as secondary guard
      candidates = rawAtlasCandidates.filter((item) => {
        return !budget || item.price <= Number(budget);
      });
      isAtlasSearchUsed = true;
    }
  } catch (atlasErr) {
    // Graceful fallback to dual-mode local cosine search
    isAtlasSearchUsed = false;
  }

  // 3. Fallback: Dual-Mode In-Memory Cosine Scoring + Exact Match Aggregation
  if (!isAtlasSearchUsed || candidates.length === 0) {
    const rawListings = await Listing.find(filter)
      .select('+embedding')
      .populate('sellerId', 'name reputationScore verifiedSalesCount')
      .lean();

    const scored = rawListings.map((item) => {
      let sim = 0;
      if (item.embedding && item.embedding.length > 0 && item.embedding.length === queryVector.length) {
        sim = cosineSimilarity(queryVector, item.embedding);
      } else {
        // Fallback text match score
        const searchableText = `${item.title} ${item.description} ${item.brand} ${item.modelName} ${item.category} ${item.structuredSpecs?.cpu || ''} ${item.structuredSpecs?.ramGb || ''}GB RAM`.toLowerCase();
        const queryTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        let matches = 0;
        queryTerms.forEach((term) => {
          if (searchableText.includes(term)) matches++;
        });
        sim = queryTerms.length > 0 ? matches / queryTerms.length : 0.5;
      }

      // Hard budget check safeguard
      const passesHardBudget = !budget || item.price <= Number(budget);

      return {
        ...item,
        similarityScore: Number(sim.toFixed(4)),
        passesHardBudget,
      };
    });

    // Filter strictly by hard budget and sort by similarity score descending, then price ascending
    candidates = scored
      .filter((item) => item.passesHardBudget)
      .sort((a, b) => b.similarityScore - a.similarityScore || a.price - b.price)
      .slice(0, limit);
  }

  return {
    query,
    appliedHardBudget: budget ? Number(budget) : null,
    totalMatches: candidates.length,
    candidates,
  };
}

module.exports = {
  getEmbedding,
  generateLocalEmbedding,
  cosineSimilarity,
  searchListingsSemantic,
};
