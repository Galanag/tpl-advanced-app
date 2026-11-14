import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Users, UserCheck, UserX, CheckCircle2, Loader2, Banknote, X } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { supabase } from '../../lib/supabase';
import GlassCard from '../../components/GlassCard';
import SkeletonLoader from '../../components/SkeletonLoader';

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const AdminUsers = () => {
  // Stable selectors — subscribe only to needed state, actions are stable references
  const users = useAdminStore((s) => s.users);
  const loading = useAdminStore((s) => s.loading);
  const fetchUsers = useAdminStore((s) => s.fetchUsers);
  const activateUser = useAdminStore((s) => s.activateUser);
  const suspendUser = useAdminStore((s) => s.suspendUser);

  const [search, setSearch] = useState('');
  const [activating, setActivating] = useState(null);
  const [financialData, setFinancialData] = useState({});
  const [viewDetailsUser, setViewDetailsUser] = useState(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  // Mount guard for async operations
  const isMountedRef = useRef(true);

  // Memoized financial data fetcher — no external dependencies (supabase is stable module import)
  const fetchFinancialData = useCallback(async () => {
    setLoadingFinancial(true);
    try {
      const [
        { data: depositsData, error: depositsError },
        { data: withdrawnData, error: withdrawnError },
        { data: commissionsData, error: commissionsError },
      ] = await Promise.all([
        supabase.from('deposits').select('user_id, sum(amount) as total').eq('status', 'approved').group('user_id'),
        supabase.from('withdrawals').select('user_id, sum(amount) as total').in('status', ['approved', 'completed']).group('user_id'),
        supabase.from('commissions').select('user_id, sum(amount) as total').group('user_id'),
      ]);

      if (depositsError) throw depositsError;
      if (withdrawnError) throw withdrawnError;
      if (commissionsError) throw commissionsError;

      const depositsMap = {};
      (depositsData || []).forEach((row) => { depositsMap[row.user_id] = parseFloat(row.total) || 0; });

      const withdrawnMap = {};
      (withdrawnData || []).forEach((row) => { withdrawnMap[row.user_id] = parseFloat(row.total) || 0; });

      const commissionsMap = {};
      (commissionsData || []).forEach((row) => { commissionsMap[row.user_id] = parseFloat(row.total) || 0; });

      const combined = {};
      const allUserIds = new Set([
        ...Object.keys(depositsMap),
        ...Object.keys(withdrawnMap),
        ...Object.keys(commissionsMap),
      ]);
      allUserIds.forEach((userId) => {
        combined[userId] = {
          deposits: depositsMap[userId] || 0,
          withdrawn: withdrawnMap[userId] || 0,
          commissions: commissionsMap[userId] || 0,
        };
      });

      if (isMountedRef.current) setFinancialData(combined);
    } catch (err) {
      console.error('Error fetching financial data:', err);
    } finally {
      if (isMountedRef.current) setLoadingFinancial(false);
    }
  }, []);

  // Effect 1: Financial data — fetch once on mount only (no search dependency)
  useEffect(() => {
    isMountedRef.current = true;
    fetchFinancialData();
    return () => { isMountedRef.current = false; };
  }, [fetchFinancialData]);

  // Effect 2: Users — fetch when search changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMountedRef.current) fetchUsers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  const handleActivate = async (userId) => {
    setActivating(userId);
    try { await activateUser(userId); } finally { setActivating(null); }
  };

  const pendingCount = users.filter((u) => u.account_status === 'pending').length;
  const activeCount = users.filter((u) => u.account_status === 'active').length;

  const handleCloseDetails = () => setViewDetailsUser(null);
  const handleOpenDetails = (user) => setViewDetailsUser(user);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-white font-semibold">Users ({users.length})</h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400">{pendingCount} pending</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">{activeCount} active</span>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="tel"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-input pl-10"
          placeholder="Search by phone number..."
        />
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonLoader key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : users.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Users size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No users found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const fin = financialData[user.id] || { deposits: 0, withdrawn: 0, commissions: 0 };
            return (
              <GlassCard key={user.id} className="flex items-center gap-3 py-3 px-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {(user.full_name || user.phone || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">{user.full_name || 'Unnamed'}</p>
                  <p className="text-white/40 text-xs">{user.phone}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${STATUS_COLORS[user.account_status] || STATUS_COLORS.pending}`}>
                  {user.account_status}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-white/50 text-xs">Bal: {(parseFloat(user.balance) || 0).toFixed(1)}</span>
                  <span className="text-white/50 text-xs ml-2">Dep: {fin.deposits.toFixed(1)}</span>
                  <span className="text-white/50 text-xs ml-2">Wd: {fin.withdrawn.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {user.account_status === 'pending' && (
                    <button
                      onClick={() => handleActivate(user.id)}
                      disabled={activating === user.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-all active:scale-95"
                    >
                      {activating === user.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Mark Paid
                    </button>
                  )}
                  {user.account_status === 'active' && (
                    <button
                      onClick={() => suspendUser(user.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-all active:scale-95"
                    >
                      <UserX size={12} />
                      Suspend
                    </button>
                  )}
                  {user.account_status === 'suspended' && (
                    <button
                      onClick={() => handleActivate(user.id)}
                      disabled={activating === user.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-all active:scale-95"
                    >
                      <UserCheck size={12} />
                      Reactivate
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenDetails(user)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/60 text-xs font-medium hover:bg-white/20 transition-all active:scale-95"
                  >
                    <Banknote size={12} />
                    Details
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* User Details Modal */}
      {viewDetailsUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80">
          <GlassCard className="w-full max-w-2xl p-6 fade-in-up">
            <button
              onClick={handleCloseDetails}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors active:scale-95"
            >
              <X size={18} />
            </button>
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-white font-bold text-xl">{viewDetailsUser.full_name || 'Unnamed'}</h3>
                <p className="text-white/50 text-sm">{viewDetailsUser.phone}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/50 text-semibold">VIP Level</p>
                  <p className="text-white font-semibold text-lg">{viewDetailsUser.vip_level || 'Basic'}</p>
                </div>
                <div>
                  <p className="text-white/50 text-semibold">Account Status</p>
                  <p className="text-white font-semibold text-lg">{viewDetailsUser.account_status}</p>
                </div>
                <div>
                  <p className="text-white/50 text-semibold">Available Balance</p>
                  <p className="text-white font-semibold text-lg">
                    {(parseFloat(viewDetailsUser.balance) || 0).toFixed(2)} ETB
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-semibold">Total Deposits (Approved)</p>
                  <p className="text-white font-semibold text-lg">
                    {(financialData[viewDetailsUser.id]?.deposits || 0).toFixed(2)} ETB
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-semibold">Total Withdrawn (Approved/Completed)</p>
                  <p className="text-white font-semibold text-lg">
                    {(financialData[viewDetailsUser.id]?.withdrawn || 0).toFixed(2)} ETB
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-semibold">Total Earnings (Commissions)</p>
                  <p className="text-white font-semibold text-lg">
                    {(financialData[viewDetailsUser.id]?.commissions || 0).toFixed(2)} ETB
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-semibold">Payment Method</p>
                  <p className="text-white font-semibold text-lg">
                    {viewDetailsUser.payment_method || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-semibold">Account Name</p>
                  <p className="text-white font-semibold text-lg">
                    {viewDetailsUser.payment_account_name || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-semibold">Account Number</p>
                  <p className="text-white font-semibold text-lg">
                    {viewDetailsUser.payment_account_number || 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;