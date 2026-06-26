import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, isAuthenticated } from '../services/api';
import { Shield, Lock, User, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import logoImg from '../assets/logo.jpg';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login(formData.username, formData.password);
      if (res.success) {
        // Redirect to dashboard and reload
        navigate('/dashboard');
        window.location.reload();
      } else {
        setError(res.message || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message || 'Server connection failed. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-24 pb-16 px-4 relative bg-security-bg text-slate-100 selection:bg-security-gold selection:text-security-bg">
      <div className="absolute inset-0 tech-grid opacity-25 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        
        {/* Company Logo badge */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="mb-4">
            <img 
              src={logoImg} 
              alt="Thrinaina Logo" 
              className={`h-16 w-auto object-contain rounded-xl drop-shadow-lg transition-all duration-300 ${
                loading ? 'animate-logo-loading' : ''
              }`}
            />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-wider">THRINAINA PORTAL</h1>
          <span className="text-[10px] font-bold text-security-textGray uppercase tracking-[0.22em] mt-1">
            System Administration Gateway
          </span>
        </div>
 
        {/* Login Card */}
        <div className="glass-panel bg-security-card/85 border border-slate-805/85 rounded-2xl shadow-premium p-6 sm:p-8">
          <h2 className="text-base font-bold text-slate-200 border-b border-slate-900 pb-3 mb-6">
            Authorized Personnel Only
          </h2>
 
          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-400">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
 
          <form onSubmit={handleLoginSubmit} className="space-y-5" autoComplete="off">
            {/* Username */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-security-gold" />
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                autoComplete="off"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter admin username"
                className="w-full bg-[#030712] border border-slate-800 focus:border-security-gold text-sm text-slate-200 rounded-xl px-4 py-3.5 focus:outline-none transition-colors duration-200"
              />
            </div>
 
            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-security-gold" />
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full bg-[#030712] border border-slate-800 focus:border-security-gold text-sm text-slate-200 rounded-xl pl-4 pr-11 py-3.5 focus:outline-none transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
 
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-security-gold hover:bg-security-goldHover disabled:bg-slate-800 disabled:cursor-not-allowed text-security-bg font-extrabold uppercase tracking-wider text-xs rounded-xl transition-all duration-300 shadow-gold-glow flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-security-bg border-t-transparent rounded-full animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  'Establish Connection'
                )}
              </button>
            </div>
          </form>
 
        </div>
      </div>
    </div>
  );
}
