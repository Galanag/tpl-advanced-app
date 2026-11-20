import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Users, UserCheck, UserX, CheckCircle2, Loader2, Banknote, X, Edit, Archive, Filter, Calendar } from 'lucide-react';
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
  // Store actions (keep existing logic)
  const { activateUser, suspendUser } = useAdminStore();

  // Local state for filtered users to allow complex querying without breaking the store
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  
  // Bulk Selection
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Action States
  const [activating, setActivating] = useState(null);
  const [financialData, setFinancialData] = useState({});
  const [viewDetailsUser, setViewDetailsUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [savingUser, setSavingUser] = useState(null);

  const isMountedRef = useRef(true);

  // ==========================================
  // 1. Fetch Financial Data
  // ==========================================
  const fetchFinancialData = useCallback(async () => {
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
    }
  }, []);

  // ==========================================
  // 2. Fetch Filtered Users
  // ==========================================
  const fetchFilteredUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_archived', false);

      if (filterStatus !== 'all') {
        query = query.eq('account_status', filterStatus);
      }
      
      if (filterDate) {
        // If a date is selected, filter users created on or after that date
        query = query.gte('created_at', filterDate);
      }

      if (search) {
        query = query.or(`phone.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (isMountedRef.current) {
        setUsers(data || []);
        // Clear selections when filters change to prevent invisible selections
        setSelectedUsers([]); 
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [filterStatus, filterDate, search]);

  // Initial Load
  useEffect(() => {
    isMountedRef.current = true;
    fetchFinancialData();
    return () => { isMountedRef.current = false; };
  }, [fetchFinancialData]);

  // Debounced fetch on filter/search change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFilteredUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchFilteredUsers]);

  // ==========================================
  // 3. Actions (Activate, Suspend, Edit)
  // ==========================================
  const handleActivate = async (userId) => {
    setActivating(userId);
    try { 
      await activateUser(userId); 
      fetchFilteredUsers(); // Refresh local view
    } finally { 
      setActivating(null); 
    }
  };

  const handleSuspend = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;
    setActivating(userId);
    try { 
      await suspendUser(userId); 
      fetchFilteredUsers();
    } finally { 
      setActivating(null); 
    }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSavingUser(editUser.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editUser.full_name,
          phone: editUser.phone,
          account_status: editUser.account_status,
          balance: parseFloat(editUser.balance),
          total_deposited: parseFloat(editUser.total_deposited),
          successful_referrals: parseInt(editUser.successful_referrals),
          team_size: parseInt(editUser.team_size),
          vip_level: editUser.vip_level,
          payment_method: editUser.payment_method,
          payment_account_name: editUser.payment_account_name,
          payment_account_number: editUser.payment_account_number,
        })
        .eq('id', editUser.id);
        
      if (error) throw error;
      setEditUser(null);
      fetchFilteredUsers(); 
    } catch (err) {
      console.error('Error saving user edits:', err);
      alert('Failed to save user edits. Please try again.');
    } finally {
      setSavingUser(null);
    }
  };

  // ==========================================
  // 4. Bulk Actions & Archiving
  // ==========================================
  const toggleSelect = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleSelectAllPending = () => {
    const pendingIds = users.filter(u => u.account_status === 'pending').map(u => u.id);
    setSelectedUsers(pendingIds);
  };

  const handleArchiveSelected = async () => {
    if (selectedUsers.length === 0) return alert("No users selected");
    if (!window.confirm(`Are you sure you want to archive ${selectedUsers.length} user(s)? They will be moved to the Archived tab.`)) return;

    setBulkLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_archived: true })
        .in('id', selectedUsers);
        
      if (error) throw error;
      setSelectedUsers([]);
      fetchFilteredUsers(); 
    } catch (err) {
      console.error('Error archiving users:', err);
      alert('Failed to archive users.');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-4 fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-white font-semibold">User Management ({users.length})</h2>
      </div>

      {/* Filter & Search Bar */}
      <GlassCard className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-10"
              placeholder="Search name or phone..."
            />
          </div>
          
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="glass-input pl-10"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="glass-input pl-10"
              title="Show users created on or after this date"
            />
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
          <button onClick={handleSelectAll} className="btn-secondary px-3 py-1.5 text-xs">
            {selectedUsers.length === users.length && users.length > 0 ? 'Clear Selection' : 'Select All'}
          </button>
          <button onClick={handleSelectAllPending} className="btn-secondary px-3 py-1.5 text-xs">
            Select All Pending
          </button>
          
          <div className="flex-1"></div>
          
          <span className="text-white/50 text-xs mx-2">{selectedUsers.length} selected</span>
          <button 
            onClick={handleArchiveSelected}
            disabled={selectedUsers.length === 0 || bulkLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              selectedUsers.length > 0 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
            }`}
          >
            {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />} 
            Archive Selected
          </button>
        </div>
      </GlassCard>

      {/* User List */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonLoader key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : users.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Users size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No users found matching your filters.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const fin = financialData[user.id] || { deposits: 0, withdrawn: 0, commissions: 0 };
            const isSelected = selectedUsers.includes(user.id);

            return (
              <GlassCard key={user.id} className={`p-4 flex flex-col md:flex-row items-start md:items-center gap-3 transition-colors ${isSelected ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                
                {/* Checkbox */}
                <div className="flex items-center h-full pt-1 md:pt-0">
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => toggleSelect(user.id)}
                    className="w-5 h-5 rounded border-white/20 bg-black/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer"
                  />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white/90 text-sm font-medium truncate">{user.full_name || 'Unnamed'}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[user.account_status] || STATUS_COLORS.pending}`}>
                      {user.account_status}
                    </span>
                    <span className="text-amber-400 text-[10px] border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      {user.vip_level || 'Basic'}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs mt-1">{user.phone}</p>
                </div>

                {/* Financials */}
                <div className="hidden lg:flex items-center gap-6 text-xs text-white/60 shrink-0">
                  <div className="text-right">
                    <p className="text-white/30">Balance</p>
                    <p className="text-white font-medium">{(parseFloat(user.balance) || 0).toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30">Deposited</p>
                    <p className="text-emerald-400 font-medium">{fin.deposits.toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30">Withdrawn</p>
                    <p className="text-red-400 font-medium">{fin.withdrawn.toFixed(1)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 mt-3 md:mt-0">
                  {user.account_status === 'pending' && (
                    <button onClick={() => handleActivate(user.id)} disabled={activating === user.id} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 flex items-center gap-1">
                      {activating === user.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Activate
                    </button>
                  )}
                  {user.account_status === 'active' && (
                    <button onClick={() => handleSuspend(user.id)} className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/25 flex items-center gap-1">
                      <UserX size={12} /> Suspend
                    </button>
                  )}
                  {user.account_status === 'suspended' && (
                    <button onClick={() => handleActivate(user.id)} disabled={activating === user.id} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 flex items-center gap-1">
                      <UserCheck size={12} /> Reactivate
                    </button>
                  )}
                  
                  <button onClick={() => setViewDetailsUser(user)} className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/60 text-xs font-medium hover:bg-white/20 flex items-center gap-1">
                    <Banknote size={12} /> Details
                  </button>
                  
                  <button onClick={() => setEditUser(user)} className="px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-400 text-xs font-medium hover:bg-violet-500/25 flex items-center gap-1">
                    <Edit size={12} /> Edit
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
          <GlassCard className="w-full max-w-2xl p-6 relative fade-in-up max-h-[90vh] overflow-y-auto">
            <button onClick={() => setViewDetailsUser(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/50">
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
                  <p className="text-white font-semibold text-lg capitalize">{viewDetailsUser.account_status}</p>
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
                  <p className="text-white/50 text-semibold">Total Withdrawn</p>
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
                  <p className="text-white font-semibold text-lg">{viewDetailsUser.payment_method || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-white/50 text-semibold">Account Name</p>
                  <p className="text-white font-semibold text-lg">{viewDetailsUser.payment_account_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-white/50 text-semibold">Account Number</p>
                  <p className="text-white font-semibold text-lg">{viewDetailsUser.payment_account_number || 'Not set'}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80">
          <GlassCard className="w-full max-w-2xl p-6 relative fade-in-up max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditUser(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/50">
              <X size={18} />
            </button>
            <h3 className="text-white font-bold text-xl mb-4">Edit User</h3>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-white/50 text-sm block mb-1.5">Full Name</label>
                  <input type="text" value={editUser.full_name || ''} onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })} className="glass-input" required />
                </div>
                <div>
                  <label className="text-white/50 text-sm block mb-1.5">Phone</label>
                  <input type="tel" value={editUser.phone || ''} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} className="glass-input" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-white/50 text-sm block mb-1.5">Status</label>
                  <select value={editUser.account_status} onChange={(e) => setEditUser({ ...editUser, account_status: e.target.value })} className="glass-input">
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-sm block mb-1.5">VIP Level</label>
                  <select value={editUser.vip_level} onChange={(e) => setEditUser({ ...editUser, vip_level: e.target.value })} className="glass-input">
                    <option value="Basic">Basic</option>
                    <option value="VIP1">VIP1</option>
                    <option value="VIP2">VIP2</option>
                    <option value="VIP3">VIP3</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-white/50 text-sm block mb-1.5">Balance (ETB)</label>
                  <input type="number" value={editUser.balance || ''} onChange={(e) => setEditUser({ ...editUser, balance: e.target.value })} className="glass-input" step="0.01" />
                </div>
                <div>
                  <label className="text-white/50 text-sm block mb-1.5">Active Referrals</label>
                  <input type="number" value={editUser.successful_referrals || ''} onChange={(e) => setEditUser({ ...editUser, successful_referrals: e.target.value })} className="glass-input" min="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-white/50 text-sm block mb-1.5">Total Deposited (ETB)</label>
                  <input type="number" value={editUser.total_deposited || ''} onChange={(e) => setEditUser({ ...editUser, total_deposited: e.target.value })} className="glass-input" step="0.01" />
                </div>
                <div>
                  <label className="text-white/50 text-sm block mb-1.5">Team Size</label>
                  <input type="number" value={editUser.team_size || ''} onChange={(e) => setEditUser({ ...editUser, team_size: e.target.value })} className="glass-input" min="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-white/50 text-sm block mb-1.5">Payment Method</label>
                  <input type="text" value={editUser.payment_method || ''} onChange={(e) => setEditUser({ ...editUser, payment_method: e.target.value })} className="glass-input" />
                </div>
                <div>
                  <label className="text-white/50 text-sm block mb-1.5">Account Name</label>
                  <input type="text" value={editUser.payment_account_name || ''} onChange={(e) => setEditUser({ ...editUser, payment_account_name: e.target.value })} className="glass-input" />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-white/50 text-sm block mb-1.5">Account Number</label>
                <input type="text" value={editUser.payment_account_number || ''} onChange={(e) => setEditUser({ ...editUser, payment_account_number: e.target.value })} className="glass-input" />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={savingUser} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {savingUser ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;