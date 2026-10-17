import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const ComparisonAgentChat = ({ isOpen, onClose, onSelectListing }) => {
  const [query, setQuery] = useState('Compare three coding laptops under my budget');
  const [budget, setBudget] = useState(900);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Confirmation modal gate for agent actions
  const [confirmationModal, setConfirmationModal] = useState(null);

  const handleRunAgent = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.ai.runComparisonAgent(query, Number(budget) || null);
      if (res.success && res.data) {
        setResult(res.data);
      }
    } catch (err) {
      setError(err.message || 'Comparison agent execution failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/80 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              Comparison Agent
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Multi-Step RAG
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Cross-references manufacturer manuals, hard budget & seller disclosures
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Demonstration Prompt Chips */}
        <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            Quick Scenario Starters
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setQuery('Compare coding laptops under my budget');
                setBudget(900);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors text-left"
            >
              💻 Coding laptops under $900 (Demo Scenario)
            </button>
            <button
              onClick={() => {
                setQuery('Find camera for photography and travel under my budget');
                setBudget(1000);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors text-left"
            >
              📷 Travel camera under $1000
            </button>
            <button
              onClick={() => {
                setQuery('Portable gaming device for travel under budget');
                setBudget(500);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors text-left"
            >
              🎮 Handheld gaming under $500
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleRunAgent} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Your Requirement / Use-Case
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Compare coding laptops for web development"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-1/2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hard Budget Cap ($ USD)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="900"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="w-1/2 pt-5">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Executing Agent...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Run Comparison Agent
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            {error}
          </div>
        )}

        {/* Multi-Step Agent Execution Badges */}
        {result && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                Live Tool Execution Status
              </h3>
              <div className="space-y-2.5">
                {result.steps?.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs"
                  >
                    <div className="mt-0.5">
                      {step.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-300">
                          Step {step.stepNumber}: {step.stepName}()
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {step.durationMs}ms
                        </span>
                      </div>
                      <p className="text-slate-300 mt-0.5">{step.outputSummary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Synthesized Trade-off Analysis */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-700/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                Evidence-Grounded Trade-off Analysis
              </div>
              <div className="prose prose-invert prose-xs text-slate-300 text-xs leading-relaxed whitespace-pre-line">
                {result.tradeoffAnalysis}
              </div>
            </div>

            {/* Candidate Shortlist Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Examined Candidate Listings ({result.recommendations?.length})
              </h3>
              {result.recommendations?.map((item) => (
                <div
                  key={item.listingId}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{item.title}</h4>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">
                        ${item.price} USD
                      </div>
                    </div>
                    {onSelectListing && (
                      <button
                        onClick={() => onSelectListing(item.listingId)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                      >
                        Inspect <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Pros */}
                  {item.pros?.length > 0 && (
                    <div className="mt-2.5 space-y-1">
                      {item.pros.map((pro, idx) => (
                        <div key={idx} className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span>{pro}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cons & Missing Disclosures */}
                  {item.consAndTradeoffs?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.consAndTradeoffs.map((con, idx) => (
                        <div
                          key={idx}
                          className={`text-[11px] flex items-center gap-1.5 ${
                            con.includes('WARNING') || con.includes('GAP')
                              ? 'text-amber-400 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>{con}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Suggested Pre-Purchase Questions */}
            {result.suggestedPrepurchaseQuestions?.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-sky-900/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                  <HelpCircle className="h-4 w-4" />
                  Recommended Pre-Purchase Questions
                </div>
                <div className="space-y-2">
                  {result.suggestedPrepurchaseQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          For: {q.targetSeller}
                        </div>
                        <div className="text-xs text-white font-medium mt-0.5">
                          "{q.question}"
                        </div>
                        <div className="text-[10px] text-amber-400/90 mt-1 italic">
                          Reason: {q.reason}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setConfirmationModal({
                            type: 'inquiry',
                            listingId: q.listingId,
                            title: q.targetSeller,
                            text: q.question,
                          })
                        }
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        Ask Seller <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guardrail Notice */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{result.guardrailNotice}</span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Gate Modal */}
      {confirmationModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <ShieldCheck className="h-6 w-6" />
              <h4 className="font-bold text-white text-base">User Confirmation Gate</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Per strict security rules, the AI comparison agent cannot autonomously contact sellers or book viewings. Please confirm you would like to proceed with sending this pre-purchase inquiry:
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white mb-5 font-mono">
              "{confirmationModal.text}"
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmationModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.buyer.askQuestion(
                      confirmationModal.listingId,
                      confirmationModal.text,
                      'Pre-Purchase Verification Inquiry'
                    );
                    alert('Inquiry successfully sent to seller!');
                    setConfirmationModal(null);
                  } catch (err) {
                    alert(`Failed to send inquiry: ${err.message}`);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5"
              >
                Confirm & Send Inquiry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonAgentChat;
