import { Link } from 'react-router-dom';
import { Users, X, Gift, Share2 } from 'lucide-react';
import GlassCard from './GlassCard';

const SLOTS = 5;

const ReferralGate = ({ activeCount = 0, onClose }) => {
  const filled = Math.min(activeCount, SLOTS);
  const remaining = Math.max(SLOTS - filled, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <GlassCard className="w-full max-w-md p-6 fade-in-up relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors active:scale-95"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/20">
            <Gift size={28} className="text-slate-900" />
          </div>
          <h3 className="text-xl font-bold text-white">Daily Tasks Complete!</h3>
          <p className="text-white/50 text-sm mt-2">
            Invite {remaining > 0 ? `${remaining} more` : 'people'} to unlock tomorrow&apos;s earning opportunities.
          </p>
        </div>

        {/* Referral Slots */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {[...Array(SLOTS)].map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl flex items-center justify-center border transition-all duration-300 ${
                i < filled
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-white/20'
              }`}
            >
              {i < filled ? <Users size={20} /> : <span className="text-lg font-bold">{i + 1}</span>}
            </div>
          ))}
        </div>

        <div className="text-center mb-6">
          <p className="text-white/60 text-sm">
            <span className="text-emerald-400 font-semibold">{filled}</span> of{' '}
            <span className="text-white/80 font-semibold">{SLOTS}</span> referral slots filled
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/team"
            onClick={onClose}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Invite Friends Now
          </Link>
          <button onClick={onClose} className="btn-secondary">
            Maybe Later
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default ReferralGate;
