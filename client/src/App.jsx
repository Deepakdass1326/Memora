import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ItemsProvider } from './context/ItemsContext';
import { ThemeProvider } from './context/ThemeContext';
import { WorkspacesProvider } from './context/WorkspacesContext';
import Sidebar from './components/layout/Sidebar';
import { cn } from './lib/utils';

// Pages
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import GraphPage from './pages/GraphPage';
import Search from './pages/Search';
import Resurface from './pages/Resurface';
import ItemDetail from './pages/ItemDetail';
import WorkspaceDetail from './pages/WorkspaceDetail';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppShell({ children }) {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={cn('main-content', collapsed && 'collapsed')}>
        {children}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
      background: 'var(--background)', gap: 16
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.5rem', color: 'var(--accent)' }}>
        memora
      </div>
      <div style={{ fontSize: '.85rem', color: 'var(--text-tertiary)' }}>Loading your second brain…</div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <WorkspacesProvider>
            <ItemsProvider>
              <AppShell><Dashboard /></AppShell>
            </ItemsProvider>
          </WorkspacesProvider>
        </ProtectedRoute>
      } />
      <Route path="/library" element={
        <ProtectedRoute>
          <WorkspacesProvider>
            <ItemsProvider>
              <AppShell><Library /></AppShell>
            </ItemsProvider>
          </WorkspacesProvider>
        </ProtectedRoute>
      } />
      <Route path="/graph" element={
        <ProtectedRoute>
          <WorkspacesProvider>
            <ItemsProvider>
              <AppShell><GraphPage /></AppShell>
            </ItemsProvider>
          </WorkspacesProvider>
        </ProtectedRoute>
      } />
      <Route path="/search" element={
        <ProtectedRoute>
          <WorkspacesProvider>
            <ItemsProvider>
              <AppShell><Search /></AppShell>
            </ItemsProvider>
          </WorkspacesProvider>
        </ProtectedRoute>
      } />
      <Route path="/resurface" element={
        <ProtectedRoute>
          <WorkspacesProvider>
            <ItemsProvider>
              <AppShell><Resurface /></AppShell>
            </ItemsProvider>
          </WorkspacesProvider>
        </ProtectedRoute>
      } />
      <Route path="/item/:id" element={
        <ProtectedRoute>
          <WorkspacesProvider>
            <ItemsProvider>
              <AppShell><ItemDetail /></AppShell>
            </ItemsProvider>
          </WorkspacesProvider>
        </ProtectedRoute>
      } />
      <Route path="/workspace/:id" element={
        <ProtectedRoute>
          <WorkspacesProvider>
            <ItemsProvider>
              <AppShell><WorkspaceDetail /></AppShell>
            </ItemsProvider>
          </WorkspacesProvider>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--card)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '.85rem',
                boxShadow: 'var(--shadow-lg)',
                fontFamily: 'var(--font-body)',
              },
              success: { iconTheme: { primary: 'var(--accent)', secondary: 'white' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
