import { useEffect } from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import AdminDashboard from './pages/admin/AdminDashboard';
import Deposit from './pages/Deposit';
import EditProfile from './pages/profile/EditProfile';
import ChangePassword from './pages/profile/ChangePassword';
import Notifications from './pages/profile/Notifications';
import Privacy from './pages/profile/Privacy';
import PaymentMethods from './pages/profile/PaymentMethods';
import { useAuthStore } from './store/authStore';

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return children;
};

const router = createBrowserRouter([
   { path: '/auth', element: <Auth /> },
   {
     path: '/admin',
     element: (
       <ProtectedAdminRoute>
         <AdminDashboard />
       </ProtectedAdminRoute>
     ),
   },
   {
     path: '/',
     element: (
       <ProtectedRoute>
         <Layout />
       </ProtectedRoute>
     ),
     children: [
       { index: true, element: <Home /> },
       { path: 'tasks', element: <Tasks /> },
       { path: 'team', element: <Team /> },
       { path: 'wallet', element: <Wallet /> },
       { path: 'profile', element: <Profile /> },
       { path: 'profile/edit', element: <EditProfile /> },
       { path: 'profile/password', element: <ChangePassword /> },
       { path: 'profile/notifications', element: <Notifications /> },
       { path: 'profile/privacy', element: <Privacy /> },
       { path: 'profile/payment-methods', element: <PaymentMethods /> },
       { path: 'deposit', element: <Deposit /> },
     ],
   },
  { path: '*', element: <Navigate to="/" replace /> },
]);

const App = () => {
  const initAuth = useAuthStore((state) => state.initAuth);
  useEffect(() => { initAuth(); }, [initAuth]);
  return <RouterProvider router={router} />;
};

export default App;