import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import { GuestGuardProvider } from './context/GuestGuardContext';
import { warmupServer } from './utils/api';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import ActiveBanners from './components/ActiveBanners';

// ── Lazy-loaded pages (code splitting — each page is a separate JS chunk)
// This means the browser only downloads code for the page the user is on.
const Home          = lazy(() => import('./pages/Home'));
const Explorer      = lazy(() => import('./pages/Explorer'));
const LoginSocialOnly = lazy(() => import('./pages/LoginSocialOnly'));
const RegisterSocialOnly = lazy(() => import('./pages/RegisterSocialOnly'));
const VerifyOTP     = lazy(() => import('./pages/VerifyOTP'));
const Books         = lazy(() => import('./pages/Books'));
const Upload        = lazy(() => import('./pages/Upload'));
const Profile       = lazy(() => import('./pages/Profile'));
const Cart          = lazy(() => import('./pages/Cart'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Contact       = lazy(() => import('./pages/Contact'));
const Chat          = lazy(() => import('./pages/Chat'));
const AI            = lazy(() => import('./pages/AI'));

// Inline fallback — zero dependencies, renders instantly from CSS
const PageLoader = () => (
  <div style={{
    position: 'fixed', inset: 0, background: '#050508', zIndex: 50,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px'
  }}>
    <div style={{
      width: 40, height: 40,
      border: '3px solid rgba(139,92,246,0.2)',
      borderTopColor: '#8b5cf6',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: 'system-ui', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      NotesHere
    </span>
  </div>
);

// eslint-disable-next-line no-unused-vars
const LayoutWithNavbar = ({ children }) => (
  <>
    <Navbar />
    <ActiveBanners />
    {children}
  </>
);

function App() {
  useEffect(() => {
    warmupServer();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <CartProvider>
            <BrowserRouter>
              <GuestGuardProvider>
                {/* Suspense catches lazy-loaded chunks — fallback shows immediately */}
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* ── PUBLIC ROUTES ── */}
                    <Route path="/login"      element={<LoginSocialOnly />} />
                    <Route path="/register"   element={<RegisterSocialOnly />} />
                    <Route path="/verify-otp" element={<VerifyOTP />} />

                    {/* ── PROTECTED ROUTES ── */}
                    <Route path="/" element={
                      <ProtectedRoute><LayoutWithNavbar><Home /></LayoutWithNavbar></ProtectedRoute>
                    } />
                    <Route path="/explorer" element={
                      <ProtectedRoute><LayoutWithNavbar><Explorer /></LayoutWithNavbar></ProtectedRoute>
                    } />
                    <Route path="/books" element={
                      <ProtectedRoute><LayoutWithNavbar><Books /></LayoutWithNavbar></ProtectedRoute>
                    } />
                    <Route path="/upload" element={
                      <ProtectedRoute><LayoutWithNavbar><Upload /></LayoutWithNavbar></ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                      <ProtectedRoute><LayoutWithNavbar><Profile /></LayoutWithNavbar></ProtectedRoute>
                    } />
                    <Route path="/profile/:id" element={
                      <ProtectedRoute><LayoutWithNavbar><Profile /></LayoutWithNavbar></ProtectedRoute>
                    } />
                    <Route path="/cart" element={
                      <ProtectedRoute><LayoutWithNavbar><Cart /></LayoutWithNavbar></ProtectedRoute>
                    } />
                    <Route path="/admin/dashboard" element={
                      <ProtectedRoute><LayoutWithNavbar><AdminDashboard /></LayoutWithNavbar></ProtectedRoute>
                    } />
                    <Route path="/contact" element={
                      <ProtectedRoute><LayoutWithNavbar><Contact /></LayoutWithNavbar></ProtectedRoute>
                    } />
                    <Route path="/chat" element={
                      <ProtectedRoute><LayoutWithNavbar><Chat /></LayoutWithNavbar></ProtectedRoute>
                    } />
                    <Route path="/ai" element={
                      <ProtectedRoute><LayoutWithNavbar><AI /></LayoutWithNavbar></ProtectedRoute>
                    } />

                    {/* ── 404 ── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </GuestGuardProvider>
            </BrowserRouter>
          </CartProvider>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;