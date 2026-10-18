function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

async function request(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const method = (options.method || 'GET').toUpperCase();
  const csrfToken = getCookie('XSRF-TOKEN') || (typeof window !== 'undefined' ? window.__CSRF_TOKEN__ : null);
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    defaultHeaders['X-CSRF-Token'] = csrfToken;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Sends HTTP-only session cookies
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (data && data.csrfToken && typeof window !== 'undefined') {
    window.__CSRF_TOKEN__ = data.csrfToken;
  }

  if (!response.ok) {
    const error = new Error(data.message || `HTTP ${response.status}: Request failed`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    signup: (userData) => request('/auth/signup', { method: 'POST', body: userData }),
    login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    getMe: () => request('/auth/me', { method: 'GET' }),
    getCsrfToken: () => request('/auth/csrf-token', { method: 'GET' }),
    verifyEmail: (token) => request('/auth/verify-email', { method: 'POST', body: { token } }),
    resendVerification: (email) => request('/auth/resend-verification', { method: 'POST', body: { email } }),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload }),
  },

  // Listings
  listings: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/listings${query ? `?${query}` : ''}`, { method: 'GET' });
    },
    getById: (id) => request(`/listings/${id}`, { method: 'GET' }),
    create: (listingData) => request('/listings', { method: 'POST', body: listingData }),
    update: (id, updates) => request(`/listings/${id}`, { method: 'PATCH', body: updates }),
    submitEvidence: (id, evidenceData) => request(`/listings/${id}/evidence`, { method: 'POST', body: evidenceData }),
    getMyListings: () => request('/listings/seller/me', { method: 'GET' }),
    report: (id, payload) => request(`/listings/${id}/report`, { method: 'POST', body: payload }),
  },

  // Buyer & Interaction Features
  buyer: {
    addToShortlist: (payload) => request('/shortlists', { method: 'POST', body: payload }),
    getShortlists: () => request('/shortlists', { method: 'GET' }),
    removeFromShortlist: (id) => request(`/shortlists/${id}`, { method: 'DELETE' }),
    askQuestion: (listingId, message, subject) =>
      request(`/listings/${listingId}/questions`, { method: 'POST', body: { message, subject } }),
    getListingQuestions: (listingId) => request(`/listings/${listingId}/questions`, { method: 'GET' }),
    getMyInquiries: () => request('/buyer/inquiries', { method: 'GET' }),
    replyQuestion: (threadId, message) =>
      request(`/questions/${threadId}/reply`, { method: 'POST', body: { message } }),
    requestViewing: (listingId, viewingData) =>
      request(`/listings/${listingId}/viewings`, { method: 'POST', body: viewingData }),
    getMyViewings: () => request('/buyer/viewings', { method: 'GET' }),
    updateViewingStatus: (viewingId, status, sellerNotes) =>
      request(`/viewings/${viewingId}/status`, { method: 'PATCH', body: { status, sellerNotes } }),
  },

  // AI & RAG Engine
  ai: {
    runComparisonAgent: (query, budget) =>
      request('/comparison-agent', { method: 'POST', body: { query, budget } }),
    buyerChatRAG: (listingId, question) =>
      request('/buyer-chat', { method: 'POST', body: { listingId, question } }),
    semanticSearch: (searchParams) =>
      request('/semantic-search', { method: 'POST', body: searchParams }),
    getAgentTrace: (traceId) =>
      request(`/agent-runs/${traceId}`, { method: 'GET' }),
  },

  // Moderator Portal
  moderation: {
    getQueue: () => request('/moderation/queue', { method: 'GET' }),
    takeAction: (listingId, payload) =>
      request(`/moderation/listings/${listingId}/moderation`, { method: 'POST', body: payload }),
    getHistory: (listingId) =>
      request(`/moderation/listings/${listingId}/history`, { method: 'GET' }),
  },
};

export default api;
