import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CalendarCheck,
  MessageSquare,
  ShieldCheck,
  Clock,
  MapPin,
  Send,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const ViewingAndChatScreen = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('viewings'); // 'viewings' or 'inquiries'

  const [viewings, setViewings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === 'viewings') {
        const res = await api.buyer.getMyViewings();
        if (res.success) setViewings(res.viewings || []);
      } else {
        const res = await api.buyer.getMyInquiries();
        if (res.success) {
          setInquiries(res.threads || []);
          if (res.threads?.length > 0 && !selectedThread) {
            setSelectedThread(res.threads[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load viewing/chat data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (viewingId, newStatus) => {
    try {
      await api.buyer.updateViewingStatus(viewingId, newStatus);
      setViewings((prev) =>
        prev.map((v) => (v._id === viewingId ? { ...v, status: newStatus } : v))
      );
      alert(`Viewing request marked as ${newStatus}`);
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedThread) return;

    try {
      const res = await api.buyer.replyQuestion(selectedThread._id, replyMessage);
      if (res.success && res.thread) {
        setSelectedThread(res.thread);
        setInquiries((prev) =>
          prev.map((t) => (t._id === res.thread._id ? res.thread : t))
        );
        setReplyMessage('');
      }
    } catch (err) {
      alert(`Reply error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <CalendarCheck className="h-7 w-7 text-amber-400" />
            Safe Viewings & Confidential Inquiry Threads
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Arrange in-person physical inspections at verified exchange safe zones and communicate without exposing contact info.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('viewings')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'viewings'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Safe Viewings ({viewings.length})
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'inquiries'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Private Chats ({inquiries.length})
          </button>
        </div>
      </div>

      {/* VIEWINGS TAB CONTENT */}
      {activeTab === 'viewings' && (
        <div className="space-y-4">
          {loading ? (
            <div className="h-40 rounded-2xl bg-slate-900/50 animate-pulse" />
          ) : viewings.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
              <CalendarCheck className="h-8 w-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">No scheduled viewing slots yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {viewings.map((v) => {
                const isSeller = user?._id?.toString() === v.sellerId?._id?.toString();

                return (
                  <div
                    key={v._id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                              v.status === 'confirmed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : v.status === 'requested'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            Status: {v.status}
                          </span>
                          <h3 className="font-bold text-sm text-white mt-2 line-clamp-1">
                            {v.listingId?.title}
                          </h3>
                        </div>
                        <div className="text-right text-xs font-black text-emerald-400">
                          ${v.listingId?.price}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <span>
                            Date: {new Date(v.requestedDate).toLocaleDateString()} ({v.timeSlot})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Location: {v.locationDetails || v.locationType}</span>
                        </div>
                        {v.buyerNotes && (
                          <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                            Buyer Note: "{v.buyerNotes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Update Actions for Seller / Buyer */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-500">
                        {isSeller ? 'You are the Seller' : 'You are the Buyer'}
                      </div>
                      <div className="flex items-center gap-2">
                        {v.status === 'requested' && isSeller && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(v._id, 'confirmed')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                            >
                              Confirm Slot
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(v._id, 'declined')}
                              className="px-3 py-1.5 rounded-lg bg-red-950 text-red-300 hover:bg-red-900 text-xs font-semibold cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {v.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusUpdate(v._id, 'completed')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PRIVATE INQUIRIES TAB CONTENT */}
      {activeTab === 'inquiries' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden min-h-[500px]">
          {/* Threads List Sidebar */}
          <div className="md:col-span-1 border-r border-slate-800 p-4 space-y-2 overflow-y-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Inquiry Threads
            </div>
            {inquiries.length === 0 ? (
              <div className="text-xs text-slate-500 p-4 text-center">No inquiry conversations.</div>
            ) : (
              inquiries.map((t) => (
                <button
                  key={t._id}
                  onClick={() => setSelectedThread(t)}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer ${
                    selectedThread?._id === t._id
                      ? 'bg-slate-800 border border-slate-700 shadow'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="font-bold text-xs text-white line-clamp-1">
                    {t.listingId?.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {t.messages?.[t.messages.length - 1]?.message || 'No messages yet'}
                  </div>
                  <div className="text-[9px] text-emerald-400 mt-1">
                    {new Date(t.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Active Conversation Pane */}
          <div className="md:col-span-2 p-6 flex flex-col justify-between">
            {selectedThread ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                {/* Conversation Header */}
                <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">{selectedThread.listingId?.title}</h3>
                    <div className="text-[11px] text-slate-400">
                      Thread with {selectedThread.sellerId?.name} • Confidential In-App Thread
                    </div>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="space-y-3 overflow-y-auto max-h-96 pr-2">
                  {selectedThread.messages?.map((msg, idx) => {
                    const isMe = msg.senderId?.toString() === user?._id?.toString();

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-br-none'
                              : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                          }`}
                        >
                          <div className="text-[9px] font-bold opacity-75 mb-1 uppercase tracking-wider">
                            {msg.senderRole}
                          </div>
                          {msg.message}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your response... (Identity stays confidential)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" /> Reply
                  </button>
                </form>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Select an inquiry conversation to read messages
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewingAndChatScreen;
