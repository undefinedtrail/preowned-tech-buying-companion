const { z } = require('zod');
const aiService = require('../services/aiService');
const { searchListingsSemantic } = require('../services/vectorSearchService');
const DocumentAndRun = require('../models/DocumentAndRun');

const comparisonAgentSchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters'),
  budget: z.number().positive('Budget must be positive').optional(),
});

const buyerChatSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  question: z.string().min(3, 'Question must be at least 3 characters'),
});

const semanticSearchSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters'),
  budget: z.number().optional(),
  category: z.enum(['laptops', 'cameras', 'gaming']).optional(),
  brand: z.string().optional(),
  minRamGb: z.number().optional(),
  limit: z.number().optional(),
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
