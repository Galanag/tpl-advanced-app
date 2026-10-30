import { useEffect, useState } from 'react';
import { Copy, Check, Users, ChevronDown, ChevronUp, Link as LinkIcon, Award, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';

const LEVELS = [
  { level: 'P1', name: 'Bronze', required: 5, rate: '10%' },
  { level: 'P2', name: 'Silver', required: 9, rate: '3%' },
  { level: 'P3', name: 'Gold', required: 15, rate: '2%' },
  { level: 'P4', name: 'Platinum', required: 25, rate: '1%' },
  { level: 'P5', name: 'Diamond', required: 40, rate: '1%' },
  { level: 'P6', name: 'Ruby', required: 60, rate: '0.5%' },
  { level: 'P7', name: 'Emerald', required: 90, rate: '0.5%' },
  { level: 'P8', name: 'Sapphire', required: 130, rate: '0.25%' },
  { level: 'P9', name: 'Pearl', required: 180, rate: '0.25%' },
  { level: 'P10', name: 'Obsidian', required: 250, rate: '0.1%' },
  { level: 'P11', name: 'Titanium', required: 350, rate: '0.1%' },
  { level: 'P12', name: 'Master', required: 500, rate: '0.05%' },
  { level: 'P13', name: 'Grand Master', required: 750, rate: '0.05%' },
];

const Team = () => {
  const profile = useAuthStore((s) => s.profile);
  const [downline, setDownline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const inviteLink = profile?.referral_code ? `${window.location.origin}/auth?ref=${profile.referral_code}` : '';

  useEffect(() => { fetchDownline(); }, [profile?.id]);

  const fetchDownline = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, level, team_size, account_status, created_at')
      .eq('referred_by', profile.id)
      .order('created_at', { ascending: false });
    setDownline(data || []);
    setLoading(false);
  };

  const activeMembers = downline.filter((m) => m.account_status === 'active');
  const pendingMembers = downline.filter((m) => m.account_status !== 'active');

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fade-in-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">My Team</h2>
        <p className="text-white/50 text-sm mt-0.5">Invite friends and earn multi-level commissions</p>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 text-amber-400 mb-4">
          <LinkIcon size={16} />
          <span className="text-sm font-semibold uppercase tracking-wide">Your Invite Link</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input type="text" readOnly value={inviteLink} className="glass-input flex-1 text-xs" onClick={(e) => e.target.select()} />
            <button onClick={() => copyToClipboard(inviteLink)} className="shrink-0 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all active:scale-95">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="text-white/40 text-xs">Referral Code</p>
              <p className="text-white font-bold text-lg tracking-widest">{profile?.referral_code || '------'}</p>
            </div>
            <button onClick={() => copyToClipboard(profile?.referral_code || '')} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 transition-all active:scale-95 text-sm">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="text-center">
          <UserCheck size={20} className="text-emerald-400 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-white">{activeMembers.length}</p>
          <p className="text-white/50 text-xs">Active</p>
        </GlassCard>
        <GlassCard className="text-center">
          <Users size={20} className="text-amber-400 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-white">{pendingMembers.length}</p>
          <p className="text-white/50 text-xs">Pending</p>
        </GlassCard>
        <GlassCard className="text-center">
          <Award size={20} className="text-amber-400 mx-auto mb-1.5" />
          <p className="text-lg font-bold text-white">{profile?.level || 'Intern'}</p>
          <p className="text-white/50 text-xs">Rank</p>
        </GlassCard>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">Rank Progression</h3>
        <div className="space-y-2">
          {LEVELS.map((lvl) => {
            const teamSize = profile?.team_size || 0;
            const unlocked = teamSize >= lvl.required;
            const progress = Math.min((teamSize / lvl.required) * 100, 100);
            return (
              <div key={lvl.level} className={`glass-card p-4 ${unlocked ? 'border-amber-500/30' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${unlocked ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900' : 'bg-white/10 text-white/40'}`}>
                      {lvl.level}
                    </div>
                    <div>
                      <p className="text-white/90 text-sm font-semibold">{lvl.name}</p>
                      <p className="text-white/40 text-xs">{lvl.required} members · {lvl.rate} commission</p>
                    </div>
                  </div>
                  {unlocked && <Check size={18} className="text-emerald-400" />}
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${unlocked ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-white/20'}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <UserCheck size={16} className="text-emerald-400" />
          Active Team Members ({activeMembers.length})
        </h3>
        <p className="text-white/40 text-xs mb-3">Members who have paid the registration fee</p>
        {loading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <SkeletonLoader key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : activeMembers.length === 0 ? (
          <GlassCard className="text-center py-8">
            <Users size={32} className="text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">No active members yet. Share your invite link!</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {activeMembers.map((member) => (
              <button key={member.id} onClick={() => setExpanded(expanded === member.id ? null : member.id)} className="w-full glass-card p-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white font-semibold text-sm">
                      {(member.full_name || member.phone || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white/90 text-sm font-medium">{member.full_name || 'Unnamed'}</p>
                      <p className="text-white/40 text-xs">{member.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">Active</span>
                    {expanded === member.id ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                  </div>
                </div>
                {expanded === member.id && (
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-white/40">Team Size</p>
                      <p className="text-white/80 font-medium">{member.team_size || 0}</p>
                    </div>
                    <div>
                      <p className="text-white/40">Rank</p>
                      <p className="text-white/80 font-medium">{member.level || 'Intern'}</p>
                    </div>
                    <div>
                      <p className="text-white/40">Joined</p>
                      <p className="text-white/80 font-medium">{member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <Users size={16} className="text-amber-400" />
          Pending Team Members ({pendingMembers.length})
        </h3>
        <p className="text-white/40 text-xs mb-3">Waiting for registration fee payment confirmation</p>
        {loading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <SkeletonLoader key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : pendingMembers.length === 0 ? (
          <GlassCard className="text-center py-8">
            <Users size={32} className="text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">No pending members.</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {pendingMembers.map((member) => (
              <button key={member.id} onClick={() => setExpanded(expanded === member.id ? null : member.id)} className="w-full glass-card p-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white font-semibold text-sm">
                      {(member.full_name || member.phone || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white/90 text-sm font-medium">{member.full_name || 'Unnamed'}</p>
                      <p className="text-white/40 text-xs">{member.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">Pending</span>
                    {expanded === member.id ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                  </div>
                </div>
                {expanded === member.id && (
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-white/40">Team Size</p>
                      <p className="text-white/80 font-medium">{member.team_size || 0}</p>
                    </div>
                    <div>
                      <p className="text-white/40">Rank</p>
                      <p className="text-white/80 font-medium">{member.level || 'Intern'}</p>
                    </div>
                    <div>
                      <p className="text-white/40">Joined</p>
                      <p className="text-white/80 font-medium">{member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Team;
