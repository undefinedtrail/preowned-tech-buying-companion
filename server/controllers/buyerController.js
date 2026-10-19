const { z } = require('zod');
const Shortlist = require('../models/Shortlist');
const Question = require('../models/Question');
const Viewing = require('../models/Viewing');
const Listing = require('../models/Listing');

const createShortlistSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  notes: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  targetBudget: z.number().optional(),
});

const askQuestionSchema = z.object({
  message: z.string().min(3, 'Message must be at least 3 characters').max(2000),
  subject: z.string().optional(),
});

const replyQuestionSchema = z.object({
  message: z.string().min(1, 'Reply message cannot be empty').max(2000),
});

const createViewingSchema = z.object({
  requestedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid ISO date string is required',
  }),
  timeSlot: z.string().min(1, 'Time slot is required (e.g., 14:00 - 15:00)'),
  locationType: z.enum([
    'police_station_safe_zone',
    'public_library_lobby',
    'coffee_shop_public',
    'shopping_mall_center',
  ]).default('police_station_safe_zone'),
  buyerNotes: z.string().max(500).optional(),
});

// POST /api/shortlists - Save listing to buyer shortlist
exports.addToShortlist = async (req, res, next) => {
  try {
    const validatedData = createShortlistSchema.parse(req.body);

    const listing = await Listing.findById(validatedData.listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Shortlist Blocked: Only active listings can be added to your shortlist. Current status: ${listing.status}.`,
      });
    }

    const existing = await Shortlist.findOne({
      buyerId: req.user._id,
      listingId: validatedData.listingId,
    });

    if (existing) {
      existing.notes = validatedData.notes || existing.notes;
      existing.priority = validatedData.priority || existing.priority;
      existing.targetBudget = validatedData.targetBudget || existing.targetBudget;
      await existing.save();
      return res.status(200).json({
        success: true,
        message: 'Shortlist entry updated.',
        shortlist: existing,
      });
    }

    const shortlist = await Shortlist.create({
      buyerId: req.user._id,
      listingId: validatedData.listingId,
      notes: validatedData.notes || '',
      priority: validatedData.priority || 'medium',
      targetBudget: validatedData.targetBudget || listing.price,
    });

    return res.status(201).json({
      success: true,
      message: 'Listing added to your shortlist.',
      shortlist,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/shortlists - Get buyer's saved shortlist
exports.getShortlists = async (req, res, next) => {
  try {
    const shortlists = await Shortlist.find({ buyerId: req.user._id })
      .populate({
        path: 'listingId',
        populate: { path: 'sellerId', select: 'name reputationScore verifiedSalesCount' },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: shortlists.length,
      shortlists,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/shortlists/:id - Remove listing from shortlist
exports.removeFromShortlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Shortlist.findOneAndDelete({
      _id: id,
      buyerId: req.user._id,
    });

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Shortlist entry not found or unauthorized.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Item removed from shortlist.',
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/listings/:id/questions - Ask seller a pre-purchase question
exports.askQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, subject } = askQuestionSchema.parse(req.body);

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Inquiry Blocked: Only active listings can receive inquiries. Current status: ${listing.status}.`,
      });
    }

    if (listing.sellerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot initiate an inquiry on your own listing.',
      });
    }

    let thread = await Question.findOne({
      listingId: listing._id,
      buyerId: req.user._id,
    });

    if (!thread) {
      thread = new Question({
        listingId: listing._id,
        buyerId: req.user._id,
        sellerId: listing.sellerId,
        subject: subject || `Inquiry regarding ${listing.title}`,
        messages: [],
      });
    }

    thread.messages.push({
      senderId: req.user._id,
      senderRole: 'buyer',
      message,
      createdAt: new Date(),
    });
    thread.lastMessageAt = new Date();
    await thread.save();

    return res.status(201).json({
      success: true,
      message: 'Inquiry dispatched to seller. Buyer identity remains private.',
      thread,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/listings/:id/questions - Get inquiry thread for this listing
exports.getListingQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find threads where the current user is either the buyer or the seller
    const query = {
      listingId: id,
      $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }],
    };

    // If staff-assigned moderator, can inspect any thread
    if (req.user.role === 'moderator' && req.user.isStaffAssigned) {
      delete query.$or;
    }

    const threads = await Question.find(query)
      .populate('buyerId', 'name')
      .populate('sellerId', 'name')
      .populate('listingId', 'title price')
      .sort({ lastMessageAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: threads.length,
      threads,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/questions/:threadId/reply - Reply to an inquiry thread
exports.replyQuestion = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const { message } = replyQuestionSchema.parse(req.body);

    const thread = await Question.findById(threadId);
    if (!thread) {
      return res.status(404).json({ success: false, message: 'Inquiry thread not found.' });
    }

    const isBuyer = thread.buyerId.toString() === req.user._id.toString();
    const isSeller = thread.sellerId.toString() === req.user._id.toString();
    const isModerator = req.user.role === 'moderator' && req.user.isStaffAssigned;

    if (!isBuyer && !isSeller && !isModerator) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You are not a participant in this conversation.',
      });
    }

    const listing = await Listing.findById(thread.listingId);
    if (listing && listing.status === 'suspended' && !isModerator) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry Blocked: This listing has been suspended for safety/moderation review.',
      });
    }

    const senderRole = isModerator ? 'moderator' : isSeller ? 'seller' : 'buyer';

    thread.messages.push({
      senderId: req.user._id,
      senderRole,
      message,
      createdAt: new Date(),
    });
    thread.lastMessageAt = new Date();
    await thread.save();

    return res.status(200).json({
      success: true,
      message: 'Reply sent successfully.',
      thread,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/buyer/my-inquiries - Get all inquiries involving current user
exports.getMyInquiries = async (req, res, next) => {
  try {
    const query = {
      $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }],
    };

    // STRICT PRIVACY: Never leak buyer or seller email addresses over in-app messaging
    const threads = await Question.find(query)
      .populate('buyerId', 'name reputationScore')
      .populate('sellerId', 'name reputationScore verifiedSalesCount')
      .populate('listingId', 'title price images status')
      .sort({ lastMessageAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: threads.length,
      threads,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/listings/:id/viewings - Request viewing slot
exports.requestViewing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = createViewingSchema.parse(req.body);

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    // STRICT SECURITY RULE: Only active listings can receive viewing bookings!
    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Viewing Booking Blocked: Only active listings can receive viewing bookings. Current status: ${listing.status}.`,
      });
    }

    if (listing.sellerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot request a viewing on your own listing.',
      });
    }

    const viewing = await Viewing.create({
      listingId: listing._id,
      buyerId: req.user._id,
      sellerId: listing.sellerId,
      requestedDate: new Date(validatedData.requestedDate),
      timeSlot: validatedData.timeSlot,
      locationType: validatedData.locationType,
      buyerNotes: validatedData.buyerNotes || '',
      status: 'requested',
    });

    return res.status(201).json({
      success: true,
      message: 'Viewing request submitted at a designated safe zone.',
      viewing,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/buyer/my-viewings - Get all viewing bookings for current user
exports.getMyViewings = async (req, res, next) => {
  try {
    const query = {
      $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }],
    };

    // STRICT PRIVACY: Never leak buyer or seller email in viewing bookings
    const viewings = await Viewing.find(query)
      .populate('listingId', 'title price images status')
      .populate('buyerId', 'name reputationScore')
      .populate('sellerId', 'name reputationScore verifiedSalesCount')
      .sort({ requestedDate: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: viewings.length,
      viewings,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/viewings/:id/status - Update viewing booking status
exports.updateViewingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, sellerNotes } = req.body;

    const validStatuses = ['confirmed', 'declined', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of [${validStatuses.join(', ')}]`,
      });
    }

    const viewing = await Viewing.findById(id);
    if (!viewing) {
      return res.status(404).json({ success: false, message: 'Viewing record not found.' });
    }

    const isBuyer = viewing.buyerId.toString() === req.user._id.toString();
    const isSeller = viewing.sellerId.toString() === req.user._id.toString();
    const isModerator = req.user.role === 'moderator' && req.user.isStaffAssigned;

    if (!isBuyer && !isSeller && !isModerator) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    // Finalized viewing bookings cannot be transitioned
    if (['cancelled', 'completed', 'declined'].includes(viewing.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition: Viewing is already finalized (${viewing.status}) and cannot be updated.`,
      });
    }

    // Role-specific transition rules
    if (isBuyer && !isSeller && !isModerator) {
      if (status !== 'cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Buyers are only authorized to cancel viewing requests. Confirmations must be made by the seller.',
        });
      }
    }

    if (isSeller && !isModerator) {
      if (!['confirmed', 'declined', 'completed'].includes(status)) {
        return res.status(403).json({
          success: false,
          message: 'Sellers can only confirm, decline, or complete viewing appointments.',
        });
      }
    }

    viewing.status = status;
    if (sellerNotes) viewing.sellerNotes = sellerNotes;
    await viewing.save();

    return res.status(200).json({
      success: true,
      message: `Viewing request status updated to ${status}.`,
      viewing,
    });
  } catch (error) {
    next(error);
  }
};
