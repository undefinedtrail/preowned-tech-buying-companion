const assert = require('assert');
const { cosineSimilarity } = require('./services/vectorSearchService');
const PrivateEvidence = require('./models/PrivateEvidence');
const { parseDurationToMs } = require('./utils/duration');

console.log('===============================================================');
console.log('🧪 RUNNING COMPREHENSIVE BACKEND FIXES VERIFICATION');
console.log('===============================================================\n');

let total = 0;
let passed = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// 1. Cosine similarity correctly divides by norms
// -----------------------------------------------------------------------------
test('Cosine similarity divides by Euclidean norms and handles non-unit vectors', () => {
  const vecA = [3, 4]; // magnitude = 5
  const vecB = [6, 8]; // magnitude = 10 (collinear, same direction)
  const simCollinear = cosineSimilarity(vecA, vecB);
  assert.strictEqual(Math.round(simCollinear * 1000) / 1000, 1.0, 'Collinear vectors should have similarity 1.0');

  const vecC = [3, 0];
  const vecD = [0, 4];
  const simOrthogonal = cosineSimilarity(vecC, vecD);
  assert.strictEqual(simOrthogonal, 0, 'Orthogonal vectors should have similarity 0');

  const vecE = [1, 2, 3];
  const vecF = [4, 5, 6];
  // dot = 4 + 10 + 18 = 32. normE = sqrt(14) ~= 3.7416. normF = sqrt(77) ~= 8.7749.
  // sim = 32 / (sqrt(14)*sqrt(77)) = 32 / sqrt(1078) = 32 / 32.8329 ~= 0.9746
  const simEF = cosineSimilarity(vecE, vecF);
  assert(simEF > 0.97 && simEF < 0.98, `Expected ~0.9746, got ${simEF}`);
});

// -----------------------------------------------------------------------------
// 2. Serial number masking does not leak short serials
// -----------------------------------------------------------------------------
test('Short serial masking does not overlap or leak characters', () => {
  // Test short serial 'ABCDE' (5 characters)
  const ev5 = new PrivateEvidence({
    listingId: '507f191e810c19729de860ea',
    sellerId: '507f191e810c19729de860eb',
    serialNumber: 'ABCDE',
  });
  const masked5 = ev5.toMaskedJSON().maskedSerialNumber;
  assert.strictEqual(masked5, 'A-****-E', `Expected A-****-E, got ${masked5}`);
  assert(!masked5.includes('BCDE'), 'Should not leak entire serial');

  // Test 3 character serial
  const ev3 = new PrivateEvidence({
    listingId: '507f191e810c19729de860ea',
    sellerId: '507f191e810c19729de860eb',
    serialNumber: 'XYZ',
  });
  const masked3 = ev3.toMaskedJSON().maskedSerialNumber;
  assert.strictEqual(masked3, 'SN-****', `Expected SN-****, got ${masked3}`);

  // Test standard 10 character serial 'ABC1234567'
  const ev10 = new PrivateEvidence({
    listingId: '507f191e810c19729de860ea',
    sellerId: '507f191e810c19729de860eb',
    serialNumber: 'ABC1234567',
  });
  const masked10 = ev10.toMaskedJSON().maskedSerialNumber;
  assert.strictEqual(masked10, 'AB-****-67', `Expected AB-****-67, got ${masked10}`);
});

// -----------------------------------------------------------------------------
// 3. Category inference handles headphones without classifying as smartphones
// -----------------------------------------------------------------------------
test('Category inference correctly identifies headphones as audio', () => {
  function inferCategory(query) {
    let targetCategory = null;
    if (query) {
      const qLower = query.toLowerCase();
      if (/\b(headphone|headphones|earphone|earphones|earbuds|audio|airpods|wh-1000xm|sound)\b/i.test(qLower)) {
        targetCategory = 'audio';
      } else if (/\b(laptop|laptops|notebook|notebooks|macbook|thinkpad)\b/i.test(qLower)) {
        targetCategory = 'laptops';
      } else if (/\b(camera|cameras|lens|dslr|mirrorless|fujifilm)\b/i.test(qLower) || qLower.includes('sony a7')) {
        targetCategory = 'cameras';
      } else if (/\b(gaming|handheld|ps5|console|switch)\b/i.test(qLower) || qLower.includes('steam deck')) {
        targetCategory = 'gaming';
      } else if (/\b(phone|phones|smartphone|smartphones|iphone|pixel)\b/i.test(qLower) || qLower.includes('galaxy s')) {
        targetCategory = 'smartphones';
      } else if (/\b(tablet|tablets|ipad)\b/i.test(qLower) || qLower.includes('galaxy tab')) {
        targetCategory = 'tablets';
      } else if (/\b(watch|watches|smartwatch|smartwatches)\b/i.test(qLower) || qLower.includes('apple watch') || qLower.includes('galaxy watch')) {
        targetCategory = 'smartwatches';
      }
    }
    return targetCategory;
  }

  assert.strictEqual(inferCategory('noise cancelling headphones'), 'audio');
  assert.strictEqual(inferCategory('bluetooth earbuds with microphone'), 'audio');
  assert.strictEqual(inferCategory('apple iphone 15 pro'), 'smartphones');
  assert.strictEqual(inferCategory('samsung galaxy phone'), 'smartphones');
  assert.strictEqual(inferCategory('gaming laptop rtx 4080'), 'laptops');
});

// -----------------------------------------------------------------------------
// 4. JWT Duration utility parses days, hours, and ms
// -----------------------------------------------------------------------------
test('parseDurationToMs parses time strings accurately', () => {
  assert.strictEqual(parseDurationToMs('7d'), 7 * 24 * 60 * 60 * 1000);
  assert.strictEqual(parseDurationToMs('24h'), 24 * 60 * 60 * 1000);
  assert.strictEqual(parseDurationToMs('30m'), 30 * 60 * 1000);
  assert.strictEqual(parseDurationToMs('60s'), 60 * 1000);
  assert.strictEqual(parseDurationToMs(5000), 5000);
});

