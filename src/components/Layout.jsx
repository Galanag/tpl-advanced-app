import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Header from './Header';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';

const Layout = () => {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to auth if not logged in and not loading
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [isLoading, user, navigate]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header - sticky on all sizes */}
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - desktop only (>=768px) */}
        <Sidebar />

        {/* Main content - scrollable */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      /* Floating Support Button */
      <a
        href="https://t.me/Hidase_Investment_Admin"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-16 right-4 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 hover:text-blue-500 transition-all ease-out outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <MessageCircle size={20} className="text-blue-500" />
      </a>

      {/* Bottom nav - mobile only (<768px) */}
      <BottomNav />
    </div>
  );
};

export default Layout;