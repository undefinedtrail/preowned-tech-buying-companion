const { z } = require('zod');
const { escapeRegex, exactCI } = require('../utils/escapeRegex');
const Listing = require('../models/Listing');
const Specification = require('../models/Specification');
const PrivateEvidence = require('../models/PrivateEvidence');
const ModerationEvent = require('../models/ModerationEvent');
const { getEmbedding } = require('../services/vectorSearchService');

// Restrict URLs to https: protocol to prevent javascript: XSS
const httpsUrlSchema = z.string().url('Must be a valid URL').refine((val) => {
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}, { message: 'URL must use https protocol' });

const createListingSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.enum(['laptops', 'cameras', 'smartphones', 'gaming', 'tablets', 'audio', 'smartwatches']),
  brand: z.string().trim().min(1, 'Brand is required').max(100),
  modelName: z.string().trim().min(1, 'Model name is required').max(150),
  price: z.number().min(1, 'Price must be greater than 0').max(1000000, 'Price is unrealistically large'),
  currency: z.string().length(3, 'Currency must be a 3-letter code').toUpperCase().default('USD'),
  condition: z.enum(['new', 'open_box', 'excellent', 'good', 'fair']),
  structuredSpecs: z.record(z.any()).default({}),
  conditionDisclosures: z.record(z.any()).default({}),
  images: z.array(httpsUrlSchema).max(10, 'At most 10 images').default([]),
});

const updateListingSchema = createListingSchema.partial().extend({
  status: z.enum(['active', 'suspended', 'sold', 'pending']).optional(),
});

const submitEvidenceSchema = z.object({
  serialNumber: z.string().trim().min(3, 'Serial number is required').max(100),
  proofOfOwnershipDocUrl: httpsUrlSchema.optional(),
  purchaseReceiptUrl: httpsUrlSchema.optional(),
  batteryReportDocUrl: httpsUrlSchema.optional(),
  diagnosticLogs: z.string().max(10000).optional(),
});

