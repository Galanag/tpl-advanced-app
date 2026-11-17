import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import GlassCard from '../../components/GlassCard';
import SkeletonLoader from '../../components/SkeletonLoader';
import { RefreshCw, ExternalLink } from 'lucide-react';

const SuperAdminDashboard = () => {
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deposits'); // 'deposits' or 'withdrawals'
  const [filterStatus, setFilterStatus] = useState('pending'); // 'all', 'pending', 'approved', 'completed'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [depRes, wdRes] = await Promise.all([
        supabase.from('deposits').select(`*, profile:user_id (full_name, phone)`).order('created_at', { ascending: false }),
        supabase.from('withdrawals').select(`*, profile:user_id (full_name, phone)`).order('created_at', { ascending: false })
      ]);
      
      if (depRes.error) throw depRes.error;
      if (wdRes.error) throw wdRes.error;

      setDeposits(depRes.data || []);
      setWithdrawals(wdRes.data || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Calculate Global Metrics ---
  const totalDeposited = deposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const totalApprovedDeposits = deposits.filter(d => d.status === 'approved').reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const totalPendingDeposits = deposits.filter(d => d.status === 'pending').reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  
  // Only count approved/completed as "Withdrawn"
  const totalWithdrawn = withdrawals.filter(w => ['approved', 'completed'].includes(w.status)).reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);
  const totalPendingWithdrawals = withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);

  // --- Determine which data to show in the table ---
  const currentData = activeTab === 'deposits' ? deposits : withdrawals;
  const filteredData = filterStatus === 'all' ? currentData : currentData.filter(item => item.status === filterStatus);

  if (loading) return <div className="p-6"><SkeletonLoader className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Super Admin Overview</h2>
          <p className="text-white/50 text-sm">Global financial tracking across the entire platform</p>
        </div>
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <GlassCard className="p-4 border-l-4 border-amber-500">
          <p className="text-white/50 text-xs uppercase tracking-wide">Total Deposits (All)</p>
          <p className="text-xl font-bold text-white mt-1">{totalDeposited.toFixed(2)} ETB</p>
        </GlassCard>
        <GlassCard className="p-4 border-l-4 border-emerald-500">
          <p className="text-white/50 text-xs uppercase tracking-wide">Approved Deposits</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{totalApprovedDeposits.toFixed(2)} ETB</p>
        </GlassCard>
        <GlassCard className="p-4 border-l-4 border-yellow-500">
          <p className="text-white/50 text-xs uppercase tracking-wide">Pending Deposits</p>
          <p className="text-xl font-bold text-yellow-400 mt-1">{totalPendingDeposits.toFixed(2)} ETB</p>
        </GlassCard>
        <GlassCard className="p-4 border-l-4 border-sky-500">
          <p className="text-white/50 text-xs uppercase tracking-wide">Total Withdrawn</p>
          <p className="text-xl font-bold text-sky-400 mt-1">{totalWithdrawn.toFixed(2)} ETB</p>
        </GlassCard>
        <GlassCard className="p-4 border-l-4 border-red-500">
          <p className="text-white/50 text-xs uppercase tracking-wide">Pending Withdrawals</p>
          <p className="text-xl font-bold text-red-400 mt-1">{totalPendingWithdrawals.toFixed(2)} ETB</p>
        </GlassCard>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="flex bg-black/40 rounded-lg p-1">
          <button onClick={() => { setActiveTab('deposits'); setFilterStatus('all'); }} className={`px-6 py-2 rounded-md text-sm font-medium transition ${activeTab === 'deposits' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-white/60 hover:text-white'}`}>
            Deposits
          </button>
          <button onClick={() => { setActiveTab('withdrawals'); setFilterStatus('all'); }} className={`px-6 py-2 rounded-md text-sm font-medium transition ${activeTab === 'withdrawals' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-white/60 hover:text-white'}`}>
            Withdrawals
          </button>
        </div>
        
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'completed'].map(status => (
            <button 
              key={status} 
              onClick={() => setFilterStatus(status)} 
              className={`px-3 py-1.5 rounded-lg text-xs capitalize border transition ${filterStatus === status ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-white/10 text-white/50 hover:bg-white/5'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-white/50 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Phone</th>
                <th className="p-4 font-medium text-right">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Date</th>
                {activeTab === 'deposits' && <th className="p-4 font-medium">Proof</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/40">No records found for this filter.</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white font-medium">{item.profile?.full_name || 'Unknown User'}</td>
                    <td className="p-4 text-white/60 text-sm">{item.profile?.phone || 'N/A'}</td>
                    <td className="p-4 text-right font-bold text-amber-400">{parseFloat(item.amount).toFixed(2)} ETB</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 
                        item.status === 'approved' || item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-white/50 text-sm">{new Date(item.created_at).toLocaleDateString()}</td>
                    {activeTab === 'deposits' && (
                      <td className="p-4">
                        {item.proof_image_url ? (
                          <a href={item.proof_image_url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 flex items-center gap-1 text-xs">
                            View <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-white/30 text-xs">None</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;