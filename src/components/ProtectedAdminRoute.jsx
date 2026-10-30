import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ProtectedAdminRoute = ({ children }) => {
  const { user, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;
