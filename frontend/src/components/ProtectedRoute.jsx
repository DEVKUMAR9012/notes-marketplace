import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-gradient)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-coral-500/30 border-t-coral-500 rounded-full animate-spin" />
          <p className="text-gray-600 text-sm font-medium">Opening link...</p>
        </div>
      </div>
    );
  }

  return children;
}