import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Navigation from './components/Navigation';

// Lazy loading pages
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const GroupDashboard = lazy(() => import('./pages/GroupDashboard'));
const Events = lazy(() => import('./pages/Events'));
const Polls = lazy(() => import('./pages/Polls'));
const KittyParty = lazy(() => import('./pages/KittyParty'));
const Finances = lazy(() => import('./pages/Finances'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Reports = lazy(() => import('./pages/Reports'));

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { token, isLoadingUser } = useApp();

  if (isLoadingUser) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-obsidian)',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner"></div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Verifying session details...</div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Layout for inside group workspace routing
const GroupLayout = () => {
  const { activeGroup } = useApp();

  if (!activeGroup) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw' }}>
      <Navigation />
      <div className="group-content-wrapper" style={{ display: 'flex', flex: 1, backgroundColor: 'var(--bg-obsidian)' }}>
        {/* Navigation.jsx renders header and sidebar. The sidebar is floated left.
            The contents pane takes the remaining space. */}
        <main style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
          <Suspense fallback={
            <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner"></div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// General profile/dashboard layout (includes header navigation without the group-specific sidebar)
const UserSettingsLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navigation />
      <main style={{ flex: 1, backgroundColor: 'var(--bg-obsidian)', padding: '2rem' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner"></div>
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

const TitleManager = () => {
  const location = useLocation();
  const { activeGroup } = useApp();

  useEffect(() => {
    const path = location.pathname;

    if (path === '/') {
      document.title = 'Mehfil';
    } else if (path === '/login') {
      document.title = 'Mehfil | Login';
    } else if (path === '/signup' || path === '/register') {
      document.title = 'Mehfil | Create Account';
    } else if (path === '/dashboard') {
      document.title = 'Mehfil | Dashboard';
    } else if (path === '/profile') {
      document.title = 'Mehfil | Profile';
    } else if (path === '/settings') {
      document.title = 'Mehfil | Settings';
    } else if (path.endsWith('/reports')) {
      document.title = 'Mehfil | Reports';
    } else if (path.startsWith('/group/')) {
      document.title = activeGroup ? `Mehfil | ${activeGroup.name}` : 'Mehfil';
    } else {
      document.title = 'Mehfil';
    }
  }, [location.pathname, activeGroup]);

  return null;
};

export default function App() {
  return (
    <AppProvider>
      <Router>
        <TitleManager />
        <Routes>
          {/* Public Authentication routes */}
          {/* Public Landing Page */}
          <Route path="/" element={
            <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-obsidian)' }}><div className="spinner"></div></div>}>
              <Landing />
            </Suspense>
          } />

          {/* Public Authentication routes */}
          <Route path="/login" element={
            <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-obsidian)' }}><div className="spinner"></div></div>}>
              <Login />
            </Suspense>
          } />
          <Route path="/signup" element={
            <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-obsidian)' }}><div className="spinner"></div></div>}>
              <Signup />
            </Suspense>
          } />
          <Route path="/register" element={
            <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-obsidian)' }}><div className="spinner"></div></div>}>
              <Signup />
            </Suspense>
          } />

          {/* Secure Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Personal Panel Routes */}
            <Route path="/dashboard" element={
              <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-obsidian)' }}><div className="spinner"></div></div>}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="/profile" element={
              <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-obsidian)' }}><div className="spinner"></div></div>}>
                <Profile />
              </Suspense>
            } />

            {/* Active Group Workspace routing */}
            <Route path="/group/:groupId" element={<GroupLayout />}>
              <Route index element={<GroupDashboard />} />
              <Route path="events" element={<Events />} />
              <Route path="polls" element={<Polls />} />
              <Route path="finances" element={<Finances />} />
              <Route path="kitty" element={<KittyParty />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Route>

          {/* Root fallback redirects */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}
