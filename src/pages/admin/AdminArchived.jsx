import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import GlassCard from '../../components/GlassCard';
import SkeletonLoader from '../../components/SkeletonLoader';
import { UserCheck, Users, Search } from 'lucide-react';

const AdminArchived = () => {
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchArchivedUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_archived', true);
        
      if (search) {
        query = query.or(`phone.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setArchivedUsers(data || []);
    } catch (err) {
      console.error('Error fetching archived users:', err);
      setError('Failed to load archived users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedUsers();
  }, [search]);

  const handleRestore = async (userId) => {
    if (!window.confirm('Are you sure you want to restore this user?')) return;
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_archived: false })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      fetchArchivedUsers();
    } catch (err) {
      console.error('Error restoring user:', err);
      alert('Failed to restore user.');
    }
  };

  return (
    <div className="space-y-4 fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-white font-semibold">Archived Users ({archivedUsers.length})</h2>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input pl-10 py-2 text-sm"
            placeholder="Search archived..."
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <SkeletonLoader key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : archivedUsers.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Users size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No archived users found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {archivedUsers.map((user) => (
            <GlassCard key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
              <div className="flex-1">
                <p className="text-white/90 text-sm font-medium">{user.full_name || 'Unnamed'}</p>
                <p className="text-white/40 text-xs">{user.phone}</p>
                <p className="text-amber-400 text-xs mt-1">VIP: {user.vip_level || 'Basic'}</p>
              </div>
              <button
                onClick={() => handleRestore(user.id)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <UserCheck size={16} /> Restore User
              </button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminArchived;