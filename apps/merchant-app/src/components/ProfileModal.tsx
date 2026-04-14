import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useNavigate }  from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 8) return toast.error('New password must be at least 8 characters');
    setLoading(true);
    try {
      await api.patch('/user/password', { currentPass, newPass });
      toast.success('Password updated successfully');
      setCurrentPass('');
      setNewPass('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      >
        <motion.div 
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          style={{
            background: 'var(--bg-card)', 
            width: '90%', maxWidth: 400, borderRadius: 20,
            padding: 24, paddingBottom: 32,
            maxHeight: '90vh', overflowY: 'auto',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            position: 'relative'
          }}
        >
          {/* Close button */}
          <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>
            ✕
          </button>

          {/* Profile Info */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
              background: 'var(--accent-dim)', border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32
            }}>
              {user?.displayName?.[0]?.toUpperCase() || '🏪'}
            </div>
            <h2 className="title-md">{user?.displayName || 'Merchant'}</h2>
            <p className="body-sm">{user?.email}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <span className="badge badge-purple">MERCHANT</span>
              <span className={`badge ${user?.kycStatus === 'VERIFIED' ? 'badge-green' : 'badge-warning'}`}>
                KYC {user?.kycStatus || 'PENDING'}
              </span>
            </div>
          </div>

          {/* Security Actions */}
          <div style={{ marginTop: 24, padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
            <p className="label" style={{ marginBottom: 16 }}>Security Rules</p>
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input 
                type="password" 
                className="input" 
                placeholder="Current Password" 
                value={currentPass} 
                onChange={e => setCurrentPass(e.target.value)} 
                disabled={loading} 
                required 
              />
              <input 
                type="password" 
                className="input" 
                placeholder="New Secure Password" 
                value={newPass} 
                onChange={e => setNewPass(e.target.value)} 
                disabled={loading} 
                required 
              />
              <button type="submit" className="btn btn-primary" disabled={loading || !currentPass || !newPass}>
                {loading ? 'Updating...' : '🔐 Change Password'}
              </button>
            </form>
          </div>

          <button id="m-logout-btn" className="btn btn-danger btn-full" style={{ marginTop: 20 }}
            onClick={handleLogout}
          >
            Sign Out / Disconnect
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