const getListingsQuerySchema = z.object({
  category: z.enum(['laptops', 'cameras', 'smartphones', 'gaming', 'tablets', 'audio', 'smartwatches']).optional(),
  brand: z.string().trim().max(100).optional(),
  condition: z.enum(['new', 'open_box', 'excellent', 'good', 'fair']).optional(),
  minPrice: z.coerce.number().min(0).max(1000000).optional(),
  maxPrice: z.coerce.number().min(0).max(1000000).optional(),
  minRamGb: z.coerce.number().min(0).max(2048).optional(),
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(['createdAt', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/listings - Browse approved active listings
exports.getListings = async (req, res, next) => {
  try {
    const validatedQuery = getListingsQuerySchema.parse(req.query);
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      condition,
      minRamGb,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
    } = validatedQuery;

    // RULE: Sold and suspended listings are strictly excluded from public search
    const filter = { status: 'active' };

    if (category) filter.category = category;
    if (brand) filter.brand = exactCI(brand);
    if (condition) filter.condition = condition;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    if (minRamGb !== undefined) {
      filter['structuredSpecs.ramGb'] = { $gte: minRamGb };
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { modelName: searchRegex },
      ];
    }

    const sortOptions = {};
    if (sortBy === 'price') {
      sortOptions.price = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    const skip = (page - 1) * limit;

    // Redact moderationNote and reportCount so private moderation data never leaks to visitors
    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .select('-moderationNote -reportCount')
        .populate('sellerId', 'name reputationScore verifiedSalesCount createdAt')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: listings.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      listings,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/listings/:id - View public specifications, disclosures, and seller reputation
exports.getListingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id).populate(
      'sellerId',
      'name email reputationScore verifiedSalesCount createdAt'
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    // Exclude suspended and sold items from non-owners and non-moderators
    const sellerIdStr = listing.sellerId?._id ? listing.sellerId._id.toString() : listing.sellerId?.toString();
    const isOwner = Boolean(req.user && sellerIdStr && req.user._id.toString() === sellerIdStr);
    const isModerator = Boolean(req.user && req.user.role === 'moderator' && req.user.isStaffAssigned);

    if (listing.status !== 'active' && !isOwner && !isModerator) {
      return res.status(404).json({
        success: false,
        message: 'This listing is no longer available.',
        listingStatus: listing.status,
      });
    }

    // STRICT PRIVACY RULE: Seller email and moderation notes must never leak to public buyers
    const listingObj = listing.toObject();
    if (!isOwner && !isModerator && listingObj.sellerId) {
      delete listingObj.sellerId.email;
    }
    if (!isModerator) {
      delete listingObj.moderationNote;
      delete listingObj.reportCount;
    }

    // Fetch official manufacturer specification to support side-by-side 3-way comparison
    const officialSpec = await Specification.findOne({
      brand: exactCI(listing.brand),
      modelName: exactCI(listing.modelName),
    }).lean();

    // Fetch evidence with strict masking
    const rawEvidence = await PrivateEvidence.findOne({ listingId: listing._id });
    let evidenceInfo = null;

    if (rawEvidence) {
      // Full access for owner and moderator; strictly masked for public buyers
      if (isOwner || isModerator) {
        evidenceInfo = {
          id: rawEvidence._id,
          serialNumber: rawEvidence.serialNumber, // Unmasked only for owner/moderator
          proofOfOwnershipDocUrl: rawEvidence.proofOfOwnershipDocUrl,
          purchaseReceiptUrl: rawEvidence.purchaseReceiptUrl,
          batteryReportDocUrl: rawEvidence.batteryReportDocUrl,
          diagnosticLogs: rawEvidence.diagnosticLogs,
          verificationStatus: rawEvidence.verificationStatus,
          moderatorNotes: rawEvidence.moderatorNotes,
          verifiedAt: rawEvidence.verifiedAt,
        };
      } else {
        evidenceInfo = rawEvidence.toMaskedJSON();
      }
    }

    return res.status(200).json({
      success: true,
      listing: listingObj,
      officialSpecification: officialSpec || null,
      evidence: evidenceInfo,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/listings - Create listing (Seller protected)
exports.createListing = async (req, res, next) => {
  try {
    const validatedData = createListingSchema.parse(req.body);

    const textToEmbed = `${validatedData.title} ${validatedData.description} ${validatedData.brand} ${validatedData.modelName} ${validatedData.category}`;
    const embedding = await getEmbedding(textToEmbed);

    const newListing = new Listing({
      ...validatedData,
      sellerId: req.user._id,
      status: 'pending', // New seller listings must start as pending, never active
      evidenceStatus: 'none',
      embedding,
    });

    await newListing.save();

    return res.status(201).json({
      success: true,
      message: 'Listing submitted for review. It will become visible once approved by a moderator.',
      listing: newListing,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/listings/:id - Update listing (Owner seller check)
exports.updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = updateListingSchema.parse(req.body);

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    // STRICT OWNER CHECK: Only the seller who owns the listing can edit or withdraw it
    if (listing.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only edit listings that you own.',
      });
    }

    // Sellers must NOT be able to edit sold or suspended listings
    if (listing.status === 'sold' || listing.status === 'suspended') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit ${listing.status} listings.`,
      });
    }

    // Sellers must NOT be able to set/change listing status to active or suspended, or bypass moderation
    if (req.body.status && ['active', 'suspended', 'pending'].includes(req.body.status)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Sellers cannot set listing status to active or suspended. Moderation approval is required.',
      });
    }

    if (validatedData.status === 'sold') {
      if (listing.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Only active listings can be marked as sold.',
        });
      }
      listing.status = 'sold';
    }
    delete validatedData.status;

    const hasContentChanges = Object.keys(validatedData).length > 0;
    const wasActive = listing.status === 'active';

    // Merge updates
    Object.assign(listing, validatedData);

    // If active listing had content changes, revert to pending for moderator re-review to prevent bait-and-switch
    if (wasActive && hasContentChanges) {
      listing.status = 'pending';
      listing.moderationNote = 'Reverted to pending review following seller edits.';
      await ModerationEvent.create({
        listingId: listing._id,
        moderatorId: null,
        reportedBy: req.user._id,
        action: 'report_filed',
        reason: 'Seller modified listing content; reverted to pending review.',
        previousStatus: 'active',
        newStatus: 'pending',
        notes: 'Automatic moderation trigger: Active listing modified by seller.',
      });
    }

    // Recompute embedding when listing details change
    const textToEmbed = `${listing.title} ${listing.description} ${listing.brand} ${listing.modelName} ${listing.category}`;
    listing.embedding = await getEmbedding(textToEmbed);

    await listing.save();

    return res.status(200).json({
      success: true,
      message: 'Listing updated successfully.',
      listing,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/listings/:id/evidence - Submit private evidence (Seller owner check)
exports.submitEvidence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = submitEvidenceSchema.parse(req.body);

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    if (listing.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only submit evidence for your own listing.',
      });
    }

    let evidence = await PrivateEvidence.findOne({ listingId: listing._id });

    if (evidence) {
      Object.assign(evidence, {
        ...validatedData,
        verificationStatus: 'pending',
      });
      await evidence.save();
    } else {
      evidence = await PrivateEvidence.create({
        listingId: listing._id,
        sellerId: req.user._id,
        ...validatedData,
        verificationStatus: 'pending',
      });
    }

    listing.evidenceStatus = 'pending';
    await listing.save();

    return res.status(200).json({
      success: true,
      message: 'Private evidence submitted successfully for moderator verification.',
      evidence: evidence.toMaskedJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/listings/seller/me - Get all listings for logged in seller
exports.getMyListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ sellerId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    next(error);
  }
};

const reportListingSchema = z.object({
  reason: z.string().trim().min(5, 'Report reason must be at least 5 characters').max(200),
  details: z.string().max(2000).optional(),
});

// POST /api/listings/:id/report - Report suspicious listing or inconsistency
exports.reportListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, details } = reportListingSchema.parse(req.body);

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    // Prevent sellers from reporting their own listing
    if (listing.sellerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report your own listing.',
      });
    }

    // Deduplicate community reports per user to prevent brigading
    const existingReport = await ModerationEvent.findOne({
      listingId: listing._id,
      reportedBy: req.user._id,
      action: 'report_filed',
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this listing.',
      });
    }

    listing.reportCount = (listing.reportCount || 0) + 1;
    // Three reports flag listing evidence ONLY if evidence is not already staff-verified
    if (listing.reportCount >= 3 && listing.status === 'active') {
      if (listing.evidenceStatus !== 'verified') {
        listing.evidenceStatus = 'flagged';
      }
    }
    await listing.save();

    // Log moderation audit event - Community report filed by user (NOT a moderator action)
    await ModerationEvent.create({
      listingId: listing._id,
      moderatorId: null,
      reportedBy: req.user._id,
      action: 'report_filed',
      reason: `Community report: ${reason}`,
      previousStatus: listing.status,
      newStatus: listing.status,
      notes: details || 'Reported by user for review.',
    });

    return res.status(200).json({
      success: true,
      message: 'Listing report submitted successfully. Moderation team has been notified.',
      reportCount: listing.reportCount,
    });
  } catch (error) {
    next(error);
  }
};
