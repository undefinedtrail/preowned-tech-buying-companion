import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  Sparkles,
  Sliders,
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ArrowUpDown,
  Tag,
  ShieldCheck,
  Cpu,
  Layers,
  Eye,
} from 'lucide-react';

export const ListingSearchScreen = ({ onOpenDetail, onOpenAgent }) => {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [minRamGb, setMinRamGb] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Semantic search mode toggle
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [savedShortlistIds, setSavedShortlistIds] = useState(new Set());

  useEffect(() => {
    fetchListings();
    if (user?.role === 'buyer') {
      fetchUserShortlist();
    }
  }, [category, condition, minRamGb, sortBy, sortOrder]);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSemanticMode && search.trim()) {
        if (!user) {
          setError('Semantic AI discovery is a member-only feature. Please sign in or use standard keyword search.');
          setListings([]);
          setLoading(false);
          return;
        }
        const res = await api.ai.semanticSearch({
          query: search,
          budget: maxPrice ? Number(maxPrice) : undefined,
          category: category || undefined,
          minRamGb: minRamGb ? Number(minRamGb) : undefined,
        });
        if (res.success && res.data) {
          setListings(res.data.candidates || []);
        }
      } else {
        const params = {};
        if (search) params.search = search;
        if (category) params.category = category;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (condition) params.condition = condition;
        if (minRamGb) params.minRamGb = minRamGb;
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;

        const res = await api.listings.getAll(params);
        if (res.success) {
          setListings(res.listings || []);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserShortlist = async () => {
    try {
      const res = await api.buyer.getShortlists();
      if (res.success && res.shortlists) {
        const idSet = new Set(res.shortlists.map((s) => s.listingId?._id || s.listingId));
        setSavedShortlistIds(idSet);
      }
    } catch (err) {
      // Ignore if not logged in
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const handleShortlistToggle = async (listingId) => {
    if (!user) {
      alert('Please log in as a buyer to save listings to your shortlist.');
      return;
    }
    try {
      if (savedShortlistIds.has(listingId)) {
        alert('This item is already in your shortlist.');
      } else {
        await api.buyer.addToShortlist({ listingId });
        setSavedShortlistIds((prev) => new Set([...prev, listingId]));
        alert('Added to your Shortlist!');
      }
    } catch (err) {
      alert(err.message || 'Could not update shortlist');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header & Natural Language Use-Case Search */}
      <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Verified Hardware Declarations & Specification RAG
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Find preowned laptops, cameras & gaming rigs matched to your{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              exact use case.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Compare structured seller claims against manufacturer manuals. Our AI audits battery disclosures, masks private serial numbers, and highlights critical evidence gaps.
          </p>

          {/* Search Bar Form */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isSemanticMode
                    ? 'Natural language query: e.g. "laptop for coding and light editing under $900"'
                    : 'Search keyword: ThinkPad, MacBook M1, RTX, Sony A7...'
                }
                className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="h-4 w-4" /> Search
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSemanticMode(!isSemanticMode);
                if (!isSemanticMode && !search) {
                  setSearch('laptop for coding and light editing under $900');
                }
              }}
              className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isSemanticMode
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              {isSemanticMode ? 'Semantic Mode Active' : 'Enable Semantic AI'}
            </button>
          </form>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80">
        {[
          { label: 'All Categories', value: '' },
          { label: '💻 Laptops', value: 'laptops' },
          { label: '📷 Cameras', value: 'cameras' },
          { label: '🎮 Gaming', value: 'gaming' },
          { label: '📱 Smartphones', value: 'smartphones' },
          { label: '📱 Tablets', value: 'tablets' },
          { label: '🎧 Audio', value: 'audio' },
          { label: '⌚ Smartwatches', value: 'smartwatches' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setCategory(tab.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              category === tab.value
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid & Filters Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <Filter className="h-4 w-4 text-emerald-400" /> Refine Search
            </span>
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setMinPrice('');
                setMaxPrice('');
                setCondition('');
                setMinRamGb('');
                fetchListings();
              }}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Reset
            </button>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Price Range ($ USD)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Condition Grade */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Condition Grade
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Any Condition</option>
              <option value="excellent">Excellent / Like New</option>
              <option value="good">Good Condition</option>
              <option value="fair">Fair / Functional Wear</option>
            </select>
          </div>

          {/* Minimum RAM */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Minimum Memory (RAM)
            </label>
            <select
              value={minRamGb}
              onChange={(e) => setMinRamGb(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Any Capacity</option>
              <option value="8">8GB or more</option>
              <option value="16">16GB or more (Recommended)</option>
              <option value="32">32GB or more</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Sort Results
            </label>
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('_');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="createdAt_desc">Newest Listings</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          {/* Apply Filter Button */}
          <button
            onClick={fetchListings}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Apply Filters
          </button>
        </div>

        {/* Listings Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
            <span>
              Showing <span className="font-bold text-white">{listings.length}</span> active preowned items
            </span>
            {isSemanticMode && (
              <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                <Sparkles className="h-3 w-3" /> Scored by Atlas Vector & Cosine Similarity
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-12">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-72 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
              <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
              <h3 className="font-bold text-base text-white">No active listings match your criteria</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try widening your price range or removing memory constraints. Remember that sold and suspended listings are excluded from public search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {listings.map((item) => {
                const isShortlisted = savedShortlistIds.has(item._id);
                const hasMissingBattery = item.missingDisclosures?.some((d) =>
                  d.toLowerCase().includes('battery')
                );

                return (
                  <div
                    key={item._id}
                    className="group rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between overflow-hidden hover:shadow-xl hover:shadow-emerald-950/10"
                  >
                    <div>
                      {/* Image Header with Price & Badges */}
                      <div className="relative h-44 bg-slate-950 overflow-hidden">
                        <img
                          src={
                            item.images?.[0] ||
                            'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80'
                          }
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-slate-700/60">
                            {item.category}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize ${
                              item.condition === 'excellent'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800/90 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {item.condition}
                          </span>
                        </div>

                        {/* Shortlist Button */}
                        <button
                          onClick={() => handleShortlistToggle(item._id)}
                          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer ${
                            isShortlisted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-900/80 text-slate-400 hover:text-white'
                          }`}
                          title="Save to Shortlist"
                        >
                          <Bookmark className="h-4 w-4" />
                        </button>

                        {/* Price Overlay */}
                        <div className="absolute bottom-3 left-3">
                          <div className="text-xl font-black text-white">
                            ${item.price}{' '}
                            <span className="text-xs font-normal text-slate-400">{item.currency}</span>
                          </div>
                        </div>

                        {/* Seller Reputation Badge */}
                        <div className="absolute bottom-3 right-3 text-right">
                          <div className="text-[10px] text-slate-400 font-medium">
                            Seller Rep: <span className="text-emerald-400 font-bold">{item.sellerId?.reputationScore || 95}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Listing Body */}
                      <div className="p-4 space-y-3">
                        <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
                          {item.title}
                        </h3>

                        {/* Spec Pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {item.structuredSpecs?.cpu && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                              {item.structuredSpecs.cpu}
                            </span>
                          )}
                          {item.structuredSpecs?.ramGb && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                              {item.structuredSpecs.ramGb}GB RAM
                            </span>
                          )}
                          {item.structuredSpecs?.storageGb && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                              {item.structuredSpecs.storageGb}GB SSD
                            </span>
                          )}
                        </div>

                        {/* Missing Disclosure Warning Pill (Demonstration Feature) */}
                        {hasMissingBattery ? (
                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            <span>Gap Flagged: Battery Health not disclosed by seller</span>
                          </div>
                        ) : item.conditionDisclosures?.batteryHealthPct ? (
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span>
                              Battery Disclosed: {item.conditionDisclosures.batteryHealthPct}% ({item.conditionDisclosures.batteryCycleCount || '0'} cycles)
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 pt-0 border-t border-slate-800/80 mt-2 flex items-center gap-2">
                      <button
                        onClick={() => onOpenDetail(item._id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-400" /> Inspect & Compare
                      </button>
                      <button
                        onClick={() => onOpenDetail(item._id, 'spec-rag')}
                        className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Ask RAG AI about upgrade compatibility"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Ask RAG
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingSearchScreen;
