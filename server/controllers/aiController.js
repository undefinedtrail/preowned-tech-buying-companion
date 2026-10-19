const { z } = require('zod');
const aiService = require('../services/aiService');
const { searchListingsSemantic } = require('../services/vectorSearchService');
const DocumentAndRun = require('../models/DocumentAndRun');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');
const CATEGORIES = ['laptops', 'cameras', 'smartphones', 'gaming', 'tablets', 'audio', 'smartwatches'];

const comparisonAgentSchema = z.object({
  query: z.string().trim().min(3, 'Query must be at least 3 characters').max(500, 'Query must be at most 500 characters'),
  budget: z.number().positive('Budget must be positive').max(1000000, 'Budget is unrealistically large').optional(),
});

const buyerChatSchema = z.object({
  listingId: objectId,
  question: z.string().trim().min(3, 'Question must be at least 3 characters').max(500, 'Question must be at most 500 characters'),
});

const semanticSearchSchema = z.object({
  query: z.string().trim().min(2, 'Search query must be at least 2 characters').max(300, 'Search query must be at most 300 characters'),
  budget: z.number().positive('Budget must be positive').max(1000000).optional(),
  category: z.enum(CATEGORIES).optional(),
  brand: z.string().trim().min(1).max(100).optional(),
  minRamGb: z.number().int().positive().max(2048).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

// POST /api/comparison-agent - Run the 3-step agent workflow
exports.runComparisonAgent = async (req, res, next) => {
  try {
    const { query, budget } = comparisonAgentSchema.parse(req.body);

    const result = await aiService.runComparisonAgent({
      userQuery: query,
      budget: budget || null,
      userId: req.user ? req.user._id : null,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/buyer-chat - Specification RAG for upgrade & compatibility questions
exports.buyerChatRAG = async (req, res, next) => {
  try {
    const { listingId, question } = buyerChatSchema.parse(req.body);

    const result = await aiService.answerSpecificationQuestion({
      listingId,
      question,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/semantic-search - Semantic product discovery with hard budget filters
exports.semanticSearch = async (req, res, next) => {
  try {
    const { query, budget, category, brand, minRamGb, limit } = semanticSearchSchema.parse(req.body);

    const searchResult = await searchListingsSemantic({
      query,
      budget,
      category,
      brand,
      minRamGb,
      limit: limit || 10,
    });

    return res.status(200).json({
      success: true,
      data: searchResult,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/agent-runs/:traceId - Get stored agent execution trace
exports.getAgentTrace = async (req, res, next) => {
  try {
    const { traceId } = req.params;
    const run = await DocumentAndRun.findOne({ traceId })
      .populate('candidateListingIds', 'title price condition brand modelName')
      .lean();

    if (!run) {
      return res.status(404).json({ success: false, message: 'Agent execution trace not found.' });
    }

    // IDOR Protection: If trace belongs to a user, enforce owner or staff moderator authorization
    if (run.userId) {
      const isOwner = req.user && req.user._id.toString() === run.userId.toString();
      const isModerator = req.user && req.user.role === 'moderator' && req.user.isStaffAssigned;
      if (!isOwner && !isModerator) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You do not have permission to view this execution trace.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      trace: run,
    });
  } catch (error) {
    next(error);
  }
};
