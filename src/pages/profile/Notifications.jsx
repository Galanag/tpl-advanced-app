import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2 } from 'lucide-react';

const Notifications = () => {
  const navigate = useNavigate();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // In a real app, we would save these preferences to a database or localStorage.
    // For now, we'll just simulate a save.
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // For demonstration, we'll just show an alert. In production, use a toast.
      alert('Notification settings saved!');
    } catch (err) {
      console.error('Failed to save notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in-up space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Notifications</h2>
        <button
          onClick={() => navigate('/profile')}
          className="text-sm text-white/60 hover:text-white"
        >
          Back
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-amber-400" />
            <div>
              <p className="text-white font-semibold">Email Notifications</p>
              <p className="text-white/50 text-xs">Receive updates about earnings, referrals, and promotions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="rounded border-white/30 text-amber-600 shadow-sm focus:border-amber-500 focus:ring-amber-500"
              />
              <span className="ml-2 text-white/50"></span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-white/50" />
            <div>
              <p className="text-white font-semibold">SMS Notifications</p>
              <p className="text-white/50 text-xs">Receive SMS alerts for important updates (may incur charges)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e) => setSmsNotifications(e.target.checked)}
                className="rounded border-white/30 text-amber-600 shadow-sm focus:border-amber-500 focus:ring-amber-500"
              />
              <span className="ml-2 text-white/50"></span>
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="btn-primary w-full mt-6"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Saving...
          </>
        ) : (
          'Save Settings'
        )}
      </button>
    </div>
  );
};

export default Notifications;