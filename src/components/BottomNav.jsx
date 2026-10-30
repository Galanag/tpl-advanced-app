import { NavLink } from 'react-router-dom';
import { Home, PlayCircle, Users, Wallet, User, Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/tasks', label: 'Tasks', icon: PlayCircle },
  { path: '/team', label: 'Team', icon: Users },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
  { path: '/profile', label: 'Profile', icon: User },
];

const BottomNav = () => {
  const { profile } = useAuthStore();

  // Base nav items
  let navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/tasks', label: 'Tasks', icon: PlayCircle },
    { path: '/team', label: 'Team', icon: Users },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  // Add admin nav item if the user is an admin
  if (profile?.is_admin) {
    navItems = [
      ...navItems.slice(0, 4), // Home, Tasks, Team, Wallet
      { path: '/admin', label: 'Admin', icon: Settings },
      ...navItems.slice(4), // Profile and anything after (currently just Profile)
    ];
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `nav-item flex-1 h-full ${
                isActive ? 'text-amber-400' : 'text-white/50 hover:text-white/80'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
