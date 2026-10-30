import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { User, Phone, Lock, Ticket, Loader2, Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRefCode = searchParams.get('ref');
  const [tab, setTab] = useState(urlRefCode ? 'register' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    referralCode: urlRefCode || '',
  });

   const { signIn, signUp } = useAuthStore();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.phone.trim()) return 'Phone number is required';
    if (form.phone.replace(/[^0-9]/g, '').length < 9) return 'Enter a valid phone number';
    if (!form.password) return 'Password is required';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (tab === 'register' && !form.fullName.trim()) return 'Full name is required';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      if (tab === 'login') {
        await signIn({ phone: form.phone, password: form.password });
      } else {
        await signUp({
          fullName: form.fullName,
          phone: form.phone,
          password: form.password,
          referralCode: form.referralCode,
        });
      }
      navigate('/');
    } catch (err) {
      let errorMessage = err.message || 'Authentication failed. Please try again.';
      if (err.message && err.message.includes('Email not confirmed')) {
        errorMessage = 'Your email is not confirmed. Please check your Supabase dashboard under Authentication > Users to manually confirm this test account.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="HIDASE Logo" className="w-32 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">HIDASE</h1>
          <p className="text-white/50 text-sm mt-1">Investment Group — Watch &amp; Earn</p>
        </div>

        <div className="glass-card p-6">
          {/* Tabs */}
          <div className="flex mb-6 bg-white/5 rounded-xl p-1 border border-white/10">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 active:scale-95 ${
                  tab === t
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-lg'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>

           <form onSubmit={handleSubmit} className="space-y-4">
             <div className="relative">
               <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
               <input
                 type="tel"
                 name="phone"
                 placeholder="Phone Number"
                 value={form.phone}
                 onChange={handleChange}
                 className="glass-input pl-10"
                 autoComplete="tel"
               />
             </div>
 
             {tab === 'register' && (
               <div className="relative">
                 <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                 <input
                   type="text"
                   name="fullName"
                   placeholder="Full Name"
                   value={form.fullName}
                   onChange={handleChange}
                   className="glass-input pl-10"
                   autoComplete="name"
                 />
               </div>
             )}
 
             <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
               <input
                 type={showPassword ? 'text' : 'password'}
                 name="password"
                 value={form.password}
                 onChange={handleChange}
                 className="glass-input pl-10 pr-10"
                 autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
               />
               <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
               >
                 {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
               </button>
             </div>
 
             {tab === 'register' && (
               <div className="relative">
                 <Ticket size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                 <input
                   type="text"
                   name="referralCode"
                   placeholder="Referral Code (optional)"
                   value={form.referralCode}
                   onChange={handleChange}
                   className="glass-input pl-10"
                   autoComplete="off"
                 />
               </div>
             )}
 
             {error && (
               <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                 <p className="text-red-400 text-sm">{error}</p>
               </div>
             )}
 
             <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
               {loading ? (
                 <>
                   <Loader2 size={18} className="animate-spin" />
                   Please wait…
                 </>
               ) : tab === 'login' ? (
                 'Login'
               ) : (
                 'Create Account'
               )}
             </button>
           </form>

          {tab === 'register' && (
            <p className="text-center text-white/40 text-xs mt-4">
              By signing up you agree to our Terms of Service.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;