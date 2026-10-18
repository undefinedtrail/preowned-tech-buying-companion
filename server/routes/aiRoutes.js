const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { optionalAuth, authenticate } = require('../middleware/auth');
const { aiAgentLimiter } = require('../middleware/rateLimiter');

// Comparison Agent - multi-step discovery and inspection (Protected Member Feature)
router.post(
  '/comparison-agent',
  authenticate,
  aiAgentLimiter,
  aiController.runComparisonAgent
);

// Specification RAG - answers compatibility and upgrade questions (Protected Member Feature)
router.post(
  '/buyer-chat',
  authenticate,
  aiAgentLimiter,
  aiController.buyerChatRAG
);

// Semantic discovery endpoint (Protected Member Feature)
router.post(
  '/semantic-search',
  authenticate,
  aiController.semanticSearch
);

// Agent execution traces (Protected Member Feature)
router.get(
  '/agent-runs/:traceId',
  authenticate,
  aiController.getAgentTrace
);

module.exports = router;
