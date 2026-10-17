const { z } = require('zod');
const Listing = require('../models/Listing');
const Specification = require('../models/Specification');
const PrivateEvidence = require('../models/PrivateEvidence');

const createListingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['laptops', 'cameras', 'gaming']),
  brand: z.string().min(1, 'Brand is required'),
  modelName: z.string().min(1, 'Model name is required'),
  price: z.number().min(1, 'Price must be greater than 0'),
  currency: z.string().default('USD'),
  condition: z.enum(['new', 'open_box', 'excellent', 'good', 'fair']),
  structuredSpecs: z.record(z.any()).default({}),
  conditionDisclosures: z.record(z.any()).default({}),
  images: z.array(z.string()).default([]),
});

const updateListingSchema = createListingSchema.partial().extend({
  status: z.enum(['active', 'suspended', 'sold']).optional(),
});

const submitEvidenceSchema = z.object({
  serialNumber: z.string().min(3, 'Serial number is required'),
  proofOfOwnershipDocUrl: z.string().optional(),
  purchaseReceiptUrl: z.string().optional(),
  batteryReportDocUrl: z.string().optional(),
  diagnosticLogs: z.string().optional(),
});

// GET /api/listings - Browse approved active listings
exports.getListings = async (req, res, next) => {
  try {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      condition,
      minRamGb,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    // RULE: Sold and suspended listings are strictly excluded from public search
    const filter = { status: 'active' };

    if (category) filter.category = category;
    if (brand) filter.brand = new RegExp(`^${brand}$`, 'i');
    if (condition) filter.condition = condition;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (minRamGb) {
      filter['structuredSpecs.ramGb'] = { $gte: Number(minRamGb) };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
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

    const skip = (Number(page) - 1) * Number(limit);

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('sellerId', 'name reputationScore verifiedSalesCount createdAt')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Listing.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: listings.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
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
    const isOwner = req.user && req.user._id.toString() === listing.sellerId._id.toString();
    const isModerator = req.user && req.user.role === 'moderator';

    if (listing.status !== 'active' && !isOwner && !isModerator) {
      return res.status(404).json({
        success: false,
        message: 'This listing is no longer available.',
        listingStatus: listing.status,
      });
    }

    // Fetch official manufacturer specification to support side-by-side 3-way comparison
    const officialSpec = await Specification.findOne({
      brand: new RegExp(`^${listing.brand}$`, 'i'),
      modelName: new RegExp(`^${listing.modelName}$`, 'i'),
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
      listing,
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

    const newListing = new Listing({
      ...validatedData,
      sellerId: req.user._id,
      status: 'active',
      evidenceStatus: 'none',
    });

    await newListing.save();

    return res.status(201).json({
      success: true,
      message: 'Listing published successfully.',
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

    // Merge updates
    Object.assign(listing, validatedData);
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

// GET /api/seller/my-listings - Get all listings for logged in seller
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
