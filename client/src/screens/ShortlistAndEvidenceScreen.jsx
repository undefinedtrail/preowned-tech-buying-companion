import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bookmark,
  ShieldCheck,
  Lock,
  Trash2,
  ExternalLink,
  Plus,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Eye,
  FileCheck,
} from 'lucide-react';

export const ShortlistAndEvidenceScreen = ({ onOpenDetail }) => {
  const { user } = useAuth();
  const [shortlists, setShortlists] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Evidence submission state for sellers
  const [selectedListingForEvidence, setSelectedListingForEvidence] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [batteryReportUrl, setBatteryReportUrl] = useState('');
  const [diagnosticLogs, setDiagnosticLogs] = useState('');
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (user?.role === 'buyer') {
        const res = await api.buyer.getShortlists();
        if (res.success) setShortlists(res.shortlists || []);
      } else if (user?.role === 'seller') {
        const res = await api.listings.getMyListings();
        if (res.success) setMyListings(res.listings || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShortlist = async (id) => {
    try {
      await api.buyer.removeFromShortlist(id);
      setShortlists((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert(`Could not remove item: ${err.message}`);
    }
  };

  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    if (!selectedListingForEvidence) {
      alert('Please select a listing to attach evidence to.');
      return;
    }

    setEvidenceSubmitting(true);
    try {
      await api.listings.submitEvidence(selectedListingForEvidence, {
        serialNumber,
        proofOfOwnershipDocUrl: proofUrl,
        purchaseReceiptUrl: receiptUrl,
        batteryReportDocUrl: batteryReportUrl,
        diagnosticLogs,
      });

      alert('Private evidence submitted successfully! Our staff moderators will verify serial numbers against OEM registries.');
      setSerialNumber('');
      setProofUrl('');
      setReceiptUrl('');
      setBatteryReportUrl('');
      setDiagnosticLogs('');
      loadData();
    } catch (err) {
      alert(`Evidence submission failed: ${err.message}`);
    } finally {
      setEvidenceSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
          <Bookmark className="h-7 w-7 text-emerald-400" />
          Shortlist & Private Evidence Review
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Manage your saved candidate devices and inspect verified ownership evidence with automated serial number privacy masking.
        </p>
      </div>

      {/* Security Banner */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
          <Lock className="h-5 w-5" />
        </div>
        <div className="text-xs text-slate-300">
          <span className="font-bold text-white">Private Evidence Zero-Leakage Policy:</span> Serial numbers, invoice copies, and ownership receipts are strictly stored in protected collections and masked (`SN-****-9821`) on all public payloads and AI prompts.
        </div>
      </div>

      {/* BUYER VIEW: Saved Shortlist */}
      {user?.role === 'buyer' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-emerald-400" /> My Saved Shortlist ({shortlists.length})
          </h2>

          {loading ? (
            <div className="h-32 rounded-2xl bg-slate-900/50 animate-pulse" />
          ) : shortlists.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400">You haven't saved any listings to your shortlist yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shortlists.map((entry) => {
                const listing = entry.listingId;
                if (!listing) return null;

                return (
                  <div
                    key={entry._id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                            {listing.category}
                          </span>
                          <h3 className="font-bold text-sm text-white mt-1.5 line-clamp-1">
                            {listing.title}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-white">${listing.price}</div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              entry.priority === 'high'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {entry.priority} Priority
                          </span>
                        </div>
                      </div>

                      {entry.notes && (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 italic">
                          "{entry.notes}"
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 flex items-center gap-4">
                        <span>Condition: <strong className="text-white capitalize">{listing.condition}</strong></span>
                        <span>Seller: <strong className="text-white">{listing.sellerId?.name}</strong></span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between">
                      <button
                        onClick={() => onOpenDetail(listing._id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-400" /> View 3-Way Matrix
                      </button>
                      <button
                        onClick={() => handleRemoveShortlist(entry._id)}
                        className="text-xs p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer"
                        title="Remove from shortlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SELLER VIEW: Private Evidence Submission Workbench */}
      {user?.role === 'seller' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Seller Evidence Submission Portal
                </h2>
                <p className="text-xs text-slate-400">
                  Submit hardware serial numbers and diagnostic logs for staff moderation verification.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitEvidence} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Target Listing
                </label>
                <select
                  value={selectedListingForEvidence}
                  onChange={(e) => setSelectedListingForEvidence(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                >
                  <option value="">Select a listing to attach private evidence to...</option>
                  {myListings.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.title} (${l.price}) - Status: {l.evidenceStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Hardware Serial Number (Masked automatically)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN-LENOVO-99281-PRO"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Proof of Ownership / Original Invoice URL
                  </label>
                  <input
                    type="url"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="https://secure-docs.example.com/receipt.pdf"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Battery Health Report / Diagnostic URL
                  </label>
                  <input
                    type="url"
                    value={batteryReportUrl}
                    onChange={(e) => setBatteryReportUrl(e.target.value)}
                    placeholder="https://secure-docs.example.com/battery-report.html"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Diagnostic Log Summary (SMART / Battery)
                  </label>
                  <input
                    type="text"
                    value={diagnosticLogs}
                    onChange={(e) => setDiagnosticLogs(e.target.value)}
                    placeholder="e.g. Apple Diagnostics PASS, 142 cycles, 91% capacity"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={evidenceSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-600/30"
              >
                {evidenceSubmitting ? 'Submitting to Safe Vault...' : 'Submit Evidence for Verification'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GUEST NOTICE */}
      {!user && (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <p className="text-xs text-slate-400">
            Please log in with a verified Buyer or Seller account using the Quick Role Switcher in the top right navbar to access shortlists and evidence vaults.
          </p>
        </div>
      )}
    </div>
  );
};

export default ShortlistAndEvidenceScreen;
