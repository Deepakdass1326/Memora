import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ItemsProvider } from './context/ItemsContext';
import Sidebar from './components/layout/Sidebar';

// Pages
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import GraphPage from './pages/GraphPage';
import Search from './pages/Search';
import Resurface from './pages/Resurface';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      {children}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--accent)' }}>
        memora
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Loading your second brain…</div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <ItemsProvider>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ItemsProvider>
        </ProtectedRoute>
      } />
      <Route path="/library" element={
        <ProtectedRoute>
          <ItemsProvider>
            <AppShell>
              <Library />
            </AppShell>
          </ItemsProvider>
        </ProtectedRoute>
      } />
      <Route path="/graph" element={
        <ProtectedRoute>
          <ItemsProvider>
            <AppShell>
              <GraphPage />
            </AppShell>
          </ItemsProvider>
        </ProtectedRoute>
      } />
      <Route path="/search" element={
        <ProtectedRoute>
          <ItemsProvider>
            <AppShell>
              <Search />
            </AppShell>
          </ItemsProvider>
        </ProtectedRoute>
      } />
      <Route path="/resurface" element={
        <ProtectedRoute>
          <ItemsProvider>
            <AppShell>
              <Resurface />
            </AppShell>
          </ItemsProvider>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              boxShadow: 'var(--shadow-lg)',
              fontFamily: 'var(--font-body)',
            },
            success: {
              iconTheme: { primary: 'var(--accent)', secondary: 'white' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
