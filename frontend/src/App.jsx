import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import { warmupServer } from './utils/api';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';  // ⭐ NEW - OTP verification
import Books from './pages/Books';
import Upload from './pages/Upload';
import Profile from './pages/Profile';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';  // ⭐ NEW - Payment checkout
import AdminEmailDashboard from './pages/AdminEmailDashboard';  // ⭐ NEW - Email System
import Contact from './pages/Contact';  // ⭐ NEW - Contact & Support Page
import Chat from './pages/Chat';  // ⭐ NEW - Real-time Chat

// Layout wrapper component to avoid repetition
// eslint-disable-next-line no-unused-vars
const LayoutWithNavbar = ({ children }) => (
  <>
    <Navbar />
    {children}
  </>
);

function App() {
  // ✅ WARM UP SERVER ON APP START
  useEffect(() => {
    warmupServer();
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <Routes>
            {/* ========== PUBLIC ROUTES (No Navbar) ========== */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />  {/* ⭐ NEW */}

            {/* ========== PROTECTED ROUTES (With Navbar) ========== */}

            {/* Home - Browse all notes (public but navbar shows if logged in) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <LayoutWithNavbar>
                    <Home />
                  </LayoutWithNavbar>
                </ProtectedRoute>
              }
            />

            {/* Books - Browse and purchase notes */}
            <Route
              path="/books"
              element={
                <ProtectedRoute>
                  <LayoutWithNavbar>
                    <Books />
                  </LayoutWithNavbar>
                </ProtectedRoute>
              }
            />

            {/* Upload - Upload new notes (sellers only) */}
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <LayoutWithNavbar>
                    <Upload />
                  </LayoutWithNavbar>
                </ProtectedRoute>
              }
            />

            {/* Profile - User profile and seller dashboard */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <LayoutWithNavbar>
                    <Profile />
                  </LayoutWithNavbar>
                </ProtectedRoute>
              }
            />

            {/* Cart - Shopping cart */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <LayoutWithNavbar>
                    <Cart />
                  </LayoutWithNavbar>
                </ProtectedRoute>
              }
            />

            {/* Checkout - Payment and order confirmation */}
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <LayoutWithNavbar>
                    <Checkout />
                  </LayoutWithNavbar>
                </ProtectedRoute>
              }
            />

            {/* Admin Email Dashboard */}
            <Route
              path="/admin/email"
              element={
                <ProtectedRoute>
                  <LayoutWithNavbar>
                    <AdminEmailDashboard />
                  </LayoutWithNavbar>
                </ProtectedRoute>
              }
            />

            {/* Contact & Support Page */}
            <Route
              path="/contact"
              element={
                <ProtectedRoute>
                  <LayoutWithNavbar>
                    <Contact />
                  </LayoutWithNavbar>
                </ProtectedRoute>
              }
            />

            {/* Chat - Real-time messaging */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <LayoutWithNavbar>
                    <Chat />
                  </LayoutWithNavbar>
                </ProtectedRoute>
              }
            />

            {/* ========== 404 - Unknown Routes ========== */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;