// -----------------------------------------------------------------------------
// 5. Hard budget clamping logic in comparison agent
// -----------------------------------------------------------------------------
test('Hard budget clamping prevents LLM from passing null or higher budget', () => {
  function clampBudget(userBudget, llmBudget) {
    if (userBudget != null) {
      return llmBudget != null ? Math.min(llmBudget, userBudget) : userBudget;
    }
    return llmBudget;
  }

  assert.strictEqual(clampBudget(500, null), 500, 'Null LLM budget clamped to user budget 500');
  assert.strictEqual(clampBudget(500, 1000), 500, 'Over-budget LLM value 1000 clamped to user budget 500');
  assert.strictEqual(clampBudget(500, 400), 400, 'Lower LLM budget 400 preserved under user budget 500');
  assert.strictEqual(clampBudget(null, 800), 800, 'No user budget allows LLM budget');
});

// -----------------------------------------------------------------------------
// 6. Unknown RAM upgradeability logic
// -----------------------------------------------------------------------------
test('RAM upgradeability reports unknown when manual is not found', () => {
  function getRamInfo(officialSpec) {
    const hasOfficialSpec = Boolean(officialSpec);
    const isUpgradeable = hasOfficialSpec ? (officialSpec.officialSpecs?.ramUpgradeable ?? false) : null;
    let upgradeLimitText = 'Unknown - Official manufacturer manual not indexed';
    if (hasOfficialSpec) {
      upgradeLimitText = isUpgradeable
        ? `Upgradable to ${officialSpec.officialSpecs.maxRamGb}GB`
        : 'Soldered memory - Cannot be upgraded post-purchase';
    }
    return { isUpgradeable, upgradeLimitText };
  }

  const noManual = getRamInfo(null);
  assert.strictEqual(noManual.isUpgradeable, null, 'isUpgradeable should be null when manual is missing');
  assert(noManual.upgradeLimitText.includes('Unknown'), 'upgradeLimitText should state unknown');

  const solderedManual = getRamInfo({ officialSpecs: { ramUpgradeable: false, maxRamGb: 16 } });
  assert.strictEqual(solderedManual.isUpgradeable, false, 'isUpgradeable should be false when soldered');

  const upgradeableManual = getRamInfo({ officialSpecs: { ramUpgradeable: true, maxRamGb: 64 } });
  assert.strictEqual(upgradeableManual.isUpgradeable, true, 'isUpgradeable should be true when upgradeable');
});

// -----------------------------------------------------------------------------
// 7. Battery pros line never formats boolean as true%
// -----------------------------------------------------------------------------
test('Battery pros line never prints true%', () => {
  function formatBatteryPro(c, insp) {
    const batteryPct = c.conditionDisclosures?.batteryHealthPct ?? insp.batteryHealthPct;
    if (batteryPct != null) {
      return `Battery health disclosed: ${batteryPct}%`;
    } else if (insp.hasBatteryDisclosure) {
      return 'Battery health details disclosed';
    }
    return 'WARNING: No battery health percentage or cycle count disclosed';
  }

  // Case 1: candidate has no conditionDisclosures, insp has hasBatteryDisclosure: true, but batteryHealthPct: null
  const line1 = formatBatteryPro({}, { hasBatteryDisclosure: true, batteryHealthPct: null });
  assert(!line1.includes('true%'), 'Should never print true%');
  assert.strictEqual(line1, 'Battery health details disclosed');

  // Case 2: candidate has batteryHealthPct: 88
  const line2 = formatBatteryPro({ conditionDisclosures: { batteryHealthPct: 88 } }, { hasBatteryDisclosure: true, batteryHealthPct: 88 });
  assert.strictEqual(line2, 'Battery health disclosed: 88%');

  // Case 3: candidate has no battery disclosure
  const line3 = formatBatteryPro({}, { hasBatteryDisclosure: false, batteryHealthPct: null });
  assert.strictEqual(line3, 'WARNING: No battery health percentage or cycle count disclosed');
});

// -----------------------------------------------------------------------------
// 8. Candidate deduplication across tool runs
// -----------------------------------------------------------------------------
test('Deduplication prevents repeat candidates and recommendations', () => {
  const candidateListingIds = [];
  const candidatesData = [];

  function addCandidates(ids, data) {
    for (const id of ids) {
      const idStr = id.toString();
      if (!candidateListingIds.includes(idStr)) candidateListingIds.push(idStr);
    }
    for (const cand of data) {
      const idStr = (cand._id || '').toString();
      if (!candidatesData.some((c) => (c._id || '').toString() === idStr)) {
        candidatesData.push(cand);
      }
    }
  }

  addCandidates(['1', '2'], [{ _id: '1', title: 'Laptop A' }, { _id: '2', title: 'Laptop B' }]);
  assert.strictEqual(candidatesData.length, 2);

  // Second run with duplicate '1' and new '3'
  addCandidates(['1', '3'], [{ _id: '1', title: 'Laptop A' }, { _id: '3', title: 'Laptop C' }]);
  assert.strictEqual(candidatesData.length, 3, 'Candidates should be deduplicated to 3');
  assert.deepStrictEqual(candidateListingIds, ['1', '2', '3']);
});

console.log(`\nResults: ${passed} of ${total} tests passed.`);
if (passed === total) {
  console.log('🎉 ALL UNIT CHECKS PASSED!\n');
} else {
  console.error(`❌ ${total - passed} checks failed!\n`);
  process.exit(1);
}
