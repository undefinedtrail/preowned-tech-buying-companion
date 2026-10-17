import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ComparisonAgentChat from './components/ComparisonAgentChat';
import ListingSearchScreen from './screens/ListingSearchScreen';
import ListingDetailComparisonScreen from './screens/ListingDetailComparisonScreen';
import ShortlistAndEvidenceScreen from './screens/ShortlistAndEvidenceScreen';
import ViewingAndChatScreen from './screens/ViewingAndChatScreen';
import ModeratorDashboardScreen from './screens/ModeratorDashboardScreen';
import ProtectedRoute from './components/ProtectedRoute';

function MainApp() {
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState(null);
  const [initialDetailTab, setInitialDetailTab] = useState('overview');

  const handleOpenDetail = (id, tab = 'overview') => {
    setSelectedDetailId(id);
    setInitialDetailTab(tab);
  };

  const handleBackFromDetail = () => {
    setSelectedDetailId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar onOpenAgent={() => setIsAgentOpen(true)} />

      <main className="flex-1">
        {selectedDetailId ? (
          <ListingDetailComparisonScreen
            listingId={selectedDetailId}
            onBack={handleBackFromDetail}
            initialTab={initialDetailTab}
          />
        ) : (
          <Routes>
            <Route
              path="/search"
              element={
                <ListingSearchScreen
                  onOpenDetail={handleOpenDetail}
                  onOpenAgent={() => setIsAgentOpen(true)}
                />
              }
            />
            <Route
              path="/shortlist"
              element={
                <ShortlistAndEvidenceScreen onOpenDetail={handleOpenDetail} />
              }
            />
            <Route path="/viewings" element={<ViewingAndChatScreen />} />
            <Route
              path="/moderator"
              element={
                <ProtectedRoute allowedRoles={['moderator']}>
                  <ModeratorDashboardScreen />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/search" replace />} />
          </Routes>
        )}
      </main>

      {/* Floating Comparison Agent Drawer */}
      <ComparisonAgentChat
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
        onSelectListing={(id) => {
          setIsAgentOpen(false);
          handleOpenDetail(id);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>Preowned Tech Buying Companion • Project 07 Capstone • Verified Specifications & RAG AI</p>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
