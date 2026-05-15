import { useState } from 'react';
import { X, Shield, User, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { checkAdminCredentials } from '../lib/userAuth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate a brief delay for UX
    await new Promise(r => setTimeout(r, 600));

    if (checkAdminCredentials(username, password)) {
      setLoading(false);
      onSuccess();
      onClose();
      setUsername('');
      setPassword('');
    } else {
      setLoading(false);
      setError('Invalid admin credentials.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[360px] mx-4">
        <div className="bg-[#1A1D27] border border-border rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-red-500/20 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Shield size={15} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Admin Access Required</h2>
                <p className="text-[10px] text-red-400 font-medium">Guard Rails Configuration</p>
              </div>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-5 flex items-start gap-2">
              <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-300 leading-relaxed">
                This section controls the security firewall and prompt guard rails. Admin credentials are required.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] text-text-muted mb-1 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="admin"
                    autoComplete="off"
                    className="w-full bg-[#0F111A] border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-red-500/50 transition-colors placeholder-text-muted/40"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-text-muted mb-1 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-[#0F111A] border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-red-500/50 transition-colors placeholder-text-muted/40"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-xs">
                  <AlertTriangle size={12} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-semibold text-sm hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield size={14} />
                    Authenticate as Admin
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
