import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Books from './pages/Books';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Profile from './pages/Profile';
import Cart from './pages/Cart';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Routes (No Navbar) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes (With Navbar) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Home />
                </>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/books"
            element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Books />
                </>
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Upload />
                </>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Profile />
                </>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Cart />
                </>
              </ProtectedRoute>
            }
          />
          
          {/* Redirect any unknown route to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;