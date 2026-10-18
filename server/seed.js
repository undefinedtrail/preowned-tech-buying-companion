require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Listing = require('./models/Listing');
const Specification = require('./models/Specification');
const PrivateEvidence = require('./models/PrivateEvidence');
const Shortlist = require('./models/Shortlist');
const Question = require('./models/Question');
const Viewing = require('./models/Viewing');
const ModerationEvent = require('./models/ModerationEvent');
const DocumentAndRun = require('./models/DocumentAndRun');
const { generateLocalEmbedding } = require('./services/vectorSearchService');

const Session = require('./models/Session');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/preowned_tech_companion';

async function seedDatabase() {
  try {
    console.log(`[Seeder] Connecting to MongoDB: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log('[Seeder] Connected successfully. Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Session.deleteMany({}),
      Listing.deleteMany({}),
      Specification.deleteMany({}),
      PrivateEvidence.deleteMany({}),
      Shortlist.deleteMany({}),
      Question.deleteMany({}),
      Viewing.deleteMany({}),
      ModerationEvent.deleteMany({}),
      DocumentAndRun.deleteMany({}),
    ]);

    console.log('[Seeder] Cleaned all collections. Creating verified test users...');

    // 1. Create Verified Users
    const buyer = await User.create({
      name: 'Alex Buyer',
      email: 'buyer@example.com',
      password: 'Password123!',
      role: 'buyer',
      isEmailVerified: true,
      reputationScore: 99,
    });

    const seller1 = await User.create({
      name: 'Sarah Verified Seller',
      email: 'seller1@example.com',
      password: 'Password123!',
      role: 'seller',
      isEmailVerified: true,
      reputationScore: 98,
      verifiedSalesCount: 14,
    });

    const seller2 = await User.create({
      name: 'David Quick Resale',
      email: 'seller2@example.com',
      password: 'Password123!',
      role: 'seller',
      isEmailVerified: true,
      reputationScore: 84,
      verifiedSalesCount: 3,
    });

    // Moderator role: administrator-assigned
    const moderator = await User.create({
      name: 'Marcus Moderator',
      email: 'moderator@example.com',
      password: 'Password123!',
      role: 'moderator',
      isEmailVerified: true,
      isStaffAssigned: true,
      reputationScore: 100,
    });

    console.log(`[Seeder] Created 4 users (Buyer, Seller 1, Seller 2, Moderator).`);

    // 2. Create Specifications (Curated Manufacturer Manuals & Guarantees)
    console.log('[Seeder] Indexing curated manufacturer specifications...');

    const thinkpadSpec = await Specification.create({
      brand: 'Lenovo',
      modelName: 'ThinkPad T14 Gen 3 AMD',
      category: 'laptops',
      officialSpecs: {
        maxRamGb: 32,
        ramSlotsCount: 1,
        ramUpgradeable: true,
        ramType: 'DDR5-4800 SODIMM',
        storageSlots: 1,
        storageUpgradeable: true,
        displaySpecs: {
          panelType: 'IPS Anti-Glare',
          refreshRateHz: 60,
          peakBrightnessNits: 300,
          colorGamut: '45% NTSC',
        },
        cpuFamily: 'AMD Ryzen 6000 Series PRO',
        tdpWatts: 28,
        powerAdapterWattage: 65,
        originalMSRP: 1199,
        osCompatibility: ['Windows 11 Pro', 'Ubuntu 22.04 LTS', 'Fedora'],
        repairabilityScore: 8.5,
        knownRecallsOrAdvisories: [],
      },
      curatedManualExcerpts: [
        {
          sectionTitle: 'Lenovo T14 Gen 3 Hardware Maintenance Manual - Section 4.2',
          excerpt: 'The system board contains one DDR5 SO-DIMM slot enabling memory expansion up to 32GB maximum system capacity. Storage utilizes standard M.2 2280 PCIe Gen 4x4 SSD.',
          sourceDoc: 'Lenovo T14 Gen3 AMD Hardware Maintenance Manual',
          pageNumber: 38,
        },
      ],
      embedding: generateLocalEmbedding('Lenovo ThinkPad T14 Gen 3 AMD Ryzen coding laptop upgradeable RAM'),
    });

    const macbookSpec = await Specification.create({
      brand: 'Apple',
      modelName: 'MacBook Pro 14 M1 Pro',
      category: 'laptops',
      officialSpecs: {
        maxRamGb: 16,
        ramSlotsCount: 0,
        ramUpgradeable: false,
        ramType: 'Unified LPDDR5 Soldered',
        storageSlots: 0,
        storageUpgradeable: false,
        displaySpecs: {
          panelType: 'Liquid Retina XDR Mini-LED',
          refreshRateHz: 120,
          peakBrightnessNits: 1600,
          colorGamut: '100% DCI-P3 Wide Color',
        },
        cpuFamily: 'Apple Silicon M1 Pro',
        tdpWatts: 30,
        powerAdapterWattage: 67,
        originalMSRP: 1999,
        osCompatibility: ['macOS Monterey', 'macOS Sonoma', 'macOS Sequoia'],
        repairabilityScore: 5.5,
        knownRecallsOrAdvisories: [],
      },
      curatedManualExcerpts: [
        {
          sectionTitle: 'Apple Authorized Service Guide - M1 Pro Architecture',
          excerpt: 'Unified memory is integrated directly into the M1 Pro system-on-chip package. Memory is non-removable and cannot be upgraded after manufacture.',
          sourceDoc: 'Apple Silicon Hardware Reference Architecture',
          pageNumber: 12,
        },
      ],
      embedding: generateLocalEmbedding('Apple MacBook Pro 14 M1 Pro 16GB coding video editing soldered RAM Retina'),
    });

    const dellSpec = await Specification.create({
      brand: 'Dell',
      modelName: 'XPS 15 9520',
      category: 'laptops',
      officialSpecs: {
        maxRamGb: 64,
        ramSlotsCount: 2,
        ramUpgradeable: true,
        ramType: 'DDR5-4800 Dual Channel SO-DIMM',
        storageSlots: 2,
        storageUpgradeable: true,
        displaySpecs: {
          panelType: '3.5K OLED Touchscreen',
          refreshRateHz: 60,
          peakBrightnessNits: 400,
          colorGamut: '100% DCI-P3',
        },
        cpuFamily: 'Intel Core i7 12th Gen H-Series',
        tdpWatts: 45,
        powerAdapterWattage: 130,
        originalMSRP: 2299,
        osCompatibility: ['Windows 11 Pro', 'Ubuntu 22.04 LTS'],
        repairabilityScore: 7.5,
        knownRecallsOrAdvisories: [],
      },
      curatedManualExcerpts: [
        {
          sectionTitle: 'Dell XPS 15 9520 Service Manual - Memory Modules',
          excerpt: 'Your computer has two user-accessible SODIMM slots. Supports 16GB, 32GB, and up to 64GB DDR5 memory at 4800 MHz. Dual M.2 PCIe Gen4 NVMe slots allow storage upgrades.',
          sourceDoc: 'Dell XPS 9520 Setup and Specifications Guide',
          pageNumber: 24,
        },
      ],
      embedding: generateLocalEmbedding('Dell XPS 15 9520 Intel i7 OLED dual slot upgradeable RAM coding laptop'),
    });

    const sonySpec = await Specification.create({
      brand: 'Sony',
      modelName: 'Alpha A7 III',
      category: 'cameras',
      officialSpecs: {
        maxRamGb: 0,
        ramSlotsCount: 0,
        ramUpgradeable: false,
        storageSlots: 2,
        displaySpecs: {
          panelType: 'TFT LCD Tilt',
          refreshRateHz: 60,
          peakBrightnessNits: 500,
        },
        originalMSRP: 1799,
        repairabilityScore: 7.0,
      },
      curatedManualExcerpts: [
        {
          sectionTitle: 'Sony Service Bulletin - Shutter Unit Endurance',
          excerpt: 'The electronically controlled, vertical-traverse, focal-plane mechanical shutter is rated for 200,000 cycles.',
          sourceDoc: 'Sony ILCE-7M3 Technical Specifications',
          pageNumber: 8,
        },
      ],
      embedding: generateLocalEmbedding('Sony Alpha A7 III Full Frame mirrorless camera photography video 4k'),
    });

    const steamDeckSpec = await Specification.create({
      brand: 'Valve',
      modelName: 'Steam Deck OLED',
      category: 'gaming',
      officialSpecs: {
        maxRamGb: 16,
        ramSlotsCount: 0,
        ramUpgradeable: false,
        ramType: 'LPDDR5 6400 MT/s',
        storageSlots: 1,
        storageUpgradeable: true,
        displaySpecs: {
          panelType: 'HDR OLED 90Hz',
          refreshRateHz: 90,
          peakBrightnessNits: 1000,
        },
        originalMSRP: 549,
        repairabilityScore: 9.0,
      },
      curatedManualExcerpts: [
        {
          sectionTitle: 'Valve Hardware Repair Documentation - M.2 Slot',
          excerpt: 'Features a modular M.2 2230 NVMe SSD socket for internal drive replacement. Analog thumbsticks are individually replaceable modules with no soldering required.',
          sourceDoc: 'Valve Official Repair Portal',
          pageNumber: 4,
        },
      ],
      embedding: generateLocalEmbedding('Valve Steam Deck OLED portable gaming handheld SteamOS 90Hz HDR'),
    });

    console.log('[Seeder] Created 5 official manufacturer specifications.');

    // 3. Create Seed Listings (Crucial Demonstration Scenario)
    console.log('[Seeder] Populating test listings for demonstration scenario...');

    // LISTING 1: The cheapest coding laptop, DELIBERATELY lacking battery disclosure
    const listingThinkpad = await Listing.create({
      title: 'Lenovo ThinkPad T14 AMD Ryzen 5 - Budget Dev Machine',
      description: 'Solid workhorse laptop for software engineering and Docker. Excellent keyboard, matte anti-glare screen. Comes with generic USB-C charger. Selling because of company upgrade.',
      category: 'laptops',
      brand: 'Lenovo',
      modelName: 'ThinkPad T14 Gen 3 AMD',
      price: 480, // CHEAPEST CODING LAPTOP
      currency: 'USD',
      condition: 'good',
      structuredSpecs: {
        cpu: 'AMD Ryzen 5 PRO 6650U (6 Cores / 12 Threads)',
        ramGb: 16,
        ramType: 'DDR5 SODIMM',
        storageGb: 512,
        storageType: 'NVMe SSD',
        gpu: 'AMD Radeon 660M Integrated',
        screenSizeInches: 14,
        resolution: '1920x1200 FHD+ 16:10',
        releaseYear: 2022,
      },
      conditionDisclosures: {
        // DELIBERATELY OMITTED BATTERY DISCLOSURE FOR DEMO SCENARIO
        batteryHealthPct: null,
        batteryCycleCount: null,
        screenCondition: 'Clean, no dead pixels, faint smudge near bezel',
        bodyCondition: 'Minor surface scuffs on top lid and corners',
        functionalDefects: [],
        repairHistory: 'Original factory hardware, never opened by seller',
        originalAccessories: ['Third-party 65W USB-C Charger'],
        sellerConditionSummary: 'Works well for VS Code and terminals. Battery holds a charge for a few hours but exact health percentage has not been measured.',
      },
      status: 'active',
      evidenceStatus: 'pending',
      sellerId: seller2._id,
      images: [
        'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=80',
      ],
      embedding: generateLocalEmbedding('Lenovo ThinkPad T14 Gen 3 AMD Ryzen 5 coding programming laptop 16GB RAM 512GB SSD'),
    });

    // LISTING 2: More expensive, fully disclosed with verified evidence
    const listingMacbook = await Listing.create({
      title: 'Apple MacBook Pro 14 M1 Pro 16GB / 512GB Space Gray',
      description: 'Immaculate condition MacBook Pro 14-inch. Used lightly for frontend design and web development. Screen has zero blemishes. Includes original 67W MagSafe brick and braided cable.',
      category: 'laptops',
      brand: 'Apple',
      modelName: 'MacBook Pro 14 M1 Pro',
      price: 850, // Higher price, fully disclosed
      currency: 'USD',
      condition: 'excellent',
      structuredSpecs: {
        cpu: 'Apple M1 Pro (8-Core CPU / 14-Core GPU)',
        ramGb: 16,
        ramType: 'Unified LPDDR5',
        storageGb: 512,
        storageType: 'Apple High-Speed NVMe',
        gpu: 'Apple 14-Core Integrated',
        screenSizeInches: 14.2,
        resolution: '3024x1964 Liquid Retina XDR 120Hz ProMotion',
        releaseYear: 2021,
      },
      conditionDisclosures: {
        batteryHealthPct: 91,
        batteryCycleCount: 142,
        screenCondition: 'Flawless Liquid Retina XDR display with zero scratches or coating wear',
        bodyCondition: 'Mint condition, kept in hardshell protective case since purchase',
        functionalDefects: [],
        repairHistory: 'No repairs ever needed or performed',
        originalAccessories: ['Original Apple 67W USB-C Power Adapter', 'Original USB-C to MagSafe 3 Cable'],
        sellerConditionSummary: 'Battery is at 91% maximum capacity with only 142 cycles. Full Apple Diagnostics diagnostic report attached and verified.',
      },
      status: 'active',
      evidenceStatus: 'verified',
      sellerId: seller1._id,
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80',
      ],
      embedding: generateLocalEmbedding('Apple MacBook Pro 14 M1 Pro 16GB 512GB Space Gray coding light editing Xcode Retina'),
    });

    // LISTING 3: Upgradeable Dell XPS 15
    const listingDell = await Listing.create({
      title: 'Dell XPS 15 9520 Core i7-12700H / 32GB RAM / 1TB SSD OLED',
      description: 'Heavy duty developer workstation with gorgeous 3.5K OLED touchscreen. Upgraded with dual 16GB DDR5 sticks to 32GB RAM. Great for intensive coding, VMs, and Adobe Suite.',
      category: 'laptops',
      brand: 'Dell',
      modelName: 'XPS 15 9520',
      price: 899,
      currency: 'USD',
      condition: 'excellent',
      structuredSpecs: {
        cpu: 'Intel Core i7-12700H (14 Cores / 20 Threads)',
        ramGb: 32,
        ramType: 'DDR5-4800 Dual Channel SODIMM',
        storageGb: 1024,
        storageType: 'PCIe Gen4 NVMe SSD',
        gpu: 'NVIDIA GeForce RTX 3050 Laptop 4GB',
        screenSizeInches: 15.6,
        resolution: '3456x2160 3.5K OLED Touch',
        releaseYear: 2022,
      },
      conditionDisclosures: {
        batteryHealthPct: 87,
        batteryCycleCount: 198,
        screenCondition: 'OLED panel in perfect condition with zero burn-in',
        bodyCondition: 'Minor hairline mark on lower aluminum edge',
        functionalDefects: [],
        repairHistory: 'RAM was upgraded by certified technician using Crucial DDR5 kits',
        originalAccessories: ['Original Dell 130W USB-C Slim Adapter', 'Dell USB-C to HDMI/USB-A Dongle'],
        sellerConditionSummary: 'Fully functional, passes all Dell SupportAssist hardware scans.',
      },
      status: 'active',
      evidenceStatus: 'verified',
      sellerId: seller1._id,
      images: [
        'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&q=80',
        'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
      ],
      embedding: generateLocalEmbedding('Dell XPS 15 9520 Intel Core i7 32GB RAM 1TB SSD OLED coding Docker developer'),
    });

    // LISTING 4: High similarity but strictly OVER BUDGET ($1450 vs $900 budget)
    // Used to test that similarity NEVER overrides hard budget limits!
    const listingOverBudget = await Listing.create({
      title: 'Razer Blade 16 RTX 4080 Ultimate Developer & Creator Rig',
      description: 'Top-tier powerhouse laptop for ML, 3D rendering, and massive code compilation. High performance with Dual-mode Mini-LED display.',
      category: 'laptops',
      brand: 'Razer',
      modelName: 'Blade 16',
      price: 1450, // OVER $900 BUDGET
      currency: 'USD',
      condition: 'excellent',
      structuredSpecs: {
        cpu: 'Intel Core i9-13950HX',
        ramGb: 32,
        storageGb: 1024,
        gpu: 'NVIDIA GeForce RTX 4080 12GB',
        screenSizeInches: 16,
        releaseYear: 2023,
      },
      conditionDisclosures: {
        batteryHealthPct: 96,
        batteryCycleCount: 65,
        screenCondition: 'Flawless',
        bodyCondition: 'Excellent',
        functionalDefects: [],
        sellerConditionSummary: 'Pristine creator machine.',
      },
      status: 'active',
      evidenceStatus: 'verified',
      sellerId: seller1._id,
      images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80'],
      embedding: generateLocalEmbedding('Razer Blade 16 RTX 4080 coding machine learning development high end'),
    });

    // LISTING 5: SOLD listing (Used to test that sold items are excluded from public search and viewing bookings)
    const listingSold = await Listing.create({
      title: 'Apple MacBook Air M2 8GB / 256GB Midnight (Sold)',
      description: 'Lightweight everyday laptop, successfully sold to local buyer.',
      category: 'laptops',
      brand: 'Apple',
      modelName: 'MacBook Air M2',
      price: 650,
      currency: 'USD',
      condition: 'good',
      structuredSpecs: {
        cpu: 'Apple M2 8-Core',
        ramGb: 8,
        storageGb: 256,
      },
      conditionDisclosures: {
        batteryHealthPct: 94,
        batteryCycleCount: 110,
      },
      status: 'sold', // SOLD ITEM
      evidenceStatus: 'verified',
      sellerId: seller2._id,
      images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=80'],
      embedding: generateLocalEmbedding('Apple MacBook Air M2 8GB Midnight sold item'),
    });

    // LISTING 6: SUSPENDED listing (Used to test that suspended items cannot receive new viewing bookings)
    const listingSuspended = await Listing.create({
      title: 'Sony Alpha A7 III Full Frame Camera Body (Suspended)',
      description: 'Reported by community: Suspicious discrepancy in shutter actuation claims.',
      category: 'cameras',
      brand: 'Sony',
      modelName: 'Alpha A7 III',
      price: 950,
      currency: 'USD',
      condition: 'fair',
      structuredSpecs: {
        sensorType: 'Full-Frame BSI CMOS',
        megapixels: 24.2,
        shutterCount: 5000,
      },
      conditionDisclosures: {
        bodyCondition: 'Heavy rubbing on bottom grip plate',
        functionalDefects: ['Disputed shutter actuation counter'],
        sellerConditionSummary: 'Used camera body, works fine.',
      },
      status: 'suspended', // SUSPENDED ITEM
      evidenceStatus: 'flagged',
      sellerId: seller2._id,
      reportCount: 3,
      moderationNote: 'Suspended pending evidence review of reported shutter count tampering.',
      images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'],
      embedding: generateLocalEmbedding('Sony Alpha A7 III full frame mirrorless camera photography'),
    });

    // LISTING 7: Valve Steam Deck OLED (Gaming category)
    const listingSteamDeck = await Listing.create({
      title: 'Valve Steam Deck OLED 512GB Handheld + Official Dock',
      description: 'Incredible OLED handheld gaming PC. Can also run desktop Linux for coding on the go. Comes with official dock, carrying case, and original charger.',
      category: 'gaming',
      brand: 'Valve',
      modelName: 'Steam Deck OLED',
      price: 440,
      currency: 'USD',
      condition: 'excellent',
      structuredSpecs: {
        cpu: 'AMD 6nm APU',
        ramGb: 16,
        storageGb: 512,
        gpu: 'AMD RDNA 2',
        dockIncluded: true,
        releaseYear: 2023,
      },
      conditionDisclosures: {
        batteryHealthPct: 98,
        batteryCycleCount: 34,
        screenCondition: 'Flawless 90Hz OLED with anti-glare etched glass',
        bodyCondition: 'Like new',
        functionalDefects: [],
        originalAccessories: ['Official Valve Docking Station', 'Original 45W Charger', 'Carrying Case'],
        sellerConditionSummary: 'Barely used, completed 2 games. Battery in near-mint condition.',
      },
      status: 'active',
      evidenceStatus: 'verified',
      sellerId: seller2._id,
      images: ['https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80'],
      embedding: generateLocalEmbedding('Valve Steam Deck OLED portable gaming handheld PC dock Linux'),
    });

    console.log('[Seeder] Created 7 test listings with demonstration scenarios.');

    // 4. Create Private Evidence (Enforcing Strict Serial Number Masking)
    console.log('[Seeder] Attaching private evidence documents with serial numbers...');

    await PrivateEvidence.create({
      listingId: listingThinkpad._id,
      sellerId: seller2._id,
      serialNumber: 'SN-LENOVO-88219-THINK',
      proofOfOwnershipDocUrl: 'https://secure-vault.example.com/receipts/lenovo-po-10928.pdf',
      purchaseReceiptUrl: 'https://secure-vault.example.com/invoices/microcenter-inv-9921.pdf',
      batteryReportDocUrl: null, // OMITTED
      diagnosticLogs: null,      // OMITTED
      verificationStatus: 'pending',
      moderatorNotes: 'Awaiting battery health report documentation from seller.',
    });

    await PrivateEvidence.create({
      listingId: listingMacbook._id,
      sellerId: seller1._id,
      serialNumber: 'C02FM832Q6L4',
      proofOfOwnershipDocUrl: 'https://secure-vault.example.com/receipts/apple-store-invoice-38291.pdf',
      purchaseReceiptUrl: 'https://secure-vault.example.com/receipts/apple-store-invoice-38291.pdf',
      batteryReportDocUrl: 'https://secure-vault.example.com/diagnostics/apple-system-profiler-m1.pdf',
      diagnosticLogs: 'Apple Hardware Diagnostics: PASS. Battery Maximum Capacity: 91.2%. Cycle Count: 142. Condition: Normal. Storage SMART Status: Verified Healthy.',
      verificationStatus: 'verified',
      moderatorNotes: 'Apple original invoice and system profiler report match device serial and condition declarations.',
      verifiedBy: moderator._id,
      verifiedAt: new Date(),
    });

    await PrivateEvidence.create({
      listingId: listingDell._id,
      sellerId: seller1._id,
      serialNumber: 'DELL-SERVICE-TAG-99X82B',
      proofOfOwnershipDocUrl: 'https://secure-vault.example.com/receipts/dell-order-confirmation.pdf',
      purchaseReceiptUrl: 'https://secure-vault.example.com/receipts/dell-order-confirmation.pdf',
      batteryReportDocUrl: 'https://secure-vault.example.com/diagnostics/dell-ecsa-battery-report.html',
      diagnosticLogs: 'Dell ePSA Pre-boot System Assessment: All tests passed. Primary Battery Health: 87%. AC Adapter: 130W Genuine.',
      verificationStatus: 'verified',
      moderatorNotes: 'Service tag confirmed with Dell Warranty database. Dual RAM upgrade verified.',
      verifiedBy: moderator._id,
      verifiedAt: new Date(),
    });

    await PrivateEvidence.create({
      listingId: listingSuspended._id,
      sellerId: seller2._id,
      serialNumber: 'SN-SONY-7731298',
      proofOfOwnershipDocUrl: 'https://secure-vault.example.com/receipts/camera-store-receipt.pdf',
      purchaseReceiptUrl: 'https://secure-vault.example.com/receipts/camera-store-receipt.pdf',
      batteryReportDocUrl: null,
      diagnosticLogs: 'EXIF Extraction log: Total Shutter Count recorded at 74,219 cycles.',
      verificationStatus: 'flagged',
      moderatorNotes: 'EXIF log contradicts seller claim of 5,000 shutter actuations. Listing suspended.',
      verifiedBy: moderator._id,
      verifiedAt: new Date(),
    });

    console.log('[Seeder] Created private evidence records with serial numbers.');

    // 5. Create Shortlists, Questions, Viewings, and Moderation Events
    console.log('[Seeder] Creating sample shortlists, questions, viewings and moderation events...');

    await Shortlist.create({
      buyerId: buyer._id,
      listingId: listingMacbook._id,
      notes: 'Top choice for web development and Figma. Verified battery health at 91%.',
      priority: 'high',
      targetBudget: 900,
    });

    await Question.create({
      listingId: listingThinkpad._id,
      buyerId: buyer._id,
      sellerId: seller2._id,
      subject: 'Inquiry on ThinkPad T14 Battery Health',
      messages: [
        {
          senderId: buyer._id,
          senderRole: 'buyer',
          message: 'Hi, I saw that the battery health percentage is not listed. Could you run "powercfg /batteryreport" in Windows and share the full charge capacity?',
          createdAt: new Date(Date.now() - 3600 * 1000 * 4),
        },
        {
          senderId: seller2._id,
          senderRole: 'seller',
          message: 'Hey Alex, I will run the battery report this evening when I get back home and update the listing!',
          createdAt: new Date(Date.now() - 3600 * 1000 * 2),
        },
      ],
      lastMessageAt: new Date(Date.now() - 3600 * 1000 * 2),
    });

    await Viewing.create({
      listingId: listingMacbook._id,
      buyerId: buyer._id,
      sellerId: seller1._id,
      requestedDate: new Date(Date.now() + 86400 * 1000 * 2),
      timeSlot: '15:00 - 16:00',
      locationType: 'police_station_safe_zone',
      locationDetails: 'City Center Police Headquarters E-Commerce Safe Zone',
      buyerNotes: 'Looking forward to inspecting the MacBook. Will bring a USB drive to run CoconutBattery.',
      status: 'confirmed',
      sellerNotes: 'Confirmed! I will have the device charged to 100% so you can run all diagnostic checks.',
    });

    await Viewing.create({
      listingId: listingThinkpad._id,
      buyerId: buyer._id,
      sellerId: seller2._id,
      requestedDate: new Date(Date.now() + 86400 * 1000 * 3),
      timeSlot: '11:00 - 12:00',
      locationType: 'police_station_safe_zone',
      locationDetails: 'Official Safe Exchange Zone',
      buyerNotes: 'Requesting a physical check on battery life.',
      status: 'requested',
    });

    await ModerationEvent.create({
      listingId: listingSuspended._id,
      moderatorId: moderator._id,
      action: 'suspended',
      reason: 'Inconsistent shutter count declaration: Seller declared 5,000 shutter actuations, but submitted raw EXIF analysis revealed 74,219 actuations.',
      previousStatus: 'active',
      newStatus: 'suspended',
      notes: 'Listing suspended to protect potential buyers from misrepresented hardware wear.',
    });

    console.log('\n======================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Test Accounts:');
    console.log('  Buyer:     buyer@example.com     / Password123!');
    console.log('  Seller 1:  seller1@example.com   / Password123! (High reputation)');
    console.log('  Seller 2:  seller2@example.com   / Password123! (Missing battery disclosure)');
    console.log('  Moderator: moderator@example.com / Password123!');
    console.log('Demonstration Scenario Details:');
    console.log(`  1. Cheapest Coding Laptop: ${listingThinkpad.title} ($${listingThinkpad.price})`);
    console.log('     -> Deliberately lacks battery disclosure (batteryHealthPct: null)');
    console.log(`  2. Verified Coding Laptop: ${listingMacbook.title} ($${listingMacbook.price})`);
    console.log('     -> Full disclosure (91% battery health, 142 cycles, verified evidence)');
    console.log(`  3. Hard Budget Constraint Test: ${listingOverBudget.title} ($${listingOverBudget.price})`);
    console.log('     -> Excluded from $900 budget searches despite high semantic similarity');
    console.log(`  4. Sold Exclusion Test: ${listingSold.title} (Status: sold)`);
    console.log(`  5. Suspended Booking Block: ${listingSuspended.title} (Status: suspended)`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error] Failed to seed database:', error);
    process.exit(1);
  }
}

seedDatabase();
