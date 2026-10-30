import { NavLink } from 'react-router-dom';
import { Home, PlayCircle, Users, Wallet, User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/tasks', label: 'Tasks', icon: PlayCircle },
  { path: '/team', label: 'Team', icon: Users },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
  { path: '/profile', label: 'Profile', icon: User },
];

const Sidebar = () => {
  const { profile, signOut } = useAuthStore();

  // Base nav items
  let navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/tasks', label: 'Tasks', icon: PlayCircle },
    { path: '/team', label: 'Team', icon: Users },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  // Add admin nav item if the user is an admin
  if (profile?.is_admin) {
    navItems = [
      ...navItems.slice(0, 4), // Dashboard, Tasks, Team, Wallet
      { path: '/admin', label: 'Admin', icon: Settings },
      ...navItems.slice(4), // Profile and anything after (currently just Profile)
    ];
  }

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 glass border-r border-white/10 py-6 px-4">
      <div className="text-center mb-4">
        <img src="/logo.png" alt="HIDASE Logo" className="w-32 h-auto mx-auto mb-2" />
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </NavLink>
        ))}
      </nav>

      <button
        onClick={signOut}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
      >
        <LogOut size={20} />
        <span className="font-medium">Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;