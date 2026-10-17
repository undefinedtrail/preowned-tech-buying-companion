const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/queue', authenticate, requireRole(['moderator']), moderationController.getModerationQueue);
router.post('/listings/:id/moderation', authenticate, requireRole(['moderator']), moderationController.takeModerationAction);
router.get('/listings/:id/history', authenticate, requireRole(['moderator']), moderationController.getModerationHistory);

module.exports = router;
