import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Calendar,
  Send,
  ArrowLeft,
  Bookmark,
  FileText,
  Lock,
  Cpu,
  Monitor,
  HardDrive,
  Battery,
  Wrench,
  UserCheck,
} from 'lucide-react';

export const ListingDetailComparisonScreen = ({ listingId, onBack, initialTab = 'overview' }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // RAG Question State
  const [ragQuestion, setRagQuestion] = useState('Can I upgrade the RAM on this laptop to 32GB?');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragAnswer, setRagAnswer] = useState(null);

  // Safe Viewing Modal State
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [viewingDate, setViewingDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [viewingTime, setViewingTime] = useState('14:00 - 15:00');
  const [viewingLocation, setViewingLocation] = useState('police_station_safe_zone');
  const [buyerNotes, setBuyerNotes] = useState('');

  // Inquiry Modal State
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');

  useEffect(() => {
    if (listingId) {
      fetchListingDetails();
    }
  }, [listingId]);

  const fetchListingDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listings.getById(listingId);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load listing specifications');
    } finally {
      setLoading(false);
    }
  };

  const handleAskRAG = async (e) => {
    if (e) e.preventDefault();
    if (!ragQuestion.trim()) return;

    if (!user) {
      alert('Please log in to use the AI Specification Assistant.');
      return;
    }

    setRagLoading(true);
    try {
      const res = await api.ai.buyerChatRAG(listingId, ragQuestion);
      if (res.success && res.data) {
        setRagAnswer(res.data);
      }
    } catch (err) {
      alert(`Specification RAG Error: ${err.message}`);
    } finally {
      setRagLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in as a buyer to request a safe viewing slot.');
      return;
    }
    try {
      await api.buyer.requestViewing(listingId, {
        requestedDate: viewingDate,
        timeSlot: viewingTime,
        locationType: viewingLocation,
        buyerNotes,
      });
      alert('Viewing request confirmed! Scheduled at designated safe exchange zone.');
      setShowViewingModal(false);
    } catch (err) {
      alert(`Booking Blocked: ${err.message}`);
    }
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to contact seller.');
      return;
    }
    try {
      await api.buyer.askQuestion(listingId, inquiryMessage, `Inquiry regarding ${data.listing.title}`);
      alert('Question sent to seller! Buyer identity and contact info remain private.');
      setShowInquiryModal(false);
      setInquiryMessage('');
    } catch (err) {
      alert(`Inquiry failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-24 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4" />
        <p className="text-sm text-slate-400">Loading verified specifications and disclosures...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Listing Unavailable</h2>
        <p className="text-sm text-slate-400">{error || 'This listing could not be found or has been suspended.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-white hover:bg-slate-700 transition-colors"
        >
          Return to Search
        </button>
      </div>
    );
  }

  const { listing, officialSpecification, evidence } = data;
  const isSuspended = listing.status === 'suspended';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Navigation & Back Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Listings Grid
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInquiryModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 text-sky-400" /> Ask Seller Private Question
          </button>
          <button
            onClick={() => {
              if (isSuspended) {
                alert('Viewing Booking Blocked: This listing has been suspended for moderation review.');
              } else {
                setShowViewingModal(true);
              }
            }}
            disabled={isSuspended}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              isSuspended
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-red-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 cursor-pointer'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> Request Safe Viewing
          </button>
        </div>
      </div>

      {/* Main Listing Header */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-bold text-white uppercase tracking-wider">
              {listing.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold capitalize">
              Condition: {listing.condition}
            </span>
            {isSuspended && (
              <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500 text-red-300 text-xs font-bold animate-pulse">
                Suspended by Moderation
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{listing.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
            {listing.description}
          </p>

          <div className="pt-2 flex items-center gap-6 text-xs text-slate-400">
            <div>
              Seller: <span className="text-white font-semibold">{listing.sellerId?.name}</span>
            </div>
            <div>
              Reputation: <span className="text-emerald-400 font-bold">{listing.sellerId?.reputationScore || 95}%</span>
            </div>
            <div>
              Verified Sales: <span className="text-white font-bold">{listing.sellerId?.verifiedSalesCount || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl text-center min-w-[200px] w-full md:w-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Listed Price</div>
          <div className="text-3xl font-black text-white mt-1">
            ${listing.price} <span className="text-sm font-normal text-slate-400">{listing.currency}</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 font-medium">
            Safe Exchange Zone Eligible
          </div>
        </div>
      </div>

      {/* 3-WAY COMPARISON MATRIX:
          Col 1: Manufacturer Guarantees (Official Manuals)
          Col 2: Seller Declarations & Claims
          Col 3: Facts Still Awaiting Verification / Gaps
      */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Three-Way Specification & Disclosure Matrix
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          This system explicitly separates manufacturer guarantees from unverified seller declarations, and surfaces critical missing facts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* COLUMN 1: Manufacturer Guarantees (Official Specs) */}
          <div className="rounded-2xl bg-slate-900/90 border border-sky-500/30 p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-sky-500/20 text-sky-400">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-white">Manufacturer Guarantees</h3>
                  <p className="text-[10px] text-sky-400/80">Curated OEM manuals & architecture</p>
                </div>
              </div>

              {officialSpecification ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-sky-400" /> RAM Architecture & Maximum
                    </div>
                    <div className="text-white font-medium">
                      Max: {officialSpecification.officialSpecs?.maxRamGb}GB ({officialSpecification.officialSpecs?.ramType})
                    </div>
                    <div className="text-[11px] text-sky-300">
                      {officialSpecification.officialSpecs?.ramUpgradeable
                        ? `User Upgradeable (${officialSpecification.officialSpecs?.ramSlotsCount} SODIMM slots)`
                        : 'Permanently Soldered - Non-Upgradeable'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5 text-sky-400" /> Display Specification
                    </div>
                    <div className="text-white font-medium">
                      {officialSpecification.officialSpecs?.displaySpecs?.panelType}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Refresh Rate: {officialSpecification.officialSpecs?.displaySpecs?.refreshRateHz}Hz
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-sky-400" /> Official Repairability
                    </div>
                    <div className="text-white font-medium">
                      {officialSpecification.officialSpecs?.repairabilityScore || 'N/A'}/10 Index Rating
                    </div>
                  </div>

                  {officialSpecification.curatedManualExcerpts?.[0] && (
                    <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-800/40 text-[11px] text-sky-200/90 leading-relaxed font-mono">
                      "{officialSpecification.curatedManualExcerpts[0].excerpt}"
                      <div className="text-[9px] text-sky-400 mt-1 uppercase font-bold">
                        Source: {officialSpecification.curatedManualExcerpts[0].sourceDoc}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic p-4 text-center">
                  Manufacturer manual not yet indexed for this exact brand and model.
                </div>
              )}
            </div>

            <div className="text-[10px] text-sky-400/80 p-2 rounded-lg bg-sky-950/30 border border-sky-900/40">
              Verified OEM specifications provided for objective comparison.
            </div>
          </div>

          {/* COLUMN 2: Seller Declarations */}
          <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-emerald-500/20 text-emerald-400">
                <UserCheck className="h-5 w-5 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-white">Seller Declarations</h3>
                  <p className="text-[10px] text-emerald-400/80">Stated condition & included hardware</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] font-semibold">Installed Specifications</div>
                  <div className="text-white font-medium">
                    {listing.structuredSpecs?.cpu || 'Standard CPU'}
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    {listing.structuredSpecs?.ramGb}GB RAM • {listing.structuredSpecs?.storageGb}GB SSD
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] font-semibold">Screen & Cosmetic Condition</div>
                  <div className="text-white font-medium">
                    {listing.conditionDisclosures?.screenCondition || 'No specific disclosure'}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Body: {listing.conditionDisclosures?.bodyCondition || 'Standard wear'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] font-semibold">Seller Condition Summary</div>
                  <p className="text-slate-300 text-[11px] italic">
                    "{listing.conditionDisclosures?.sellerConditionSummary || 'No additional summary provided.'}"
                  </p>
                </div>

                {evidence && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-[11px] space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Lock className="h-3 w-3" /> Private Evidence Audit
                    </div>
                    <div className="text-slate-300">
                      Serial: <span className="font-mono text-emerald-300">{evidence.maskedSerialNumber || evidence.serialNumber}</span>
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Verification Status: <span className="uppercase font-semibold text-white">{evidence.verificationStatus}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-amber-300/80 p-2 rounded-lg bg-amber-950/30 border border-amber-900/40">
              Note: A seller claim is not a manufacturer guarantee.
            </div>
          </div>

          {/* COLUMN 3: Facts Still Awaiting Verification / Gaps */}
          <div className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-amber-500/20 text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-white">Gaps Awaiting Verification</h3>
                  <p className="text-[10px] text-amber-400/80">Missing disclosures & inspection alerts</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Battery health check */}
                {listing.category === 'laptops' && (
                  <div
                    className={`p-3.5 rounded-xl border ${
                      listing.conditionDisclosures?.batteryHealthPct === null ||
                      listing.conditionDisclosures?.batteryHealthPct === undefined
                        ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                        : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-xs mb-1">
                      <Battery className="h-4 w-4" /> Battery Health Transparency
                    </div>
                    {listing.conditionDisclosures?.batteryHealthPct === null ||
                    listing.conditionDisclosures?.batteryHealthPct === undefined ? (
                      <div>
                        <div className="text-amber-300 font-semibold">
                          ⚠️ WARNING: Battery health % omitted
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                          The seller has not provided maximum battery capacity or cycle count. Replacement OEM batteries range from $80 to $150.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-emerald-300 font-semibold">
                          Disclosed: {listing.conditionDisclosures.batteryHealthPct}% Maximum Capacity
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Cycle count: {listing.conditionDisclosures.batteryCycleCount || 'N/A'}. Diagnostic verified.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Missing Disclosures */}
                {listing.missingDisclosures?.length > 0 ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="text-slate-400 text-[11px] font-semibold">Flagged Omissions:</div>
                    {listing.missingDisclosures.map((gap, idx) => (
                      <div key={idx} className="text-amber-300/90 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
                        <span>{gap}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All standard disclosure fields completed
                  </div>
                )}

                {/* Pre-purchase Safe Viewing Inspection Checklist */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] font-semibold">Inspection Points For Viewing</div>
                  <ul className="text-[10px] text-slate-300 space-y-1 list-disc pl-4">
                    <li>Run SSD SMART health test on-site</li>
                    <li>Verify screen coating under bright flashlight</li>
                    <li>Confirm serial number matches masked system record</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setRagQuestion('What are the critical facts missing from this listing disclosures?');
                handleAskRAG();
              }}
              className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-semibold text-amber-300 transition-colors cursor-pointer"
            >
              Analyze Gaps with RAG AI
            </button>
          </div>
        </div>
      </div>

      {/* SPECIFICATION RAG INTERACTIVE Q&A */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Specification RAG Assistant</h3>
            <p className="text-xs text-slate-400">
              Answers compatibility, RAM upgrade limits and hardware questions citing curated manuals vs seller claims
            </p>
          </div>
        </div>

        {/* Question Preset Buttons */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            'Can I upgrade the RAM on this laptop to 32GB?',
            'What is the maximum storage capacity supported?',
            'How does the display refresh rate compare to current standards?',
            'Does this model support external dual 4K monitors?',
          ].map((q) => (
            <button
              key={q}
              onClick={() => {
                setRagQuestion(q);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleAskRAG} className="flex gap-2">
          <input
            type="text"
            value={ragQuestion}
            onChange={(e) => setRagQuestion(e.target.value)}
            placeholder="Ask a technical or compatibility question about this device..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={ragLoading}
            className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
          >
            {ragLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Ask RAG
              </>
            )}
          </button>
        </form>

        {/* RAG Answer Display */}
        {ragAnswer && (
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-700/80 space-y-3 animate-in fade-in duration-200">
            <div className="text-xs font-bold text-emerald-400 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                {ragAnswer.isSupported ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                )}
                {ragAnswer.isSupported ? 'Cited Specification Verification' : 'Unsupported Capability / Missing Data Notice'}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-normal">
                {ragAnswer.toolExecution && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-emerald-300">
                    {ragAnswer.toolExecution.chunksRetrieved} manual chunks retrieved ({ragAnswer.toolExecution.durationMs}ms)
                  </span>
                )}
                <span>Sources: {ragAnswer.sourcesConsulted?.join(' • ')}</span>
              </div>
            </div>
            <div className="prose prose-invert prose-xs text-xs text-slate-200 leading-relaxed whitespace-pre-line">
              {ragAnswer.answer}
            </div>
          </div>
        )}
      </div>

      {/* SAFE VIEWING BOOKING MODAL */}
      {showViewingModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <Calendar className="h-5 w-5" />
                <h3 className="font-bold text-white text-base">Request Safe Viewing Slot</h3>
              </div>
              <button
                onClick={() => setShowViewingModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Schedule an in-person physical inspection at a verified public safe exchange zone. Your contact details remain confidential.
            </p>

            <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Requested Inspection Date</label>
                <input
                  type="date"
                  value={viewingDate}
                  onChange={(e) => setViewingDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Time Window</label>
                <select
                  value={viewingTime}
                  onChange={(e) => setViewingTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="11:00 - 12:00">Morning (11:00 - 12:00)</option>
                  <option value="14:00 - 15:00">Afternoon (14:00 - 15:00)</option>
                  <option value="17:00 - 18:00">Evening (17:00 - 18:00)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Safe Meeting Location Type</label>
                <select
                  value={viewingLocation}
                  onChange={(e) => setViewingLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="police_station_safe_zone">
                    Police Station E-Commerce Safe Zone (Recommended)
                  </option>
                  <option value="public_library_lobby">Public Library Main Lobby</option>
                  <option value="coffee_shop_public">Busy Public Coffee Shop</option>
                  <option value="shopping_mall_center">Shopping Mall Center Court</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Notes for Seller</label>
                <textarea
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  placeholder="e.g. Will bring battery testing utility on USB drive..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowViewingModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  Confirm Viewing Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRIVATE INQUIRY MODAL */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sky-400">
                <Send className="h-5 w-5" />
                <h3 className="font-bold text-white text-base">Send In-App Inquiry to Seller</h3>
              </div>
              <button
                onClick={() => setShowInquiryModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your inquiry is routed through a private message thread. Your contact details remain private until you choose to share them.
            </p>

            <form onSubmit={handleInquirySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Question / Verification Inquiry</label>
                <textarea
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  placeholder="e.g. Can you confirm the battery cycle count or provide a screenshot of the system diagnostic screen?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white h-28"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInquiryModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-semibold text-white shadow-lg shadow-sky-600/30 cursor-pointer"
                >
                  Send Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingDetailComparisonScreen;
