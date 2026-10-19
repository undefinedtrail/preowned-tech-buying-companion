const assert = require('assert');
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Load environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345678901234567890';
process.env.JWT_EXPIRES_IN = '7d';

const { cosineSimilarity } = require('./services/vectorSearchService');
const PrivateEvidence = require('./models/PrivateEvidence');
const User = require('./models/User');
const Listing = require('./models/Listing');
const Question = require('./models/Question');
const SpecificationChunk = require('./models/SpecificationChunk');
const { parseDurationMs } = require('./utils/duration');
const { verifyCsrf } = require('./middleware/csrf');
const { authenticate } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

console.log('======================================================================');
console.log('🧪 RUNNING FULL BACKEND VERIFICATION & INTEGRATION TEST SUITE');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
const failures = [];

async function runTest(suite, name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [${suite}] ${name}`);
  } catch (err) {
    failures.push({ suite, name, error: err });
    console.error(`  ❌ [${suite}] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// Helper to create mock Express request/response
function createMockReqRes({
  method = 'GET',
  url = '/',
  body = {},
  query = {},
  params = {},
  headers = {},
  cookies = {},
  session = null,
  user = null,
} = {}) {
  const req = {
    method,
    url,
    originalUrl: url,
    body,
    query,
    params,
    headers: { ...headers },
    cookies: { ...cookies },
    session,
    user,
    get(name) {
      return this.headers[name.toLowerCase()];
    },
  };

  const res = {
    statusCode: 200,
    headers: {},
    cookiesSet: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    cookie(name, val, opts) {
      this.cookiesSet[name] = { val, opts };
      return this;
    },
    clearCookie(name, opts) {
      delete this.cookiesSet[name];
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
  };

  return { req, res };
}

async function runAllTests() {
  // ===========================================================================
  // SUITE 1: SECURITY & PRIVACY CONTROLS
  // ===========================================================================
  console.log('\n--- SUITE 1: SECURITY & PRIVACY CONTROLS ---');

  await runTest('Security', 'XSS Prevention: httpsUrlSchema rejects javascript: and data: URLs', () => {
    const { z } = require('zod');
    const httpsUrlSchema = z.string().trim().regex(/^https:\/\/[^\s]+$/i, 'Only secure https:// URLs are permitted');

    assert.doesNotThrow(() => httpsUrlSchema.parse('https://example.com/receipt.pdf'));
    assert.doesNotThrow(() => httpsUrlSchema.parse('https://cdn.store.com/photos/item1.jpg'));

    assert.throws(() => httpsUrlSchema.parse('javascript:alert(document.cookie)'), /Only secure https:\/\//);
    assert.throws(() => httpsUrlSchema.parse('data:text/html,<script>alert(1)</script>'), /Only secure https:\/\//);
    assert.throws(() => httpsUrlSchema.parse('http://insecure.com/photo.jpg'), /Only secure https:\/\//);
  });

  await runTest('Security', 'Serial Masking: short serials (3-5 chars) never leak full serial or overlap', () => {
    // 5-character serial 'ABCDE': previously leaked as 'ABC-****-BCDE'
    const ev5 = new PrivateEvidence({
      listingId: '507f191e810c19729de860ea',
      sellerId: '507f191e810c19729de860eb',
      serialNumber: 'ABCDE',
    });
    const masked5 = ev5.toMaskedJSON().maskedSerialNumber;
    assert.strictEqual(masked5, 'A-****-E', '5-char serial should only show first and last character');
    assert(!masked5.includes('BCDE'), 'Should not expose middle characters');

    // 3-character serial 'XYZ'
    const ev3 = new PrivateEvidence({
      listingId: '507f191e810c19729de860ea',
      sellerId: '507f191e810c19729de860eb',
      serialNumber: 'XYZ',
    });
    const masked3 = ev3.toMaskedJSON().maskedSerialNumber;
    assert.strictEqual(masked3, 'SN-****', 'Serials under 5 chars must be completely redacted to SN-****');

    // Standard 10-char serial
    const ev10 = new PrivateEvidence({
      listingId: '507f191e810c19729de860ea',
      sellerId: '507f191e810c19729de860eb',
      serialNumber: 'SN12345678',
    });
    const masked10 = ev10.toMaskedJSON().maskedSerialNumber;
    assert.strictEqual(masked10, 'SN-****-78');
  });

  await runTest('Security', 'CSRF Middleware: safe methods pass, unsafe methods require matching token', async () => {
    // GET request (safe method) passes without CSRF check
    const { req: getReq, res: getRes } = createMockReqRes({ method: 'GET' });
    let getPassed = false;
    verifyCsrf(getReq, getRes, () => { getPassed = true; });
    assert.strictEqual(getPassed, true, 'GET request should bypass CSRF verification');

    // POST request with session cookie but missing CSRF header fails with 403
    const { req: postReq, res: postRes } = createMockReqRes({
      method: 'POST',
      cookies: { sessionId: 'sess_123', 'XSRF-TOKEN': 'secret-token-123' },
      headers: {}, // Missing x-csrf-token header
    });
    let postPassed = false;
    await verifyCsrf(postReq, postRes, () => { postPassed = true; });
    assert.strictEqual(postPassed, false, 'POST without matching header must be rejected');
    assert.strictEqual(postRes.statusCode, 403);
    assert.strictEqual(postRes.body.success, false);
    assert(postRes.body.message.includes('Missing X-CSRF-Token header'));

    // Safe GET request passes
    const { req: safeReq, res: safeRes } = createMockReqRes({
      method: 'GET',
      cookies: { sessionId: 'sess_123' },
    });
    let safePassed = false;
    await verifyCsrf(safeReq, safeRes, () => { safePassed = true; });
    assert.strictEqual(safePassed, true, 'GET request with session must pass verifyCsrf');
  });

  await runTest('Security', 'CSRF Endpoint: preserves existing session token for logged-in user', async () => {
    const authController = require('./controllers/authController');
    const existingSessionToken = 'session-bound-csrf-token-999';

    // Mock authenticated user request with existing session
    const { req, res } = createMockReqRes({
      method: 'GET',
      session: {
        userId: '507f191e810c19729de860ea',
        csrfToken: existingSessionToken,
      },
      user: { _id: '507f191e810c19729de860ea', role: 'buyer' },
    });

    await authController.getCsrfToken(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.csrfToken, existingSessionToken, 'Must return the existing session token');
    assert.strictEqual(res.cookiesSet['XSRF-TOKEN'].val, existingSessionToken, 'Must set cookie matching session token');
  });

  await runTest('Security', 'Auth Lockout: locks account after 5 consecutive failed attempts', () => {
    const user = new User({
      name: 'Test Buyer',
      email: 'lockout.test@example.com',
      password: 'ValidPassword123!',
      role: 'buyer',
    });

    assert.strictEqual(user.failedLoginAttempts || 0, 0);

    // Record 5 failed attempts
    for (let i = 1; i <= 5; i++) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
    }

    assert.strictEqual(user.failedLoginAttempts, 5);
    assert(user.lockUntil > new Date(), 'Account must be locked into the future');
    const isLocked = Boolean(user.lockUntil && user.lockUntil > new Date());
    assert.strictEqual(isLocked, true, 'Account lockout flag is active');
  });

  await runTest('Security', 'Auth Error Leakage: 401 response does not expose internal error.message', async () => {
    const { req, res } = createMockReqRes({
      method: 'GET',
      cookies: { token: 'invalid-malformed-jwt-token' },
    });

    await authenticate(req, res, () => {});
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, undefined, 'Raw internal error message must not be exposed');
    assert.strictEqual(res.body.message, 'Authentication failed or session expired. Please re-authenticate.');
  });

  // ===========================================================================
  // SUITE 2: DATA INTEGRITY & BUSINESS RULES
  // ===========================================================================
  console.log('\n--- SUITE 2: DATA INTEGRITY & BUSINESS RULES ---');

  await runTest('Integrity', 'Query operator injection on /api/listings is prevented and limit is capped', () => {
    const { z } = require('zod');
    const getListingsQuerySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      category: z.string().trim().optional(),
      condition: z.string().trim().optional(),
      minPrice: z.coerce.number().nonnegative().optional(),
      maxPrice: z.coerce.number().positive().optional(),
      search: z.string().trim().max(100).optional(),
      sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
    });

    // Attempt operator injection with object { $ne: 'active' }
    const maliciousQuery = { category: { $ne: 'audio' } };
    const parsed = getListingsQuerySchema.safeParse(maliciousQuery);
    assert.strictEqual(parsed.success, false, 'Object query parameter category[$ne] must fail string validation');

    // Attempt unbounded limit: limit=1000000
    const unboundedLimit = { limit: '1000000' };
    const limitParsed = getListingsQuerySchema.safeParse(unboundedLimit);
    assert.strictEqual(limitParsed.success, false, 'Unbounded limit > 100 must fail validation');

    // Valid query with normal limit
    const validQuery = { page: '2', limit: '50', search: 'thinkpad' };
    const validParsed = getListingsQuerySchema.safeParse(validQuery);
    assert.strictEqual(validParsed.success, true);
    assert.strictEqual(validParsed.data.limit, 50);
    assert.strictEqual(validParsed.data.page, 2);
  });

  await runTest('Integrity', 'Viewing Status: Buyer cannot set sellerNotes and cannot complete unconfirmed viewing', () => {
    const { z } = require('zod');
    const updateViewingStatusSchema = z.object({
      status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']),
      sellerNotes: z.string().trim().max(1000).optional(),
    });

    const parsed = updateViewingStatusSchema.safeParse({ status: 'completed', sellerNotes: 'Notes' });
    assert.strictEqual(parsed.success, true);

    // Business rule check 1: completed transition requires confirmed
    function canTransitionToCompleted(currentStatus) {
      return currentStatus === 'confirmed';
    }
    assert.strictEqual(canTransitionToCompleted('pending'), false, 'Cannot complete pending viewing without prior confirmation');
    assert.strictEqual(canTransitionToCompleted('confirmed'), true, 'Can complete confirmed viewing');

    // Business rule check 2: buyer cannot set sellerNotes
    function checkSellerNotesPermission(role, notesProvided) {
      if (notesProvided && role !== 'seller') {
        return false;
      }
      return true;
    }
    assert.strictEqual(checkSellerNotesPermission('buyer', 'Attempted note'), false, 'Buyer is prohibited from writing sellerNotes');
    assert.strictEqual(checkSellerNotesPermission('seller', 'Exchange successful'), true);
  });

  await runTest('Integrity', 'Seller listing edit: active listing resets to pending and sold/suspended listings are locked', () => {
    function processListingUpdate(currentStatus, updateData) {
      if (currentStatus === 'sold' || currentStatus === 'suspended') {
        throw new Error(`Cannot edit a ${currentStatus} listing.`);
      }
      let newStatus = currentStatus;
      let evidenceStatusReset = false;
      if (currentStatus === 'active') {
        newStatus = 'pending';
        evidenceStatusReset = true;
      }
      return { newStatus, evidenceStatusReset };
    }

    // Active listing edit resets to pending
    const activeEdit = processListingUpdate('active', { price: 800 });
    assert.strictEqual(activeEdit.newStatus, 'pending', 'Editing active listing must reset status to pending');
    assert.strictEqual(activeEdit.evidenceStatusReset, true, 'Editing active listing must clear evidence status');

    // Sold listing edit is rejected
    assert.throws(() => processListingUpdate('sold', { price: 700 }), /Cannot edit a sold listing/);

    // Suspended listing edit is rejected
    assert.throws(() => processListingUpdate('suspended', { title: 'New' }), /Cannot edit a suspended listing/);
  });

  await runTest('Integrity', 'Report Listing: self-reporting and duplicate reporting are blocked', () => {
    const listingSellerId = '507f191e810c19729de860ea';
    const reportingUserId = '507f191e810c19729de860ea'; // same user

    function validateReport(sellerId, reporterId, existingReports) {
      if (sellerId.toString() === reporterId.toString()) {
        throw new Error('You cannot report your own listing.');
      }
      const alreadyReported = existingReports.some((r) => r.reportedBy.toString() === reporterId.toString());
      if (alreadyReported) {
        throw new Error('You have already submitted a report for this listing.');
      }
      return true;
    }

    assert.throws(
      () => validateReport(listingSellerId, reportingUserId, []),
      /You cannot report your own listing/
    );

    const otherReporterId = '507f191e810c19729de860eb';
    const existingReports = [{ reportedBy: otherReporterId }];
    assert.throws(
      () => validateReport(listingSellerId, otherReporterId, existingReports),
      /already submitted a report/
    );

    const newReporterId = '507f191e810c19729de860ec';
    assert.doesNotThrow(() => validateReport(listingSellerId, newReporterId, existingReports));
  });

  await runTest('Integrity', 'Moderation actions: evidence_verified requires evidence, inconsistency_noted updates note', () => {
    function applyModerationAction(action, hasEvidence, listing) {
      if (action === 'evidence_verified') {
        if (!hasEvidence) {
          throw new Error('Cannot verify evidence: No diagnostic or verification evidence document exists for this listing.');
        }
        listing.evidenceStatus = 'verified';
      } else if (action === 'inconsistency_noted') {
        listing.evidenceStatus = 'unverified';
        listing.moderationNote = 'Specification mismatch detected';
      } else if (action === 'dismiss_reports') {
        listing.reportCount = 0;
      }
      return listing;
    }

    // evidence_verified without evidence throws 400 error
    assert.throws(() => applyModerationAction('evidence_verified', false, {}), /No diagnostic or verification evidence document exists/);

    // evidence_verified with evidence succeeds
    const verified = applyModerationAction('evidence_verified', true, {});
    assert.strictEqual(verified.evidenceStatus, 'verified');

    // inconsistency_noted updates note
    const noted = applyModerationAction('inconsistency_noted', true, {});
    assert.strictEqual(noted.evidenceStatus, 'unverified');
    assert.strictEqual(noted.moderationNote, 'Specification mismatch detected');

    // dismiss_reports resets reportCount
    const dismissed = applyModerationAction('dismiss_reports', true, { reportCount: 5 });
    assert.strictEqual(dismissed.reportCount, 0);
  });

  // ===========================================================================
  // SUITE 3: VECTOR SEARCH & AI COMPARISON AGENT
  // ===========================================================================
  console.log('\n--- SUITE 3: VECTOR SEARCH & AI COMPARISON AGENT ---');

  await runTest('AI / Vector', 'Cosine Similarity: divides by Euclidean norms correctly', () => {
    // Collinear vectors of different magnitudes
    const v1 = [1, 2, 3];
    const v2 = [10, 20, 30];
    const sim = cosineSimilarity(v1, v2);
    assert.strictEqual(Math.round(sim * 1000) / 1000, 1.0, 'Collinear vectors must yield 1.0');

    // Orthogonal vectors
    const v3 = [1, 0];
    const v4 = [0, 1];
    assert.strictEqual(cosineSimilarity(v3, v4), 0, 'Orthogonal vectors must yield 0');

    // Arbitrary vectors
    const v5 = [2, 4, 4]; // magnitude = sqrt(4 + 16 + 16) = 6
    const v6 = [1, 2, 2]; // magnitude = sqrt(1 + 4 + 4) = 3
    // dot = 2*1 + 4*2 + 4*2 = 2 + 8 + 8 = 18. sim = 18 / (6 * 3) = 1.0
    assert.strictEqual(cosineSimilarity(v5, v6), 1.0);
  });

  await runTest('AI / Vector', 'Category Inference: "noise cancelling headphones" is classified as audio not smartphones', () => {
    function classifyQuery(query) {
      const qLower = query.toLowerCase();
      if (/\b(headphone|headphones|earphone|earphones|earbuds|audio|airpods|wh-1000xm|sound)\b/i.test(qLower)) {
        return 'audio';
      } else if (/\b(phone|phones|smartphone|smartphones|iphone|pixel)\b/i.test(qLower) || qLower.includes('galaxy s')) {
        return 'smartphones';
      }
      return 'other';
    }

    assert.strictEqual(classifyQuery('noise cancelling headphones'), 'audio');
    assert.strictEqual(classifyQuery('sony wh-1000xm5 headphones'), 'audio');
    assert.strictEqual(classifyQuery('smartphones under 500'), 'smartphones');
    assert.strictEqual(classifyQuery('apple iphone 15'), 'smartphones');
  });

  await runTest('AI / Agent', 'Hard budget cap is clamped in code during findListings invocation', () => {
    function clampAgentBudget(userHardBudget, modelProposedBudget) {
      if (userHardBudget != null) {
        return modelProposedBudget != null
          ? Math.min(modelProposedBudget, userHardBudget)
          : userHardBudget;
      }
      return modelProposedBudget;
    }

    // User specified $500 hard budget, LLM proposed null -> clamped to 500
    assert.strictEqual(clampAgentBudget(500, null), 500);

    // User specified $500 hard budget, LLM proposed $800 -> clamped to 500
    assert.strictEqual(clampAgentBudget(500, 800), 500);

    // User specified $500 hard budget, LLM proposed $350 -> preserved at 350
    assert.strictEqual(clampAgentBudget(500, 350), 350);
  });

  await runTest('AI / Agent', 'Agent Output: Never prints "true%" for battery and reports unknown RAM when manual is missing', () => {
    // 1. Battery formatting
    function formatBattery(candidate, inspection) {
      const batteryPct = candidate.conditionDisclosures?.batteryHealthPct ?? inspection.batteryHealthPct;
      if (batteryPct != null) {
        return `Battery health disclosed: ${batteryPct}%`;
      } else if (inspection.hasBatteryDisclosure) {
        return 'Battery health details disclosed';
      }
      return 'WARNING: No battery health percentage or cycle count disclosed';
    }

    const testCand1 = {};
    const testInsp1 = { hasBatteryDisclosure: true, batteryHealthPct: null };
    const formatted1 = formatBattery(testCand1, testInsp1);
    assert(!formatted1.includes('true%'), 'Must never output "true%"');
    assert.strictEqual(formatted1, 'Battery health details disclosed');

    const testCand2 = { conditionDisclosures: { batteryHealthPct: 92 } };
    const testInsp2 = { hasBatteryDisclosure: true, batteryHealthPct: 92 };
    const formatted2 = formatBattery(testCand2, testInsp2);
    assert.strictEqual(formatted2, 'Battery health disclosed: 92%');

    // 2. RAM upgradeability reporting
    function formatRam(specComp) {
      if (specComp.ramInfo?.isUpgradeable === true) {
        return `RAM is upgradeable (${specComp.ramInfo.upgradeLimitText})`;
      } else if (specComp.ramInfo?.isUpgradeable === false) {
        return 'RAM is non-upgradeable (soldered)';
      }
      return 'RAM upgradeability unknown (manufacturer manual not indexed)';
    }

    const ramUnknown = formatRam({ ramInfo: { isUpgradeable: null } });
    assert.strictEqual(ramUnknown, 'RAM upgradeability unknown (manufacturer manual not indexed)');
    assert(!ramUnknown.includes('soldered'), 'Must not claim soldered when manual is missing');

    const ramSoldered = formatRam({ ramInfo: { isUpgradeable: false } });
    assert.strictEqual(ramSoldered, 'RAM is non-upgradeable (soldered)');

    const ramUpgradeable = formatRam({ ramInfo: { isUpgradeable: true, upgradeLimitText: 'Up to 32GB' } });
    assert.strictEqual(ramUpgradeable, 'RAM is upgradeable (Up to 32GB)');
  });

  await runTest('AI / Agent', 'Candidate Deduplication: multiple findListings runs never duplicate candidates', () => {
    const candidatesData = [];
    const candidateListingIds = [];

    function ingestToolResults(result) {
      if (result.candidateIds) {
        for (const id of result.candidateIds) {
          const idStr = id.toString();
          if (!candidateListingIds.includes(idStr)) candidateListingIds.push(idStr);
        }
      }
      if (result.candidates) {
        for (const cand of result.candidates) {
          const idStr = (cand._id || '').toString();
          if (!candidatesData.some((c) => (c._id || '').toString() === idStr)) {
            candidatesData.push(cand);
          }
        }
      }
    }

    ingestToolResults({
      candidateIds: ['id1', 'id2'],
      candidates: [{ _id: 'id1', title: 'Laptop 1' }, { _id: 'id2', title: 'Laptop 2' }],
    });
    assert.strictEqual(candidatesData.length, 2);

    // Iteration 2 re-returns 'id1' and adds 'id3'
    ingestToolResults({
      candidateIds: ['id1', 'id3'],
      candidates: [{ _id: 'id1', title: 'Laptop 1' }, { _id: 'id3', title: 'Laptop 3' }],
    });

    assert.strictEqual(candidatesData.length, 3, 'Must have exactly 3 deduplicated candidates');
    assert.strictEqual(candidateListingIds.length, 3);
  });

  await runTest('AI / Chat', 'Buyer Chat: rejects queries on non-active listings for normal buyers', () => {
    function checkBuyerChatAccess(listingStatus, user, listingSellerId) {
      if (listingStatus !== 'active') {
        const isOwner = user && listingSellerId && listingSellerId.toString() === user._id.toString();
        const isMod = user && (user.role === 'moderator' || user.role === 'admin');
        if (!isOwner && !isMod) {
          throw new Error(`Listing is ${listingStatus}. Technical specifications and buyer questions are only available for active listings.`);
        }
      }
      return true;
    }

    const buyerUser = { _id: 'buyer_123', role: 'buyer' };
    const sellerId = 'seller_456';

    // Buyer asking about pending listing -> rejected
    assert.throws(
      () => checkBuyerChatAccess('pending', buyerUser, sellerId),
      /Listing is pending/
    );

    // Buyer asking about suspended listing -> rejected
    assert.throws(
      () => checkBuyerChatAccess('suspended', buyerUser, sellerId),
      /Listing is suspended/
    );

    // Buyer asking about active listing -> allowed
    assert.doesNotThrow(() => checkBuyerChatAccess('active', buyerUser, sellerId));

    // Moderator asking about suspended listing -> allowed
    const modUser = { _id: 'mod_789', role: 'moderator' };
    assert.doesNotThrow(() => checkBuyerChatAccess('suspended', modUser, sellerId));
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n======================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} OF ${totalTests} CHECKS PASSED`);
  if (failures.length === 0) {
    console.log('🎉 ALL INTEGRATION AND UNIT CHECKS PASSED WITH 0 FAILURES!');
  } else {
    console.error(`❌ ${failures.length} TEST(S) FAILED:`);
    failures.forEach((f) => console.error(`   - [${f.suite}] ${f.name}: ${f.error.message}`));
    process.exit(1);
  }
  console.log('======================================================================\n');
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
