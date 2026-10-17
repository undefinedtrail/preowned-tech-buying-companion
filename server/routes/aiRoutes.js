const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { optionalAuth, authenticate } = require('../middleware/auth');
const { aiAgentLimiter } = require('../middleware/rateLimiter');

// Comparison Agent - multi-step discovery and inspection
router.post(
  '/comparison-agent',
  optionalAuth,
  aiAgentLimiter,
  aiController.runComparisonAgent
);

// Specification RAG - answers compatibility and upgrade questions
router.post(
  '/buyer-chat',
  optionalAuth,
  aiAgentLimiter,
  aiController.buyerChatRAG
);

// Semantic discovery endpoint
router.post(
  '/semantic-search',
  optionalAuth,
  aiController.semanticSearch
);

// Agent execution traces
router.get(
  '/agent-runs/:traceId',
  optionalAuth,
  aiController.getAgentTrace
);

module.exports = router;
