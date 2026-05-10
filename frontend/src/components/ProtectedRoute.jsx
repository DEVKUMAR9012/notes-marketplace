import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // ✅ FIX 1: Consistent Dark Theme ecosystem matched, no sudden bright flashes
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // ✅ FIX 2: User ki current location pass ki taaki login ke baad wahi wapas aaye
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}