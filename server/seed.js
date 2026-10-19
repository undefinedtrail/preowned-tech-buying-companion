require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Listing = require('./models/Listing');
const Specification = require('./models/Specification');
const SpecificationChunk = require('./models/SpecificationChunk');
const PrivateEvidence = require('./models/PrivateEvidence');
const Shortlist = require('./models/Shortlist');
const Question = require('./models/Question');
const Viewing = require('./models/Viewing');
const ModerationEvent = require('./models/ModerationEvent');
const DocumentAndRun = require('./models/DocumentAndRun');
const Session = require('./models/Session');
const { getEmbedding } = require('./services/vectorSearchService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/preowned_tech_companion';

async function seedDatabase() {
  try {
    // Safety Guard: Prohibit wipe and seed in production or against remote databases
    if (process.env.NODE_ENV === 'production') {
      console.error('[Seeder ERROR] Database wipe and seed is strictly prohibited in production (NODE_ENV=production)!');
      process.exit(1);
    }

    const isLocalUri = MONGO_URI.includes('127.0.0.1') || MONGO_URI.includes('localhost');
    if (!isLocalUri && process.env.ALLOW_REMOTE_SEED !== 'true') {
      console.error('[Seeder ERROR] MONGO_URI points to a remote or non-localhost database. Seeding is aborted to prevent accidental data loss. Set ALLOW_REMOTE_SEED=true to override.');
      process.exit(1);
    }

    console.log(`[Seeder] Connecting to MongoDB: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log('[Seeder] Connected successfully. Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Session.deleteMany({}),
      Listing.deleteMany({}),
      Specification.deleteMany({}),
      SpecificationChunk.deleteMany({}),
      PrivateEvidence.deleteMany({}),
      Shortlist.deleteMany({}),
      Question.deleteMany({}),
      Viewing.deleteMany({}),
      ModerationEvent.deleteMany({}),
      DocumentAndRun.deleteMany({}),
    ]);

    console.log('[Seeder] Cleaned all collections. Creating verified presentation users...');

    // 1. Create Realistic Users (@seed.local)
    const buyer1 = await User.create({
      name: 'Priya Sharma',
      email: 'buyer.priya01@seed.local',
      password: 'Password123!',
      role: 'buyer',
      isEmailVerified: true,
      reputationScore: 99,
    });

    const buyer2 = await User.create({
      name: 'Marcus Chen',
      email: 'buyer.marcus02@seed.local',
      password: 'Password123!',
      role: 'buyer',
      isEmailVerified: true,
      reputationScore: 96,
    });

    const buyer3 = await User.create({
      name: 'Elena Rostova',
      email: 'buyer.elena03@seed.local',
      password: 'Password123!',
      role: 'buyer',
      isEmailVerified: true,
      reputationScore: 92,
    });

    const seller1 = await User.create({
      name: 'Aarav Kapoor',
      email: 'seller.aarav01@seed.local',
      password: 'Password123!',
      role: 'seller',
      isEmailVerified: true,
      reputationScore: 98,
      verifiedSalesCount: 24,
    });

    const seller2 = await User.create({
      name: 'Clara Vance',
      email: 'seller.clara02@seed.local',
      password: 'Password123!',
      role: 'seller',
      isEmailVerified: true,
      reputationScore: 95,
      verifiedSalesCount: 16,
    });

    const seller3 = await User.create({
      name: 'Kenji Takahashi',
      email: 'seller.kenji03@seed.local',
      password: 'Password123!',
      role: 'seller',
      isEmailVerified: true,
      reputationScore: 89,
      verifiedSalesCount: 8,
    });

    const seller4 = await User.create({
      name: 'Zara Al-Mansoor',
      email: 'seller.zara04@seed.local',
      password: 'Password123!',
      role: 'seller',
      isEmailVerified: true,
      reputationScore: 94,
      verifiedSalesCount: 11,
    });

    const moderator = await User.create({
      name: 'Vikram Staff Reviewer',
      email: 'moderator.staff01@seed.local',
      password: 'Password123!',
      role: 'moderator',
      isEmailVerified: true,
      isStaffAssigned: true,
      reputationScore: 100,
    });

    console.log('[Seeder] Created 8 realistic accounts (3 buyers, 4 sellers, 1 staff moderator).');

    // 2. Curated Manufacturer Specifications
    console.log('[Seeder] Creating manufacturer specifications...');

    const specsData = [
      {
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
          displaySpecs: { panelType: 'IPS Anti-Glare', refreshRateHz: 60, peakBrightnessNits: 400, colorGamut: '100% sRGB' },
          cpuFamily: 'AMD Ryzen 7 PRO 6850U',
          tdpWatts: 28,
          powerAdapterWattage: 65,
          originalMSRP: 1499,
          osCompatibility: ['Windows 11 Pro', 'Ubuntu 22.04 LTS', 'Fedora 38'],
          repairabilityScore: 8.5,
          knownRecallsOrAdvisories: ['Ensure BIOS version 1.30+ is flashed to prevent USB-C PD sleep drain.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'Memory & Upgrades Hardware Maintenance Manual (p.42)',
            excerpt: 'The system board features one soldered LPDDR5 memory block and one user-accessible DDR5-4800 SODIMM slot. Upgradable to a maximum total of 32GB system memory.',
            sourceDoc: 'Lenovo ThinkPad T14 Gen 3 AMD Hardware Maintenance Manual',
            pageNumber: 42,
          },
          {
            sectionTitle: 'Power Delivery and Battery Longevity (p.18)',
            excerpt: 'RapidCharge allows up to 80% charge capacity in 60 minutes using the genuine 65W USB-C GaN power adapter. Standard nominal capacity is 52.5Wh.',
            sourceDoc: 'Lenovo ThinkPad T14 Gen 3 AMD User Guide',
            pageNumber: 18,
          },
        ],
      },
      {
        brand: 'Apple',
        modelName: 'MacBook Pro 14 M2 Pro',
        category: 'laptops',
        officialSpecs: {
          maxRamGb: 32,
          ramSlotsCount: 0,
          ramUpgradeable: false,
          ramType: 'Unified Memory (LPDDR5-6400)',
          storageSlots: 0,
          storageUpgradeable: false,
          displaySpecs: { panelType: 'Liquid Retina XDR Mini-LED', refreshRateHz: 120, peakBrightnessNits: 1600, colorGamut: 'P3 Wide Color' },
          cpuFamily: 'Apple M2 Pro (10-core CPU, 16-core GPU)',
          tdpWatts: 30,
          powerAdapterWattage: 67,
          originalMSRP: 1999,
          osCompatibility: ['macOS Ventura', 'macOS Sonoma', 'macOS Sequoia'],
          repairabilityScore: 6.0,
          knownRecallsOrAdvisories: ['No active recalls. Battery replacement requires proprietary Apple calibrate routine.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'System Architecture & Unified Memory Specification (Section 1.4)',
            excerpt: 'Memory and NAND flash storage are permanently surface-mounted directly to the Apple Silicon System-on-Chip substrate. Neither memory nor internal SSD can be upgraded post-manufacture.',
            sourceDoc: 'Apple Silicon Developer Hardware Specifications Guide',
            pageNumber: 9,
          },
          {
            sectionTitle: 'Liquid Retina XDR Display Specifications',
            excerpt: 'ProMotion adaptive refresh rate technology delivers continuous variable frequency up to 120Hz with sustained 1,000 nits full-screen brightness.',
            sourceDoc: 'Apple MacBook Pro Technical Specifications',
            pageNumber: 3,
          },
        ],
      },
      {
        brand: 'Dell',
        modelName: 'XPS 15 9520',
        category: 'laptops',
        officialSpecs: {
          maxRamGb: 64,
          ramSlotsCount: 2,
          ramUpgradeable: true,
          ramType: 'DDR5-4800 Dual Channel SODIMM',
          storageSlots: 2,
          storageUpgradeable: true,
          displaySpecs: { panelType: '3.5K OLED Touchscreen', refreshRateHz: 60, peakBrightnessNits: 400, colorGamut: '100% DCI-P3' },
          cpuFamily: 'Intel Core i7-12700H',
          tdpWatts: 45,
          powerAdapterWattage: 130,
          originalMSRP: 2199,
          osCompatibility: ['Windows 11 Home/Pro', 'Linux Red Hat Enterprise'],
          repairabilityScore: 7.5,
          knownRecallsOrAdvisories: ['Trackpad wobble advisory resolved via chassis revision rev-A03.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'Internal Storage & Memory Expandability (Service Manual p.28)',
            excerpt: 'Two SODIMM memory slots support up to 64GB DDR5 memory. Two M.2 2280 slots support dual PCIe Gen 4 NVMe solid state drives up to 4TB total.',
            sourceDoc: 'Dell XPS 15 9520 Service and Maintenance Guide',
            pageNumber: 28,
          },
        ],
      },
      {
        brand: 'Sony',
        modelName: 'Alpha A7 IV',
        category: 'cameras',
        officialSpecs: {
          maxRamGb: 0,
          ramSlotsCount: 0,
          ramUpgradeable: false,
          ramType: 'Embedded BIONZ XR Buffer',
          storageSlots: 2,
          storageUpgradeable: true,
          displaySpecs: { panelType: 'Vari-angle Touch LCD', refreshRateHz: 60, peakBrightnessNits: 600, colorGamut: 'sRGB' },
          cpuFamily: 'Dual BIONZ XR Imaging Processor',
          tdpWatts: 15,
          powerAdapterWattage: 15,
          originalMSRP: 2498,
          osCompatibility: ['Sony Camera OS 3.0+'],
          repairabilityScore: 6.5,
          knownRecallsOrAdvisories: ['Firmware update 2.01 recommended to resolve occasional eye-AF hunting under tungsten lighting.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'Mechanical Shutter Durability and Rated Actuations',
            excerpt: 'The low-vibration focal-plane mechanical shutter is rated for 200,000 actuations under continuous heavy laboratory stress testing conditions.',
            sourceDoc: 'Sony Alpha A7 IV Service Manual and Technical Whitepaper',
            pageNumber: 54,
          },
        ],
      },
      {
        brand: 'Fujifilm',
        modelName: 'X-T5',
        category: 'cameras',
        officialSpecs: {
          maxRamGb: 0,
          ramSlotsCount: 0,
          ramUpgradeable: false,
          ramType: 'Embedded X-Processor 5 Buffer',
          storageSlots: 2,
          storageUpgradeable: true,
          displaySpecs: { panelType: '3-way Tilting Touch LCD', refreshRateHz: 60, peakBrightnessNits: 500, colorGamut: 'sRGB' },
          cpuFamily: 'X-Processor 5',
          tdpWatts: 12,
          powerAdapterWattage: 15,
          originalMSRP: 1699,
          osCompatibility: ['Fujifilm X OS Firmware 2.0+'],
          repairabilityScore: 7.0,
          knownRecallsOrAdvisories: ['Dual UHS-II SD slots required for 6.2K ProRes internal recording.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'Sensor Architecture & IBIS Performance',
            excerpt: '40.2MP X-Trans CMOS 5 HR sensor with 5-axis In-Body Image Stabilization providing up to 7.0 stops of compensation.',
            sourceDoc: 'Fujifilm X-T5 Comprehensive Owner Guide',
            pageNumber: 31,
          },
        ],
      },
      {
        brand: 'Valve',
        modelName: 'Steam Deck OLED 512GB',
        category: 'gaming',
        officialSpecs: {
          maxRamGb: 16,
          ramSlotsCount: 0,
          ramUpgradeable: false,
          ramType: '16GB LPDDR5-6400 quad-channel',
          storageSlots: 1,
          storageUpgradeable: true,
          displaySpecs: { panelType: '7.4-inch HDR OLED 90Hz', refreshRateHz: 90, peakBrightnessNits: 1000, colorGamut: '110% DCI-P3' },
          cpuFamily: '6nm AMD Sephiroth APU',
          tdpWatts: 15,
          powerAdapterWattage: 45,
          originalMSRP: 549,
          osCompatibility: ['SteamOS 3.5+', 'Windows 11'],
          repairabilityScore: 9.0,
          knownRecallsOrAdvisories: ['M.2 2230 NVMe upgrade requires disconnecting battery cable prior to heat shield removal.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'Internal Storage Replacement Protocol (iFixit Manual p.12)',
            excerpt: 'Internal storage utilizes a standard modular M.2 2230 PCIe Gen 3/4 socket. User upgradeable using standard Torx and Phillips drivers.',
            sourceDoc: 'Valve Official Repair Documentation with iFixit',
            pageNumber: 12,
          },
        ],
      },
      {
        brand: 'Apple',
        modelName: 'iPhone 15 Pro Max',
        category: 'smartphones',
        officialSpecs: {
          maxRamGb: 8,
          ramSlotsCount: 0,
          ramUpgradeable: false,
          ramType: '8GB LPDDR5 Unified',
          storageSlots: 0,
          storageUpgradeable: false,
          displaySpecs: { panelType: 'Super Retina XDR OLED', refreshRateHz: 120, peakBrightnessNits: 2000, colorGamut: 'P3' },
          cpuFamily: 'Apple A17 Pro (3nm)',
          tdpWatts: 10,
          powerAdapterWattage: 27,
          originalMSRP: 1199,
          osCompatibility: ['iOS 17', 'iOS 18'],
          repairabilityScore: 7.0,
          knownRecallsOrAdvisories: ['Back glass and battery are independently replaceable with redesigned subframe.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'Battery Capacity and Thermal Architecture',
            excerpt: 'Equipped with a 4,422 mAh Li-ion cell rated for 1,000 full charge cycles until 80% original capacity under iOS 17.4+ battery health management.',
            sourceDoc: 'Apple iPhone 15 Pro Max Repair and Battery Whitepaper',
            pageNumber: 15,
          },
        ],
      },
      {
        brand: 'Samsung',
        modelName: 'Galaxy S24 Ultra',
        category: 'smartphones',
        officialSpecs: {
          maxRamGb: 12,
          ramSlotsCount: 0,
          ramUpgradeable: false,
          ramType: '12GB LPDDR5X',
          storageSlots: 0,
          storageUpgradeable: false,
          displaySpecs: { panelType: 'Dynamic AMOLED 2X 120Hz Anti-Reflective', refreshRateHz: 120, peakBrightnessNits: 2600, colorGamut: '100% DCI-P3' },
          cpuFamily: 'Snapdragon 8 Gen 3 for Galaxy',
          tdpWatts: 12,
          powerAdapterWattage: 45,
          originalMSRP: 1299,
          osCompatibility: ['Android 14', 'One UI 6.1'],
          repairabilityScore: 8.0,
          knownRecallsOrAdvisories: ['Corning Gorilla Armor requires micro-fiber cleaning to preserve anti-reflective coating.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'Display & S-Pen Digitizer Architecture',
            excerpt: 'Features flat 6.8-inch display panel with integrated 4096-level Wacom EMR digitizer and titanium grade 2 perimeter enclosure.',
            sourceDoc: 'Samsung Galaxy S24 Ultra Service Manual',
            pageNumber: 22,
          },
        ],
      },
      {
        brand: 'Apple',
        modelName: 'iPad Pro 12.9 M2',
        category: 'tablets',
        officialSpecs: {
          maxRamGb: 16,
          ramSlotsCount: 0,
          ramUpgradeable: false,
          ramType: 'Unified Memory',
          storageSlots: 0,
          storageUpgradeable: false,
          displaySpecs: { panelType: 'Liquid Retina XDR Mini-LED', refreshRateHz: 120, peakBrightnessNits: 1600, colorGamut: 'P3' },
          cpuFamily: 'Apple M2 (8-core CPU, 10-core GPU)',
          tdpWatts: 20,
          powerAdapterWattage: 30,
          originalMSRP: 1099,
          osCompatibility: ['iPadOS 16', 'iPadOS 17', 'iPadOS 18'],
          repairabilityScore: 5.5,
          knownRecallsOrAdvisories: ['Magic Keyboard pins require periodic contact cleaning to ensure reliable power passthrough.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'Mini-LED Backlight Architecture',
            excerpt: '10,000 custom mini-LEDs grouped in 2,596 full-array local dimming zones delivering 1,000,000:1 contrast ratio.',
            sourceDoc: 'Apple iPad Pro Technical Manual',
            pageNumber: 8,
          },
        ],
      },
      {
        brand: 'Sony',
        modelName: 'WH-1000XM5',
        category: 'audio',
        officialSpecs: {
          maxRamGb: 0,
          ramSlotsCount: 0,
          ramUpgradeable: false,
          ramType: 'Integrated DSP Buffer',
          storageSlots: 0,
          storageUpgradeable: false,
          displaySpecs: { panelType: 'None', refreshRateHz: 0, peakBrightnessNits: 0, colorGamut: 'None' },
          cpuFamily: 'Integrated Processor V1 + HD Noise Cancelling Processor QN1',
          tdpWatts: 3,
          powerAdapterWattage: 10,
          originalMSRP: 399,
          osCompatibility: ['Sony Headphones Connect iOS & Android', 'Windows Swift Pair'],
          repairabilityScore: 7.0,
          knownRecallsOrAdvisories: ['Supports 30-hour playback with ANC active; 3 minutes USB-PD quick charge yields 3 hours listening.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'Noise Cancelling and Driver System Specifications',
            excerpt: 'Equipped with specially designed 30mm carbon fiber composite dome drivers and 8 microphones managed by dual processors for precision active noise cancellation.',
            sourceDoc: 'Sony WH-1000XM5 Operating Instructions and Reference Guide',
            pageNumber: 14,
          },
        ],
      },
      {
        brand: 'Apple',
        modelName: 'Apple Watch Ultra 2',
        category: 'smartwatches',
        officialSpecs: {
          maxRamGb: 2,
          ramSlotsCount: 0,
          ramUpgradeable: false,
          ramType: 'Embedded SiP',
          storageSlots: 0,
          storageUpgradeable: false,
          displaySpecs: { panelType: 'Always-On Retina OLED Flat Sapphire Crystal', refreshRateHz: 60, peakBrightnessNits: 3000, colorGamut: 'P3' },
          cpuFamily: 'Apple S9 SiP 64-bit dual-core',
          tdpWatts: 2,
          powerAdapterWattage: 5,
          originalMSRP: 799,
          osCompatibility: ['watchOS 10', 'watchOS 11'],
          repairabilityScore: 6.0,
          knownRecallsOrAdvisories: ['Rated 100m water resistance per ISO standard 22810 and EN13319 dive computer certification.'],
        },
        curatedManualExcerpts: [
          {
            sectionTitle: 'Titanium Enclosure and Battery Longevity',
            excerpt: '49mm aerospace-grade titanium case with dual-frequency GPS (L1 and L5). Delivers up to 36 hours regular usage and 72 hours in Low Power Mode on a single magnetic inductive charge.',
            sourceDoc: 'Apple Watch Ultra 2 Technical Whitepaper',
            pageNumber: 7,
          },
        ],
      },
    ];

    const createdSpecs = [];
    for (const specItem of specsData) {
      const textToEmbed = `${specItem.brand} ${specItem.modelName} ${specItem.category} ${specItem.officialSpecs.cpuFamily}`;
      const embedding = await getEmbedding(textToEmbed);
      const spec = await Specification.create({
        ...specItem,
        embedding,
      });
      createdSpecs.push(spec);

      // Create SpecificationChunks for genuine vector RAG retrieval
      let chunkIdx = 0;
      for (const excerpt of specItem.curatedManualExcerpts) {
        const chunkText = `${excerpt.sectionTitle}: ${excerpt.excerpt} (Source: ${excerpt.sourceDoc})`;
        const chunkEmbedding = await getEmbedding(chunkText);
        await SpecificationChunk.create({
          specificationId: spec._id,
          brand: spec.brand,
          modelName: spec.modelName,
          sectionTitle: excerpt.sectionTitle,
          sourceDoc: excerpt.sourceDoc,
          pageNumber: excerpt.pageNumber || 1,
          chunkIndex: chunkIdx++,
          pageContent: excerpt.excerpt,
          embedding: chunkEmbedding,
        });
      }
    }

    console.log(`[Seeder] Seeded ${createdSpecs.length} manufacturer specifications with vector chunks.`);

    // 3. Create 46 Diverse Realistic Listings
    console.log('[Seeder] Creating 46 presentation-grade listings across 7 categories...');

    const listingsData = [
      // CATEGORY: LAPTOPS (8 total: 5 active, 1 pending, 1 suspended, 1 sold)
      {
        title: 'Lenovo ThinkPad T14 Gen 3 AMD (Ryzen 7 PRO, 16GB, 512GB SSD) Mint',
        description: 'Immaculate enterprise ThinkPad with Ryzen 7 PRO 6850U. Keyboard and trackpad are pristine. Includes original 65W GaN USB-C charger and remaining on-site Lenovo premier warranty.',
        category: 'laptops',
        brand: 'Lenovo',
        modelName: 'ThinkPad T14 Gen 3 AMD',
        price: 780,
        condition: 'excellent',
        structuredSpecs: { cpu: 'AMD Ryzen 7 PRO 6850U', ramGb: 16, ramType: 'DDR5-4800', storageGb: 512, storageType: 'NVMe SSD', gpu: 'Radeon 680M Integrated', screenSizeInches: 14, resolution: '1920x1200 FHD+ IPS', batteryCapacityWh: 52.5, releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 94, batteryCycleCount: 46, screenCondition: 'Flawless, no dead pixels or keyboard marks', bodyCondition: 'Minor hairline scuff on bottom edge', functionalDefects: [], repairHistory: 'Original motherboard, clean corporate lease return', originalAccessories: ['Original 65W Lenovo GaN Charger', 'Laptop sleeve'], sellerConditionSummary: 'Corporate surplus unit, thoroughly sanitized and diagnostics run.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800'],
      },
      {
        title: 'Apple MacBook Pro 14 M2 Pro (16GB RAM, 512GB SSD, Space Gray) Pristine',
        description: 'Personal creative rig in immaculate condition. Used exclusively in clamshell mode on a desk. Zero dents, screen has zero coating delamination. Box and original MagSafe cable included.',
        category: 'laptops',
        brand: 'Apple',
        modelName: 'MacBook Pro 14 M2 Pro',
        price: 1350,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Apple M2 Pro (10-core)', ramGb: 16, ramType: 'Unified Memory', storageGb: 512, storageType: 'Apple Integrated NVMe', gpu: '16-core GPU', screenSizeInches: 14.2, resolution: '3024x1964 Liquid Retina XDR', batteryCapacityWh: 70, releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 98, batteryCycleCount: 38, screenCondition: 'Pristine, 100% spotless', bodyCondition: 'Pristine, no corner dings', functionalDefects: [], repairHistory: 'No repairs ever opened', originalAccessories: ['Original 67W Apple USB-C Power Adapter', 'Braided Space Gray MagSafe 3 Cable', 'Original Box'], sellerConditionSummary: 'Bought directly from Apple Store, upgraded to M3 Max recently.' },
        status: 'active',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'],
      },
      {
        title: 'Dell XPS 15 9520 (Intel i7-12700H, 32GB RAM, 1TB SSD, 3.5K OLED)',
        description: 'High performance mobile workstation with stunning 3.5K OLED touch display. Memory upgraded to 32GB DDR5 dual-channel. Handles 4K video rendering and CAD flawlessly.',
        category: 'laptops',
        brand: 'Dell',
        modelName: 'XPS 15 9520',
        price: 1150,
        condition: 'good',
        structuredSpecs: { cpu: 'Intel Core i7-12700H', ramGb: 32, ramType: 'DDR5-4800 SODIMM', storageGb: 1000, storageType: 'PCIe Gen4 NVMe SSD', gpu: 'NVIDIA RTX 3050 Ti 4GB', screenSizeInches: 15.6, resolution: '3456x2160 3.5K OLED Touch', batteryCapacityWh: 86, releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 88, batteryCycleCount: 142, screenCondition: 'Vibrant OLED, zero burn-in or dead subpixels', bodyCondition: 'Light surface scratches on aluminum lid', functionalDefects: [], repairHistory: 'RAM upgraded from 16GB to 32GB with Crucial DDR5 kit', originalAccessories: ['Original 130W Dell USB-C Adapter'], sellerConditionSummary: 'Reliable engineering laptop, freshly pasted with Honeywell PTM7950.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
      },
      {
        title: 'Apple MacBook Air M2 13.6-inch (8GB RAM, 256GB SSD, Midnight)',
        description: 'Ultra-thin lightweight MacBook Air in Midnight. Ideal for students and office tasks. Minor wear on USB-C edges characteristic of Midnight finish.',
        category: 'laptops',
        brand: 'Apple',
        modelName: 'MacBook Air M2',
        price: 690,
        condition: 'good',
        structuredSpecs: { cpu: 'Apple M2 (8-core)', ramGb: 8, ramType: 'Unified Memory', storageGb: 256, storageType: 'Integrated NVMe', gpu: '8-core GPU', screenSizeInches: 13.6, resolution: '2560x1664 Liquid Retina', batteryCapacityWh: 52.6, releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: null, batteryCycleCount: null, screenCondition: 'Clean, no scratches', bodyCondition: 'Minor paint anodization wear on MagSafe and left USB-C port rim', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original 30W Apple Power Adapter', 'Midnight MagSafe Cable'], sellerConditionSummary: 'Light college note-taking use, factory reset with macOS Sonoma.' },
        status: 'active',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800'],
      },
      {
        title: 'Lenovo ThinkPad X1 Carbon Gen 10 (i7-1260P, 16GB RAM, 512GB SSD)',
        description: 'Flagship business ultrabook weighing just 1.12kg. Carbon fiber weave lid, LTE WWAN cellular capable, vibrant 400-nit low power panel.',
        category: 'laptops',
        brand: 'Lenovo',
        modelName: 'ThinkPad X1 Carbon Gen 10',
        price: 920,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Intel Core i7-1260P', ramGb: 16, ramType: 'LPDDR5-5200 Soldered', storageGb: 512, storageType: 'PCIe Gen4 NVMe', gpu: 'Intel Iris Xe', screenSizeInches: 14, resolution: '1920x1200 Low Power IPS', batteryCapacityWh: 57, releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 93, batteryCycleCount: 62, screenCondition: 'Pristine matte anti-glare display', bodyCondition: 'Soft-touch coating in superb shape, no shiny keycaps', functionalDefects: [], repairHistory: 'None', originalAccessories: ['65W Slim Tip Adapter with USB-C dongle'], sellerConditionSummary: 'Executive travel unit, pristine keyboard and chassis.' },
        status: 'active',
        sellerId: seller4._id,
        images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800'],
      },
      {
        title: 'Dell Latitude 7420 (i5-1145G7, 16GB RAM, 256GB SSD) - Pending Verification',
        description: 'Clean corporate Latitude ultrabook submitted for review. Thunderbolt 4 ports, infrared Windows Hello webcam.',
        category: 'laptops',
        brand: 'Dell',
        modelName: 'Latitude 7420',
        price: 420,
        condition: 'good',
        structuredSpecs: { cpu: 'Intel Core i5-1145G7', ramGb: 16, ramType: 'LPDDR4x-4266', storageGb: 256, storageType: 'NVMe SSD', gpu: 'Intel Iris Xe', screenSizeInches: 14, resolution: '1920x1080 FHD IPS', batteryCapacityWh: 63, releaseYear: 2021 },
        conditionDisclosures: { batteryHealthPct: 86, batteryCycleCount: 110, screenCondition: 'Very clean', bodyCondition: 'Minor edge scuffs', functionalDefects: [], repairHistory: 'None', originalAccessories: ['65W Dell Type-C Adapter'], sellerConditionSummary: 'Pending review by moderation staff.' },
        status: 'pending',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800'],
      },
      {
        title: 'HP Spectre x360 14 (Suspended due to unverified battery swelling report)',
        description: '2-in-1 convertible laptop flagged by community review for undisclosed trackpad clicking resistance.',
        category: 'laptops',
        brand: 'HP',
        modelName: 'Spectre x360 14',
        price: 650,
        condition: 'fair',
        structuredSpecs: { cpu: 'Intel Core i7-1165G7', ramGb: 16, ramType: 'LPDDR4x', storageGb: 512, storageType: 'NVMe', gpu: 'Intel Iris Xe', screenSizeInches: 13.5, resolution: '3000x2000 OLED Touch', batteryCapacityWh: 66, releaseYear: 2021 },
        conditionDisclosures: { batteryHealthPct: 74, batteryCycleCount: 310, screenCondition: 'Good touch digitizer', bodyCondition: 'Bottom chassis seam has slight gap', functionalDefects: ['Trackpad hard to click at lower boundary'], repairHistory: 'None', originalAccessories: ['Original Charger'], sellerConditionSummary: 'Chassis flagged for battery swelling safety check.' },
        status: 'suspended',
        moderationNote: 'Suspended by moderator: Inconsistency noted regarding trackpad bulge and battery health disclosures.',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800'],
      },
      {
        title: 'Asus ROG Zephyrus G14 2022 (Ryzen 9, RX 6700S, 16GB, 1TB SSD) - Sold',
        description: 'Sold to local buyer via TechCompanion viewing appointment.',
        category: 'laptops',
        brand: 'ASUS',
        modelName: 'ROG Zephyrus G14',
        price: 850,
        condition: 'excellent',
        structuredSpecs: { cpu: 'AMD Ryzen 9 6900HS', ramGb: 16, ramType: 'DDR5-4800', storageGb: 1000, storageType: 'NVMe', gpu: 'AMD Radeon RX 6700S 8GB', screenSizeInches: 14, resolution: '2560x1600 120Hz', batteryCapacityWh: 76, releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 92, batteryCycleCount: 65, screenCondition: 'Pristine 120Hz panel', bodyCondition: 'White lid clean', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original 240W Brick'], sellerConditionSummary: 'Successfully completed transaction.' },
        status: 'sold',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800'],
      },

      // CATEGORY: CAMERAS (7 total: 5 active, 1 pending, 1 sold)
      {
        title: 'Sony Alpha A7 IV Mirrorless Camera Body (Shutter count: 4,820) Like New',
        description: 'Flawless enthusiast camera body. Sensor is completely spotless with zero dust spots or cleaning streaks. Used for portrait shoots in indoor studio settings.',
        category: 'cameras',
        brand: 'Sony',
        modelName: 'Alpha A7 IV',
        price: 1850,
        condition: 'excellent',
        structuredSpecs: { sensorType: 'Full-Frame BSI-CMOS', megapixels: 33, lensMount: 'Sony E-Mount', shutterCount: 4820, releaseYear: 2021 },
        conditionDisclosures: { screenCondition: 'Tempered glass protector applied since day one', bodyCondition: 'Pristine grip, rubber has zero peeling or white oxidation', functionalDefects: [], repairHistory: 'None, never serviced', originalAccessories: ['Original Sony NP-FZ100 battery', 'Original Sony shoulder strap', 'Body cap', 'Box'], sellerConditionSummary: 'Low mechanical shutter actuations, meticulously cared for.' },
        status: 'active',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'],
      },
      {
        title: 'Fujifilm X-T5 Mirrorless Body (Black, 40MP, Shutter count: 2,140)',
        description: 'Superb 40.2MP retro camera body with tactile dials. IBIS works like magic. Includes two extra OEM NP-W235 batteries and SmallRig L-bracket.',
        category: 'cameras',
        brand: 'Fujifilm',
        modelName: 'X-T5',
        price: 1390,
        condition: 'excellent',
        structuredSpecs: { sensorType: 'APS-C X-Trans CMOS 5 HR', megapixels: 40.2, lensMount: 'Fujifilm X-Mount', shutterCount: 2140, releaseYear: 2022 },
        conditionDisclosures: { screenCondition: 'Flawless 3-way tilt LCD', bodyCondition: 'Zero brassing on top plate or strap lugs', functionalDefects: [], repairHistory: 'None', originalAccessories: ['3x NP-W235 Batteries', 'Dual USB-C Charger', 'SmallRig L-Bracket', 'Retail Packaging'], sellerConditionSummary: 'Barely used secondary travel body.' },
        status: 'active',
        sellerId: seller4._id,
        images: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'],
      },
      {
        title: 'Canon EOS R6 Mark II Mirrorless Body (Shutter: 8,300) Pro Condition',
        description: '24.2MP full frame with incredible 40 fps electronic shutter burst and 6K oversampled video. Hot shoe and dual SD slots tested 100%.',
        category: 'cameras',
        brand: 'Canon',
        modelName: 'EOS R6 Mark II',
        price: 1750,
        condition: 'excellent',
        structuredSpecs: { sensorType: 'Full-Frame CMOS', megapixels: 24.2, lensMount: 'Canon RF', shutterCount: 8300, releaseYear: 2022 },
        conditionDisclosures: { screenCondition: 'Fully articulating screen pristine', bodyCondition: 'Very clean, tiny rub on baseplate', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original LP-E6NH Battery', 'Canon LC-E6 Charger', 'Strap'], sellerConditionSummary: 'Professional wildlife backup camera.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=800'],
      },
      {
        title: 'Sony Alpha A6700 APS-C Body (AI Autofocus, 26MP, Shutter: 3,200)',
        description: 'Compact cinema/stills powerhouse with dedicated AI processing unit. Exceptional 4K 120p video capability.',
        category: 'cameras',
        brand: 'Sony',
        modelName: 'Alpha A6700',
        price: 1080,
        condition: 'excellent',
        structuredSpecs: { sensorType: 'APS-C Exmor R BSI', megapixels: 26, lensMount: 'Sony E-Mount', shutterCount: 3200, releaseYear: 2023 },
        conditionDisclosures: { screenCondition: 'Clean, tempered glass installed', bodyCondition: 'No marks, rubber grip clean', functionalDefects: [], repairHistory: 'None', originalAccessories: ['1x NP-FZ100 Battery', 'Shoulder Strap'], sellerConditionSummary: 'Purchased for a documentary project, no longer needed.' },
        status: 'active',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'],
      },
      {
        title: 'Nikon Z6 II Mirrorless Body (Dual EXPEED 6, Shutter: 12,400)',
        description: 'Dual card slots (CFexpress + SD), robust weather sealing. Sensor cleaned by authorized Nikon service in Jan 2026.',
        category: 'cameras',
        brand: 'Nikon',
        modelName: 'Z6 II',
        price: 1020,
        condition: 'good',
        structuredSpecs: { sensorType: 'Full-Frame BSI-CMOS', megapixels: 24.5, lensMount: 'Nikon Z', shutterCount: 12400, releaseYear: 2020 },
        conditionDisclosures: { screenCondition: 'Clean LCD with minor micro-abrasion unnoticeable when powered on', bodyCondition: 'Minor thumb rest grip wear', functionalDefects: [], repairHistory: 'Routine professional sensor cleaning', originalAccessories: ['Nikon EN-EL15c Battery', 'MH-25a Charger'], sellerConditionSummary: 'Solid street photography workhorse.' },
        status: 'active',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800'],
      },
      {
        title: 'Panasonic Lumix S5 II (Phase Hybrid AF, 24MP) - Pending Review',
        description: 'New generation Lumix with active cooling fan and phase detection AF.',
        category: 'cameras',
        brand: 'Panasonic',
        modelName: 'Lumix S5 II',
        price: 1450,
        condition: 'excellent',
        structuredSpecs: { sensorType: 'Full-Frame CMOS', megapixels: 24.2, lensMount: 'L-Mount', shutterCount: 1900, releaseYear: 2023 },
        conditionDisclosures: { screenCondition: 'Pristine', bodyCondition: 'Pristine', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Battery', 'Charger', 'Box'], sellerConditionSummary: 'Awaiting moderation review.' },
        status: 'pending',
        sellerId: seller4._id,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'],
      },
      {
        title: 'Fujifilm X-T4 Mirrorless Body (Shutter: 22,000, Silver) - Sold',
        description: 'Classic silver Fujifilm with vintage styling, sold to verified local buyer.',
        category: 'cameras',
        brand: 'Fujifilm',
        modelName: 'X-T4',
        price: 890,
        condition: 'good',
        structuredSpecs: { sensorType: 'APS-C X-Trans 4', megapixels: 26.1, lensMount: 'Fujifilm X-Mount', shutterCount: 22000, releaseYear: 2020 },
        conditionDisclosures: { screenCondition: 'Clean', bodyCondition: 'Light corner brassing', functionalDefects: [], repairHistory: 'None', originalAccessories: ['2x Batteries'], sellerConditionSummary: 'Completed sale.' },
        status: 'sold',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'],
      },

      // CATEGORY: SMARTPHONES (7 total: 5 active, 1 pending, 1 suspended)
      {
        title: 'Apple iPhone 15 Pro Max 256GB Natural Titanium (Unlocked, 96% Battery)',
        description: 'Pristine condition flagship with aerospace titanium rail. Clean IMEI, paid off in full, works with any GSM/CDMA carrier worldwide. Screen protector on since unboxing.',
        category: 'smartphones',
        brand: 'Apple',
        modelName: 'iPhone 15 Pro Max',
        price: 920,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Apple A17 Pro 3nm', ramGb: 8, storageGb: 256, storageType: 'NVMe', screenSizeInches: 6.7, resolution: '2796x1290 Super Retina XDR', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 96, batteryCycleCount: 154, screenCondition: 'Spotless, zero scratches under direct light', bodyCondition: 'Titanium frame is immaculate, no drop dents', functionalDefects: [], repairHistory: 'All original Apple components, zero repairs', originalAccessories: ['Braided USB-C Cable', 'Original Box'], sellerConditionSummary: 'Upgraded to 16 Pro Max, device is completely factory unlocked and iCloud signed out.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800'],
      },
      {
        title: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray (Unlocked, 12GB RAM)',
        description: 'Superb condition Android flagship with anti-reflective flat display and integrated S-Pen. All 7 years of Android OS updates supported.',
        category: 'smartphones',
        brand: 'Samsung',
        modelName: 'Galaxy S24 Ultra',
        price: 950,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Snapdragon 8 Gen 3 for Galaxy', ramGb: 12, storageGb: 512, storageType: 'UFS 4.0', screenSizeInches: 6.8, resolution: '3120x1440 Dynamic AMOLED 2X', releaseYear: 2024 },
        conditionDisclosures: { batteryHealthPct: 98, batteryCycleCount: 78, screenCondition: 'Gorilla Armor anti-reflective glass flawless', bodyCondition: 'Pristine, spent life in Spigen case', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original S-Pen', 'USB-C to USB-C Cable', 'Retail Box'], sellerConditionSummary: 'Flawless condition, clean Samsung Knox counter (0x0).' },
        status: 'active',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800'],
      },
      {
        title: 'Google Pixel 8 Pro 128GB Bay Blue (Google Tensor G3, 12GB RAM)',
        description: 'Stunning matte Bay Blue finish. Best-in-class computational photography with thermometer sensor and pure Android experience.',
        category: 'smartphones',
        brand: 'Google',
        modelName: 'Pixel 8 Pro',
        price: 580,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Google Tensor G3', ramGb: 12, storageGb: 128, storageType: 'UFS 3.1', screenSizeInches: 6.7, resolution: '2992x1344 Super Actua Display 120Hz', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 95, batteryCycleCount: 92, screenCondition: 'Pristine, no scratches', bodyCondition: 'Camera visor visor has zero scuffs, matte glass flawless', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Quick Switch Adapter', 'USB-C Cable', 'Box'], sellerConditionSummary: 'Clean unlocked bootloader, official Google software.' },
        status: 'active',
        sellerId: seller4._id,
        images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800'],
      },
      {
        title: 'Apple iPhone 14 Pro 128GB Deep Purple (Unlocked, Dynamic Island)',
        description: 'Eye-catching Deep Purple 14 Pro with Always-On display and 48MP main camera sensor. Compact form factor.',
        category: 'smartphones',
        brand: 'Apple',
        modelName: 'iPhone 14 Pro',
        price: 640,
        condition: 'good',
        structuredSpecs: { cpu: 'Apple A16 Bionic', ramGb: 6, storageGb: 128, storageType: 'NVMe', screenSizeInches: 6.1, resolution: '2556x1179 OLED 120Hz', releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 87, batteryCycleCount: 260, screenCondition: 'Clean, light surface micro-wear only visible when angled under sunlight', bodyCondition: 'Stainless steel band has slight case polish marks', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Lightning to USB-C cable'], sellerConditionSummary: 'Solid dependable phone with great battery health remaining.' },
        status: 'active',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800'],
      },
      {
        title: 'Samsung Galaxy Z Flip 5 256GB Mint (Snapdragon 8 Gen 2, Flex Window)',
        description: 'Foldable phone with 3.4-inch Flex Window outer display. Zero crease fingernail marks, hinge closes completely flush.',
        category: 'smartphones',
        brand: 'Samsung',
        modelName: 'Galaxy Z Flip 5',
        price: 490,
        condition: 'good',
        structuredSpecs: { cpu: 'Snapdragon 8 Gen 2', ramGb: 8, storageGb: 256, storageType: 'UFS 4.0', screenSizeInches: 6.7, resolution: 'FHD+ Dynamic AMOLED 2X 120Hz', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 92, batteryCycleCount: 130, screenCondition: 'Factory screen protector firmly attached without bubbling', bodyCondition: 'Hinge has minor protective film peeling on edge', functionalDefects: [], repairHistory: 'None', originalAccessories: ['USB-C Cable'], sellerConditionSummary: 'Fun compact foldable, hinge is tight and crisp.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800'],
      },
      {
        title: 'OnePlus 12 512GB Silky Black (16GB RAM, Snapdragon 8 Gen 3) - Pending',
        description: 'Fast charging flagship submitted for review. 5400mAh battery with 80W SuperVOOC charger.',
        category: 'smartphones',
        brand: 'OnePlus',
        modelName: 'OnePlus 12',
        price: 590,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Snapdragon 8 Gen 3', ramGb: 16, storageGb: 512, storageType: 'UFS 4.0', screenSizeInches: 6.82, resolution: '3168x1440 ProXDR 120Hz', releaseYear: 2024 },
        conditionDisclosures: { batteryHealthPct: 99, batteryCycleCount: 22, screenCondition: 'Pristine', bodyCondition: 'Flawless', functionalDefects: [], repairHistory: 'None', originalAccessories: ['80W SuperVOOC Power Brick', 'Red Cable'], sellerConditionSummary: 'Pending review.' },
        status: 'pending',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800'],
      },
      {
        title: 'Apple iPhone 13 Pro Max (Suspended due to unverified aftermarket display replacement)',
        description: 'Device suspended after buyer report indicated non-genuine display message in iOS settings.',
        category: 'smartphones',
        brand: 'Apple',
        modelName: 'iPhone 13 Pro Max',
        price: 450,
        condition: 'fair',
        structuredSpecs: { cpu: 'Apple A15 Bionic', ramGb: 6, storageGb: 128, storageType: 'NVMe', screenSizeInches: 6.7, resolution: 'FHD+ OLED', releaseYear: 2021 },
        conditionDisclosures: { batteryHealthPct: 82, batteryCycleCount: 420, screenCondition: 'Aftermarket panel installed', bodyCondition: 'Edges scuffed', functionalDefects: ['True Tone disabled due to screen swap'], repairHistory: 'Third party screen swap', originalAccessories: [], sellerConditionSummary: 'Suspended for undisclosed aftermarket screen.' },
        status: 'suspended',
        moderationNote: 'Suspended by moderator: Third-party screen replacement omitted from initial declaration.',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800'],
      },

      // CATEGORY: GAMING (7 total: 5 active, 1 pending, 1 sold)
      {
        title: 'Valve Steam Deck OLED 512GB Handheld Gaming PC (Flawless 90Hz HDR)',
        description: 'Latest OLED model with improved thermal exhaust, quieter fan, and gorgeous 90Hz HDR panel. Includes original carrying case, power supply, and 256GB high-speed microSD card.',
        category: 'gaming',
        brand: 'Valve',
        modelName: 'Steam Deck OLED 512GB',
        price: 470,
        condition: 'excellent',
        structuredSpecs: { cpu: '6nm AMD APU 4-core 8-thread', ramGb: 16, ramType: 'LPDDR5-6400', storageGb: 512, storageType: 'NVMe M.2 2230', dockIncluded: false, screenSizeInches: 7.4, resolution: '1280x800 OLED 90Hz', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 99, batteryCycleCount: 24, screenCondition: 'Immaculate OLED, zero dead pixels or touch deadzones', bodyCondition: 'Thumbsticks have zero rubber wear, trackpads tactile', functionalDefects: [], repairHistory: 'Never opened or modified', originalAccessories: ['Official Valve Carrying Case', '45W USB-C Charger', 'Microfiber Cloth'], sellerConditionSummary: 'Played through 2 indie games, practically brand new.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800'],
      },
      {
        title: 'ASUS ROG Ally Z1 Extreme 512GB Handheld (120Hz VRR, 16GB RAM)',
        description: 'Powerful Windows handheld running full PC game libraries. Features variable refresh rate (VRR) display for buttery smooth gameplay. Upgraded 90-degree USB-C adapter.',
        category: 'gaming',
        brand: 'ASUS',
        modelName: 'ROG Ally Z1 Extreme',
        price: 430,
        condition: 'good',
        structuredSpecs: { cpu: 'AMD Ryzen Z1 Extreme (8-core/16-thread)', ramGb: 16, ramType: 'LPDDR5-6400', storageGb: 512, storageType: 'PCIe 4.0 NVMe 2230', dockIncluded: false, screenSizeInches: 7, resolution: '1920x1080 120Hz FreeSync Premium', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 94, batteryCycleCount: 52, screenCondition: 'Pristine 120Hz IPS', bodyCondition: 'Minor surface discoloration on white back grips', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original 65W ASUS GaN Charger', 'Cardboard Stand'], sellerConditionSummary: 'Great portable PC for AAA titles like Cyberpunk.' },
        status: 'active',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800'],
      },
      {
        title: 'Sony PlayStation 5 Disc Edition (Horizon Forbidden West Bundle, 825GB)',
        description: 'CFI-1115A revised heatsink model. Ultra quiet fan, zero coil whine under load. DualSense controller has zero stick drift (hall effect recalibrated).',
        category: 'gaming',
        brand: 'Sony',
        modelName: 'PlayStation 5 Disc Edition',
        price: 360,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Custom AMD Zen 2 8-core', ramGb: 16, ramType: 'GDDR6', storageGb: 825, storageType: 'Custom NVMe SSD', dockIncluded: true, releaseYear: 2021 },
        conditionDisclosures: { screenCondition: 'N/A (Console)', bodyCondition: 'White faceplates clean, gloss middle section has typical micro-scratches', functionalDefects: [], repairHistory: 'Cleaned of all internal dust using designated vacuum ports', originalAccessories: ['Original DualSense White Controller', 'Vertical Stand', 'HDMI 2.1 Cable', 'Power Cable'], sellerConditionSummary: 'Home console from adult non-smoking environment.' },
        status: 'active',
        sellerId: seller4._id,
        images: ['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800'],
      },
      {
        title: 'Nintendo Switch OLED Model White (64GB with Pro Controller)',
        description: '7-inch deep contrast OLED display. Joy-Cons show zero drift. Includes official Nintendo Switch Pro Controller and 128GB Samsung EVO Select microSD card.',
        category: 'gaming',
        brand: 'Nintendo',
        modelName: 'Nintendo Switch OLED',
        price: 260,
        condition: 'excellent',
        structuredSpecs: { cpu: 'NVIDIA Tegra X1+', ramGb: 4, ramType: 'LPDDR4', storageGb: 64, storageType: 'eMMC', dockIncluded: true, screenSizeInches: 7, resolution: '1280x720 OLED (1080p Docked)', releaseYear: 2021 },
        conditionDisclosures: { batteryHealthPct: 96, batteryCycleCount: 45, screenCondition: 'Glass screen protector installed, underlying panel spotless', bodyCondition: 'Dock and console in near-mint condition', functionalDefects: [], repairHistory: 'None', originalAccessories: ['White OLED Dock with LAN port', 'Original AC Adapter', 'Joy-Con Grip', 'Nintendo Switch Pro Controller', '128GB MicroSD'], sellerConditionSummary: 'Complete premium Nintendo setup ready to play.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800'],
      },
      {
        title: 'Lenovo Legion Go 512GB (8.8-inch QHD 144Hz, Detachable TrueStrike Controllers)',
        description: 'Huge 8.8-inch display handheld with integrated kickstand and FPS mouse mode base. Excellent for strategy games and emulation.',
        category: 'gaming',
        brand: 'Lenovo',
        modelName: 'Legion Go',
        price: 510,
        condition: 'excellent',
        structuredSpecs: { cpu: 'AMD Ryzen Z1 Extreme', ramGb: 16, ramType: 'LPDDR5X-7500', storageGb: 512, storageType: 'PCIe 4.0 NVMe', dockIncluded: false, screenSizeInches: 8.8, resolution: '2560x1600 144Hz IPS', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 97, batteryCycleCount: 30, screenCondition: 'Pristine 144Hz screen', bodyCondition: 'No marks, controllers click firmly into place', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original Case', 'Controller Base', '65W Power Adapter'], sellerConditionSummary: 'Hardly used, prefer desktop gaming.' },
        status: 'active',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800'],
      },
      {
        title: 'Nintendo Switch Lite Coral (32GB Handheld) - Pending Review',
        description: 'Ultra portable dedicated handheld in Coral pink. Lightweight and compact.',
        category: 'gaming',
        brand: 'Nintendo',
        modelName: 'Nintendo Switch Lite',
        price: 130,
        condition: 'good',
        structuredSpecs: { cpu: 'NVIDIA Tegra X1', ramGb: 4, storageGb: 32, storageType: 'eMMC', dockIncluded: false, screenSizeInches: 5.5, resolution: '720p LCD', releaseYear: 2019 },
        conditionDisclosures: { batteryHealthPct: 88, batteryCycleCount: 110, screenCondition: 'Clean LCD', bodyCondition: 'Minor surface scuffs on corner', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original AC Adapter'], sellerConditionSummary: 'Pending staff approval.' },
        status: 'pending',
        sellerId: seller4._id,
        images: ['https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800'],
      },
      {
        title: 'Microsoft Xbox Series X 1TB Console - Sold',
        description: 'Completed local safe-zone exchange at public library safe zone.',
        category: 'gaming',
        brand: 'Microsoft',
        modelName: 'Xbox Series X',
        price: 340,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Custom AMD Zen 2 8-core', ramGb: 16, storageGb: 1000, storageType: 'NVMe', dockIncluded: false, releaseYear: 2020 },
        conditionDisclosures: { screenCondition: 'N/A', bodyCondition: 'Clean monolith tower', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Wireless Controller', 'Ultra High Speed HDMI Cable'], sellerConditionSummary: 'Sold to buyer.' },
        status: 'sold',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800'],
      },

      // CATEGORY: TABLETS (6 total: 5 active, 1 sold)
      {
        title: 'Apple iPad Pro 12.9 M2 128GB Wi-Fi Space Gray (Mini-LED Liquid Retina XDR)',
        description: 'Creative powerhouse with M2 chip and breathtaking Mini-LED screen with 1,000,000:1 contrast ratio. Includes Apple Pencil 2 and Magnetic Folio.',
        category: 'tablets',
        brand: 'Apple',
        modelName: 'iPad Pro 12.9 M2',
        price: 790,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Apple M2 (8-core CPU, 10-core GPU)', ramGb: 8, storageGb: 128, storageType: 'NVMe', screenSizeInches: 12.9, resolution: '2732x2048 Mini-LED 120Hz', batteryCapacityWh: 40.88, releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 97, batteryCycleCount: 56, screenCondition: 'Spotless, paper-like matte screen protector applied for illustration', bodyCondition: 'Zero bends, enclosure is 100% straight and true', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Apple Pencil (2nd Generation)', 'Magnetic Smart Folio Case', 'Original 20W Charger and Cable'], sellerConditionSummary: 'Used for digital illustration, exceptional battery life.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'],
      },
      {
        title: 'Samsung Galaxy Tab S9 Ultra 256GB (14.6-inch Dynamic AMOLED 2X, S-Pen)',
        description: 'Colossal 14.6-inch OLED tablet with IP68 water resistance. Ideal for multi-window productivity with DeX mode.',
        category: 'tablets',
        brand: 'Samsung',
        modelName: 'Galaxy Tab S9 Ultra',
        price: 760,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Snapdragon 8 Gen 2 for Galaxy', ramGb: 12, storageGb: 256, storageType: 'UFS 4.0', screenSizeInches: 14.6, resolution: '2960x1848 120Hz AMOLED', batteryCapacityWh: 43.1, releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 98, batteryCycleCount: 34, screenCondition: 'Flawless 14.6-inch glass', bodyCondition: 'Aluminum back clean', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Official S-Pen', 'Book Cover Keyboard Slim', 'USB-C Cable'], sellerConditionSummary: 'Spectacular media tablet.' },
        status: 'active',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800'],
      },
      {
        title: 'Apple iPad Air 5th Gen M1 64GB Blue (Apple Silicon, Touch ID)',
        description: 'Lightweight M1 iPad Air in striking Blue. Supports 2nd gen Apple Pencil and Magic Keyboard.',
        category: 'tablets',
        brand: 'Apple',
        modelName: 'iPad Air 5th Gen M1',
        price: 390,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Apple M1 (8-core)', ramGb: 8, storageGb: 64, storageType: 'NVMe', screenSizeInches: 10.9, resolution: '2360x1640 Liquid Retina', batteryCapacityWh: 28.6, releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 94, batteryCycleCount: 72, screenCondition: 'Pristine, zero hairline scratches', bodyCondition: 'Pristine', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original 20W USB-C Charger', 'Braided Cable'], sellerConditionSummary: 'Compact powerhouse for reading and note taking.' },
        status: 'active',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'],
      },
      {
        title: 'Apple iPad mini 6th Gen 64GB Starlight (A15 Bionic, Compact 8.3-inch)',
        description: 'Pocketable iPad with USB-C and Apple Pencil 2 magnetic wireless charging. One-handed reading dream.',
        category: 'tablets',
        brand: 'Apple',
        modelName: 'iPad mini 6th Gen',
        price: 340,
        condition: 'good',
        structuredSpecs: { cpu: 'Apple A15 Bionic', ramGb: 4, storageGb: 64, storageType: 'NVMe', screenSizeInches: 8.3, resolution: '2266x1488 Liquid Retina', batteryCapacityWh: 19.3, releaseYear: 2021 },
        conditionDisclosures: { batteryHealthPct: 90, batteryCycleCount: 128, screenCondition: 'Clean, micro-scuffs on bezel edge only', bodyCondition: 'Minor corner bump on upper right', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original 20W Adapter', 'Cable', 'Folio Cover'], sellerConditionSummary: 'Handy e-reader and portable tablet.' },
        status: 'active',
        sellerId: seller4._id,
        images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'],
      },
      {
        title: 'Microsoft Surface Pro 9 (Intel i5-1235U, 8GB RAM, 256GB SSD) with Type Cover',
        description: '2-in-1 Windows tablet with 120Hz PixelSense Flow touchscreen and integrated kickstand. Includes Signature Type Cover keyboard.',
        category: 'tablets',
        brand: 'Microsoft',
        modelName: 'Surface Pro 9',
        price: 580,
        condition: 'good',
        structuredSpecs: { cpu: 'Intel Core i5-1235U', ramGb: 8, storageGb: 256, storageType: 'Replaceable M.2 2230 SSD', screenSizeInches: 13, resolution: '2880x1920 120Hz PixelSense', batteryCapacityWh: 47.7, releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 91, batteryCycleCount: 88, screenCondition: 'Pristine 120Hz glass', bodyCondition: 'Platinum anodized back has minor marks', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Surface Signature Type Cover (Alcantara)', '65W Surface Connect Power Supply'], sellerConditionSummary: 'Versatile Windows tablet for school and office work.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800'],
      },
      {
        title: 'Apple iPad 10th Gen 64GB Silver - Sold',
        description: 'Modern redesigned entry iPad sold through platform appointment.',
        category: 'tablets',
        brand: 'Apple',
        modelName: 'iPad 10th Gen',
        price: 260,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Apple A14 Bionic', ramGb: 4, storageGb: 64, storageType: 'eMMC', screenSizeInches: 10.9, resolution: '2360x1640 Liquid Retina', batteryCapacityWh: 28.6, releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 96, batteryCycleCount: 42, screenCondition: 'Clean', bodyCondition: 'Clean', functionalDefects: [], repairHistory: 'None', originalAccessories: ['20W Charger'], sellerConditionSummary: 'Sold successfully.' },
        status: 'sold',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'],
      },

      // CATEGORY: AUDIO (6 total: 5 active, 1 pending)
      {
        title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones (Black, 30h Battery)',
        description: 'Industry-leading noise cancelling over-ear headphones. Superb plush synthetic leather ear cushions with zero flaking. Includes original hard zippered case and 3.5mm cable.',
        category: 'audio',
        brand: 'Sony',
        modelName: 'WH-1000XM5',
        price: 240,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Sony V1 + QN1 Processor', batteryCapacityWh: 3.8, releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 98, batteryCycleCount: 35, screenCondition: 'N/A (Headphones)', bodyCondition: 'Pristine matte black finish, zero shine on earcups', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original Sony Hard Shell Case', 'Gold-plated 3.5mm Audio Cable', 'USB-A to USB-C Cable'], sellerConditionSummary: 'Gently used on 3 flights, ear pads sanitized thoroughly.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
      },
      {
        title: 'Apple AirPods Max Space Gray with Smart Case (Lightning, Pristine Mesh)',
        description: 'Premium computational audio headphones with anodized aluminum ear cups and breathable knit mesh canopy. Zero canopy sag.',
        category: 'audio',
        brand: 'Apple',
        modelName: 'AirPods Max',
        price: 360,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Dual Apple H1 Headphone Chips', releaseYear: 2020 },
        conditionDisclosures: { batteryHealthPct: 93, batteryCycleCount: 68, screenCondition: 'N/A', bodyCondition: 'Aluminum cups pristine with silicone covers used from new', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Smart Case', 'Lightning to USB-C Cable', 'Silicone Cup Protectors'], sellerConditionSummary: 'Pristine condition, ear cushions freshly cleaned.' },
        status: 'active',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800'],
      },
      {
        title: 'Bose QuietComfort Ultra Headphones (Black, Immersive Audio)',
        description: 'World-class comfort with Bose spatialized Immersive Audio and CustomTune technology. Folds flat into included carrying case.',
        category: 'audio',
        brand: 'Bose',
        modelName: 'QuietComfort Ultra',
        price: 270,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Qualcomm S5 Gen 2 Audio SoC', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 97, batteryCycleCount: 28, screenCondition: 'N/A', bodyCondition: 'Zero signs of wear, headband cushions soft and clean', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Carry Case', 'Audio Cable', 'USB-C Cable'], sellerConditionSummary: 'Unbeatable comfort for long work sessions.' },
        status: 'active',
        sellerId: seller4._id,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
      },
      {
        title: 'Apple AirPods Pro 2nd Gen with USB-C MagSafe Case (Active Noise Cancellation)',
        description: 'Latest USB-C edition with H2 chip, Adaptive Audio, and Precision Finding speaker in case.',
        category: 'audio',
        brand: 'Apple',
        modelName: 'AirPods Pro 2 USB-C',
        price: 155,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Apple H2 Chip', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 96, batteryCycleCount: 45, screenCondition: 'N/A', bodyCondition: 'Charging case in silicone protector, zero scuffs', functionalDefects: [], repairHistory: 'None', originalAccessories: ['4 Pairs Silicone Ear Tips (XS, S, M, L)', 'Braided USB-C Cable', 'Original Box'], sellerConditionSummary: 'Ear tips sanitized, comes with unused spare tips.' },
        status: 'active',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800'],
      },
      {
        title: 'Sennheiser Momentum 4 Wireless (White/Grey, 60-Hour Battery Beast)',
        description: 'Audiophile-grade 42mm transducer system with staggering 60-hour battery life on a single charge. AptX Adaptive support.',
        category: 'audio',
        brand: 'Sennheiser',
        modelName: 'Momentum 4 Wireless',
        price: 195,
        condition: 'good',
        structuredSpecs: { cpu: 'Sennheiser Audiophile DSP', releaseYear: 2022 },
        conditionDisclosures: { batteryHealthPct: 95, batteryCycleCount: 38, screenCondition: 'N/A', bodyCondition: 'Fabric headband clean, minor discoloration on underside', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Hard Case', 'Airplane Adapter', 'Audio Cable', 'Charging Cable'], sellerConditionSummary: 'Warm rich soundstage with incredible endurance.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
      },
      {
        title: 'Sony WF-1000XM5 Wireless Earbuds (Black, Dual Processor) - Pending Review',
        description: 'Flagship compact earbuds with glossy sides and polyurethane foam tips.',
        category: 'audio',
        brand: 'Sony',
        modelName: 'WF-1000XM5',
        price: 160,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Sony V2 Processor', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 98, batteryCycleCount: 20, screenCondition: 'N/A', bodyCondition: 'Pristine', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Charging Case', 'All Ear Tips', 'Box'], sellerConditionSummary: 'Pending staff approval.' },
        status: 'pending',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800'],
      },

      // CATEGORY: SMARTWATCHES (5 total: 4 active, 1 suspended)
      {
        title: 'Apple Watch Ultra 2 49mm Titanium with Blue Ocean Band (Cellular, 99% Battery)',
        description: 'Rugged dive and mountaineering watch with 3,000 nits flat sapphire crystal display. Dual-frequency L1+L5 GPS and action button.',
        category: 'smartwatches',
        brand: 'Apple',
        modelName: 'Apple Watch Ultra 2',
        price: 580,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Apple S9 SiP', storageGb: 64, screenSizeInches: 1.92, resolution: '410x502 OLED Always-On', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 99, batteryCycleCount: 32, screenCondition: 'Flat sapphire glass 100% flawless', bodyCondition: 'Grade 2 titanium edge is pristine, zero gouges', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Authentic Apple Blue Ocean Band', 'Braided Magnetic Fast Charger', 'Original Ultra Box'], sellerConditionSummary: 'Worn casually at desk, battery health is at 99%.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
      },
      {
        title: 'Samsung Galaxy Watch 6 Classic 47mm Black (Rotating Bezel, Sapphire Crystal)',
        description: 'Stainless steel smartwatch with the beloved physical rotating bezel. Body composition BIA sensor and ECG.',
        category: 'smartwatches',
        brand: 'Samsung',
        modelName: 'Galaxy Watch 6 Classic',
        price: 190,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Exynos W930 dual-core', ramGb: 2, storageGb: 16, screenSizeInches: 1.47, resolution: '480x480 Super AMOLED', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 97, batteryCycleCount: 46, screenCondition: 'Sapphire crystal spotless', bodyCondition: 'Stainless steel rotating bezel clicks smoothly with zero wobble', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Original Hybrid Leather Band', 'Fast Wireless Charger Puck'], sellerConditionSummary: 'Classic design, works seamlessly with Galaxy and Android phones.' },
        status: 'active',
        sellerId: seller2._id,
        images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800'],
      },
      {
        title: 'Apple Watch Series 9 45mm Midnight Aluminum (GPS, S9 Chip, Double Tap)',
        description: 'Fast S9 processor with on-device Siri and Double Tap gesture control. 2,000 nits edge-to-edge display.',
        category: 'smartwatches',
        brand: 'Apple',
        modelName: 'Apple Watch Series 9',
        price: 270,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Apple S9 SiP', storageGb: 64, screenSizeInches: 1.77, resolution: '396x484 OLED Always-On', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 96, batteryCycleCount: 58, screenCondition: 'Ion-X front glass clean, no deep scratches', bodyCondition: 'Aluminum housing clean', functionalDefects: [], repairHistory: 'None', originalAccessories: ['Midnight Sport Band M/L', 'Apple Fast Charger'], sellerConditionSummary: 'Dependable daily health and fitness tracking watch.' },
        status: 'active',
        sellerId: seller4._id,
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
      },
      {
        title: 'Garmin Fenix 7 Pro Solar 47mm (Solar Charging, Built-in LED Flashlight)',
        description: 'Multi-sport GPS endurance smartwatch with Power Sapphire solar charging lens and ultra-bright multi-LED flashlight.',
        category: 'smartwatches',
        brand: 'Garmin',
        modelName: 'Fenix 7 Pro Solar',
        price: 490,
        condition: 'excellent',
        structuredSpecs: { cpu: 'Garmin Endurance DSP', storageGb: 32, screenSizeInches: 1.3, resolution: '260x260 Transflective MIP', releaseYear: 2023 },
        conditionDisclosures: { batteryHealthPct: 99, batteryCycleCount: 18, screenCondition: 'Sapphire solar glass pristine', bodyCondition: 'Titanium bezel has minimal rub on lower edge', functionalDefects: [], repairHistory: 'None', originalAccessories: ['QuickFit 22 Silicone Band', 'Garmin USB-C Charging Cable'], sellerConditionSummary: '22-day battery life in smartwatch mode with solar.' },
        status: 'active',
        sellerId: seller1._id,
        images: ['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800'],
      },
      {
        title: 'Apple Watch Series 7 45mm (Suspended due to unverified activation lock report)',
        description: 'Flagship watch flagged by community review for iCloud activation lock verification.',
        category: 'smartwatches',
        brand: 'Apple',
        modelName: 'Apple Watch Series 7',
        price: 140,
        condition: 'fair',
        structuredSpecs: { cpu: 'Apple S7 SiP', storageGb: 32, screenSizeInches: 1.77, resolution: 'OLED', releaseYear: 2021 },
        conditionDisclosures: { batteryHealthPct: 78, batteryCycleCount: 380, screenCondition: 'Scratched Ion-X glass', bodyCondition: 'Scuffed aluminum edges', functionalDefects: ['Battery requires service (<80%)'], repairHistory: 'None', originalAccessories: [], sellerConditionSummary: 'Device flagged for ownership proof review.' },
        status: 'suspended',
        moderationNote: 'Suspended by moderator: Unverified ownership proof and activation lock dispute.',
        sellerId: seller3._id,
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
      },
    ];

    const createdListings = [];
    for (const item of listingsData) {
      const textToEmbed = `${item.title} ${item.description} ${item.brand} ${item.modelName} ${item.category}`;
      const embedding = await getEmbedding(textToEmbed);
      const doc = new Listing({
        ...item,
        embedding,
      });
      await doc.save();
      createdListings.push(doc);
    }

    console.log(`[Seeder] Successfully created ${createdListings.length} listings in MongoDB.`);

    // Check status distribution
    const statusCounts = createdListings.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});
    console.log('[Seeder] Status distribution:', statusCounts);

    // 4. Create Private Evidence Records with Masked Serials
    console.log('[Seeder] Generating private evidence records with strict serial masking...');

    const evidenceSeeds = [
      {
        listing: createdListings[0], // ThinkPad T14
        seller: seller1,
        serialNumber: 'SN-THINK-8921-X99',
        proofOfOwnershipDocUrl: 'https://storage.techcompanion.local/evidence/receipt-t14-aarav.pdf',
        purchaseReceiptUrl: 'https://storage.techcompanion.local/evidence/invoice-lenovo-corp.pdf',
        batteryReportDocUrl: 'https://storage.techcompanion.local/evidence/battery-report-t14.html',
        diagnosticLogs: 'Lenovo Diagnostics UEFI v4.28 passed: RAM 100% OK, SSD SMART 0 error, Battery 94.2% healthy (49.5Wh / 52.5Wh).',
        verificationStatus: 'verified',
        moderatorNotes: 'Invoice verified with authorized distributor. Hardware diagnostics verified.',
        verifiedBy: moderator._id,
        verifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        listing: createdListings[1], // MacBook Pro 14 M2
        seller: seller2,
        serialNumber: 'SN-MAC-M2-9904-B',
        proofOfOwnershipDocUrl: 'https://storage.techcompanion.local/evidence/apple-store-invoice-clara.pdf',
        purchaseReceiptUrl: 'https://storage.techcompanion.local/evidence/apple-care-receipt.pdf',
        batteryReportDocUrl: 'https://storage.techcompanion.local/evidence/system-profiler-power.txt',
        diagnosticLogs: 'Apple Hardware Diagnostics (Command+D) passed: Code ADP000 - No issues found.',
        verificationStatus: 'verified',
        moderatorNotes: 'Apple Store original receipt verified. Serial number matches invoice.',
        verifiedBy: moderator._id,
        verifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        listing: createdListings[8], // Sony Alpha A7 IV
        seller: seller2,
        serialNumber: 'SN-SNY-A7IV-00249',
        proofOfOwnershipDocUrl: 'https://storage.techcompanion.local/evidence/bh-photo-receipt-clara.pdf',
        purchaseReceiptUrl: 'https://storage.techcompanion.local/evidence/bh-invoice.pdf',
        diagnosticLogs: 'ShutterTool EXIF diagnostic confirms 4,820 mechanical actuations. Sensor cleaning inspection passed.',
        verificationStatus: 'verified',
        moderatorNotes: 'EXIF verified and B&H receipt validated.',
        verifiedBy: moderator._id,
        verifiedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        listing: createdListings[15], // iPhone 15 Pro Max
        seller: seller1,
        serialNumber: 'SN-IPHONE15-8820',
        proofOfOwnershipDocUrl: 'https://storage.techcompanion.local/evidence/apple-order-aarav.pdf',
        diagnosticLogs: 'Apple Support remote diagnostics: Battery 96%, Face ID 100%, Cameras calibrated.',
        verificationStatus: 'verified',
        moderatorNotes: 'Apple invoice verified. Unlocked status confirmed.',
        verifiedBy: moderator._id,
        verifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        listing: createdListings[22], // Steam Deck OLED
        seller: seller1,
        serialNumber: 'SN-DECK-OLED-4491',
        proofOfOwnershipDocUrl: 'https://storage.techcompanion.local/evidence/valve-steam-purchase-receipt.pdf',
        diagnosticLogs: 'SteamOS Hardware Verification passed. Thumbstick drift calibration: zero offset.',
        verificationStatus: 'verified',
        moderatorNotes: 'Valve order number confirmed with account holder.',
        verifiedBy: moderator._id,
        verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        listing: createdListings[5], // Latitude 7420 (pending listing)
        seller: seller3,
        serialNumber: 'SN-DELL-LAT-1102-K',
        proofOfOwnershipDocUrl: 'https://storage.techcompanion.local/evidence/dell-refurb-receipt.pdf',
        verificationStatus: 'pending',
        moderatorNotes: null,
      },
    ];

    for (const ev of evidenceSeeds) {
      await PrivateEvidence.create({
        listingId: ev.listing._id,
        sellerId: ev.seller._id,
        serialNumber: ev.serialNumber,
        proofOfOwnershipDocUrl: ev.proofOfOwnershipDocUrl,
        purchaseReceiptUrl: ev.purchaseReceiptUrl,
        batteryReportDocUrl: ev.batteryReportDocUrl,
        diagnosticLogs: ev.diagnosticLogs,
        verificationStatus: ev.verificationStatus,
        moderatorNotes: ev.moderatorNotes,
        verifiedBy: ev.verifiedBy,
        verifiedAt: ev.verifiedAt,
      });

      ev.listing.evidenceStatus = ev.verificationStatus;
      await ev.listing.save();
    }

    console.log(`[Seeder] Seeded ${evidenceSeeds.length} private evidence records.`);

    // 5. Shortlist Entries for Demo Buyer
    console.log('[Seeder] Populating buyer shortlist...');
    await Shortlist.create({
      buyerId: buyer1._id,
      listingId: createdListings[0]._id, // ThinkPad T14
      notes: 'Strong candidate for work laptop. Verified 16GB with upgradeable slot.',
      priority: 'high',
      targetBudget: 800,
    });

    await Shortlist.create({
      buyerId: buyer1._id,
      listingId: createdListings[1]._id, // MacBook Pro 14
      notes: 'Video editing rig. 98% battery health and Apple M2 Pro.',
      priority: 'medium',
      targetBudget: 1300,
    });

    await Shortlist.create({
      buyerId: buyer1._id,
      listingId: createdListings[15]._id, // iPhone 15 Pro Max
      notes: 'Natural titanium finish, verified battery health.',
      priority: 'high',
      targetBudget: 900,
    });

    // 6. Realistic In-App Inquiries & Messaging Threads
    console.log('[Seeder] Seeding inquiry threads...');
    const thread1 = await Question.create({
      listingId: createdListings[0]._id, // ThinkPad T14
      buyerId: buyer1._id,
      sellerId: seller1._id,
      subject: 'Inquiry regarding Lenovo ThinkPad T14 Gen 3 AMD',
      messages: [
        {
          senderId: buyer1._id,
          senderRole: 'buyer',
          message: 'Hi Aarav, does this ThinkPad come with the 400-nit low power display or the 300-nit base panel?',
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
        {
          senderId: seller1._id,
          senderRole: 'seller',
          message: 'Hello Priya! This unit is configured with the 400-nit 100% sRGB low-power display (panel model NE140WUM-N61). It looks great outdoors.',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      ],
      lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    // 7. Safe-Zone Viewing Appointments
    console.log('[Seeder] Seeding safe-zone viewing appointments...');
    await Viewing.create({
      listingId: createdListings[0]._id, // ThinkPad T14
      buyerId: buyer1._id,
      sellerId: seller1._id,
      requestedDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
      timeSlot: '14:00 - 15:00',
      locationType: 'police_station_safe_zone',
      buyerNotes: 'Would like to run Lenovo Vantage diagnostics on-site before finalizing payment.',
      sellerNotes: 'Confirmed. I will bring the original charger and leave battery charged to 100% for testing.',
      status: 'confirmed',
    });

    await Viewing.create({
      listingId: createdListings[1]._id, // MacBook Pro 14
      buyerId: buyer1._id,
      sellerId: seller2._id,
      requestedDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
      timeSlot: '11:00 - 12:00',
      locationType: 'public_library_lobby',
      buyerNotes: 'Requesting viewing appointment in main lobby to verify screen and keyboard.',
      status: 'requested',
    });

    // 8. Moderation Audit Trail Events
    console.log('[Seeder] Recording moderation audit trail...');
    await ModerationEvent.create({
      listingId: createdListings[0]._id,
      moderatorId: moderator._id,
      reportedBy: null,
      action: 'approved',
      reason: 'Complete condition disclosures and verified diagnostics logs.',
      previousStatus: 'pending',
      newStatus: 'active',
      notes: 'All mandatory hardware fields provided. Approved for public search.',
    });

    await ModerationEvent.create({
      listingId: createdListings[6]._id, // Suspended Spectre x360
      moderatorId: moderator._id,
      reportedBy: null,
      action: 'suspended',
      reason: 'Physical inspection inconsistencies regarding trackpad bulge and battery health.',
      previousStatus: 'active',
      newStatus: 'suspended',
      notes: 'Listing suspended pending verified battery replacement documentation.',
    });

    await ModerationEvent.create({
      listingId: createdListings[20]._id, // Suspended iPhone 13 Pro Max
      moderatorId: null,
      reportedBy: buyer2._id,
      action: 'report_filed',
      reason: 'Community report: Display panel lacks True Tone indicating uncertified screen swap.',
      previousStatus: 'active',
      newStatus: 'active',
      notes: 'Buyer submitted report regarding screen discrepancy.',
    });

    console.log('================================================================');
    console.log('✅ PREOWNED TECH COMPANION DATABASE SUCCESSFULLY SEEDED!');
    console.log('================================================================');
    console.log(`- Total Listings Created:   ${createdListings.length}`);
    console.log(`  * Active (public):        ${statusCounts['active'] || 0}`);
    console.log(`  * Pending review:         ${statusCounts['pending'] || 0}`);
    console.log(`  * Suspended:              ${statusCounts['suspended'] || 0}`);
    console.log(`  * Sold:                   ${statusCounts['sold'] || 0}`);
    console.log(`- Categories covered:       7 categories (Laptops, Cameras, Smartphones, Gaming, Tablets, Audio, Smartwatches)`);
    console.log(`- Manufacturer Specs:       ${createdSpecs.length} models with verified RAG vector chunks`);
    console.log(`- Verified Evidence Docs:   ${evidenceSeeds.length} with masked serial numbers`);
    console.log(`- Evaluation Test Logins:`);
    console.log(`  * Buyer:                  buyer.priya01@seed.local (Password: Password123!)`);
    console.log(`  * Seller:                 seller.aarav01@seed.local (Password: Password123!)`);
    console.log(`  * Moderator:              moderator.staff01@seed.local (Password: Password123!)`);
    console.log('================================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('FATAL SEED ERROR:', error);
    process.exit(1);
  }
}

seedDatabase();
