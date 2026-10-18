import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Lock,
  RefreshCw,
  Clock,
  Eye,
} from 'lucide-react';

export const ModeratorDashboardScreen = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [history, setHistory] = useState([]);

  // Action Form State
  const [action, setAction] = useState('suspended');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.moderation.getQueue();
      if (res.success) {
        setQueue(res.listings || []);
        if (res.listings?.length > 0 && !selectedListing) {
          handleSelectListing(res.listings[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load moderation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectListing = async (listing) => {
    setSelectedListing(listing);
    try {
      const res = await api.moderation.getHistory(listing._id);
      if (res.success) setHistory(res.history || []);
    } catch (err) {
      setHistory([]);
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedListing || !reason.trim()) {
      alert('Please specify a valid moderation reason.');
      return;
    }

    setSubmitting(true);
    try {
      await api.moderation.takeAction(selectedListing._id, {
        action,
        reason,
        notes,
      });

      alert(`Moderation decision '${action}' recorded in permanent audit ledger.`);
      setReason('');
      setNotes('');
      fetchQueue();
    } catch (err) {
      alert(`Moderation Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-red-400" />
            Staff Moderation & Evidence Audit Panel
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review reported listings, audit raw serial numbers and receipts, and record non-destructive decisions.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Queue
        </button>
      </div>

      {/* Security Rule Guardrail Notice */}
      <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 text-xs text-red-200 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Integrity Guardrail Enforced:</span> Moderators can flag, suspend, reinstate, or verify evidence, but <span className="underline font-semibold">CANNOT silently rewrite a seller's condition declaration</span>. All verdicts create an immutable `ModerationEvent` record.
        </div>
      </div>

      {/* Main Workbench Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Incident Queue */}
        <div className="lg:col-span-1 rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
            Moderation Queue ({queue.length})
          </div>

          {loading ? (
            <div className="h-40 rounded-xl bg-slate-950/50 animate-pulse" />
          ) : queue.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Zero listings currently flagged or pending review.
            </div>
          ) : (
            queue.map((item) => (
              <button
                key={item._id}
                onClick={() => handleSelectListing(item)}
                className={`w-full text-left p-4 rounded-2xl transition-all cursor-pointer border ${
                  selectedListing?._id === item._id
                    ? 'bg-slate-950 border-red-500/50 shadow-md'
                    : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span
                    className={`px-2 py-0.5 rounded uppercase ${
                      item.status === 'suspended'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    Status: {item.status}
                  </span>
                  <span className="text-slate-400">Reports: {item.reportCount || 0}</span>
                </div>
                <h4 className="font-bold text-xs text-white mt-2 line-clamp-1">{item.title}</h4>
                <div className="text-[11px] text-slate-400 mt-1">
                  Seller: {item.sellerId?.name} • ${item.price}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Selected Listing Inspection & Moderation Action */}
        <div className="lg:col-span-2 space-y-6">
          {selectedListing ? (
            <div className="space-y-6">
              {/* Hardware & Evidence Audit Card */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="font-bold text-base text-white">{selectedListing.title}</h3>
                    <p className="text-xs text-slate-400">
                      Seller: {selectedListing.sellerId?.name} ({selectedListing.sellerId?.email})
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-white">${selectedListing.price}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{selectedListing.condition} Condition</div>
                  </div>
                </div>

                {/* Seller Declaration (Read-Only) */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400 font-semibold text-[11px]">Seller Stated Declaration:</div>
                  <div className="text-slate-300">
                    "{selectedListing.conditionDisclosures?.sellerConditionSummary || 'No summary declared.'}"
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Battery: {selectedListing.conditionDisclosures?.batteryHealthPct || 'Not disclosed'}% • Defect flags: {selectedListing.conditionDisclosures?.functionalDefects?.join(', ') || 'None'}
                  </div>
                </div>

                {/* Unmasked Staff Evidence View */}
                {selectedListing.submittedEvidence ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 text-xs">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Lock className="h-4 w-4" /> Unmasked Private Evidence (Staff Clearance)
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-slate-300 text-[11px]">
                      <div>
                        Serial Number: <strong className="font-mono text-white">{selectedListing.submittedEvidence.serialNumber}</strong>
                      </div>
                      <div>
                        Status: <strong className="uppercase text-emerald-300">{selectedListing.submittedEvidence.verificationStatus}</strong>
                      </div>
                    </div>
                    {selectedListing.submittedEvidence.diagnosticLogs && (
                      <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded font-mono">
                        Log: {selectedListing.submittedEvidence.diagnosticLogs}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 italic">
                    No private evidence uploaded by seller for this item.
                  </div>
                )}
              </div>

              {/* Action Form */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-400" /> Record Moderation Decision
                </h4>

                <form onSubmit={handleActionSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Select Action</label>
                    <select
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="approved">Approve Listing (Pending → Active)</option>
                      <option value="suspended">Suspend Listing (Blocks new viewings & public search)</option>
                      <option value="reinstated">Reinstate Listing (Return to active)</option>
                      <option value="flagged">Flag Listing (Increment report counter)</option>
                      <option value="evidence_verified">Verify Submitted Evidence (Mark verified)</option>
                      <option value="evidence_rejected">Reject Evidence (Mark invalid)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Reason for Decision (Required for audit log)
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Serial number verified against Apple warranty database"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Internal Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes for moderator team..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white h-16"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {submitting ? 'Recording Event...' : 'Record Decision in Audit Ledger'}
                  </button>
                </form>
              </div>

              {/* Audit History Logs */}
              {history.length > 0 && (
                <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-3">
                  <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" /> Moderation Audit Ledger
                  </h4>
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div
                        key={h._id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white uppercase text-[10px] px-2 py-0.5 rounded bg-slate-800">
                            {h.action}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(h.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-300 text-[11px] font-medium">
                          Reason: {h.reason}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {h.moderatorId ? `Moderator: ${h.moderatorId?.name || 'Staff'}` : `Reported by: ${h.reportedBy?.name || 'Community Member'}`} • Status change: {h.previousStatus} → {h.newStatus}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-xs text-slate-500">
              Select an incident from the queue on the left to inspect evidence and execute decisions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModeratorDashboardScreen;
