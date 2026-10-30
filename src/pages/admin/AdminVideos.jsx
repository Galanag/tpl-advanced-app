import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Film, Clock, DollarSign } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import GlassCard from '../../components/GlassCard';
import SkeletonLoader from '../../components/SkeletonLoader';

const EMPTY_FORM = { title: '', video_url: '', thumbnail_url: '', duration_seconds: 30, reward_amount: 10 };

const AdminVideos = () => {
  const { videos, loading, addVideo, updateVideo, deleteVideo } = useAdminStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (video) => {
    setEditing(video);
    setForm({
      title: video.title,
      video_url: video.video_url || '',
      thumbnail_url: video.thumbnail_url || '',
      duration_seconds: video.duration_seconds,
      reward_amount: video.reward_amount
    });
    setError('');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this video?')) return;
    await deleteVideo(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        video_url: form.video_url,
        thumbnail_url: form.thumbnail_url,
        duration_seconds: parseInt(form.duration_seconds) || 30,
        reward_amount: parseFloat(form.reward_amount) || 0
      };
      if (editing) {
        await updateVideo(editing.id, payload);
      } else {
        await addVideo(payload);
      }
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Failed to save video.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Videos ({videos.length})</h2>
        <button onClick={openAdd} className="btn-primary !w-auto flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus size={16} /> Add Video
        </button>
      </div>

      {showForm && (
        <GlassCard className="fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{editing ? 'Edit Video' : 'Add New Video'}</h3>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-white/10 text-white/50"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/50 text-sm block mb-1.5">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="glass-input" placeholder="Video title" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-white/50 text-sm block mb-1.5">YouTube URL</label>
                <input type="url" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} className="glass-input" placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div>
                <label className="text-white/50 text-sm block mb-1.5">Thumbnail URL</label>
                <input type="url" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} className="glass-input" placeholder="https://..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/50 text-sm block mb-1.5">Duration (seconds)</label>
                <input type="number" min="5" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} className="glass-input" />
              </div>
              <div>
                <label className="text-white/50 text-sm block mb-1.5">Reward (ETB)</label>
                <input type="number" min="0" step="0.01" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: e.target.value })} className="glass-input" />
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? (<><Loader2 size={16} className="animate-spin" />Saving…</>) : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonLoader key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : videos.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Film size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No videos yet. Add your first video!</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {videos.map((video) => (
            <GlassCard key={video.id} className="flex items-center gap-3 py-3 px-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Film size={20} className="text-white/30" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/90 text-sm font-medium truncate">{video.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Clock size={10} /> {video.duration_seconds}s</span>
                  <span className="flex items-center gap-1"><DollarSign size={10} /> {parseFloat(video.reward_amount)} ETB</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(video)} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-amber-400 transition-colors active:scale-95"><Pencil size={15} /></button>
                <button onClick={() => handleDelete(video.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors active:scale-95"><Trash2 size={15} /></button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVideos;