import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ProtectedSuperAdminRoute = ({ children }) => {
  const { user, profile, loading } = useAuthStore();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  if (!user || profile?.is_super_admin !== true) return <Navigate to="/" replace />;
  
  return children;
};

export default ProtectedSuperAdminRoute;
