import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAdminStore } from '../store/admin.store';
import { apiErrorMessage } from '../api/client';

function devPrefill(): { email: string; password: string } {
  if (!import.meta.env.DEV) return { email: '', password: '' };
  return {
    email:       import.meta.env.VITE_DEV_ADMIN_EMAIL || '',
    password:    import.meta.env.VITE_DEV_ADMIN_PASSWORD || '',
  };
}

export default function LoginPage() {
  const init = devPrefill();
  const [email, setEmail] = useState(init.email);
  const [password, setPassword] = useState(init.password);
  const { login, isLoading } = useAdminStore();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await login(email, password); navigate('/'); }
    catch (e: unknown) { toast.error(apiErrorMessage(e)); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div style={{ width: '100%', maxWidth: 400 }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🛡️</div>
          <h1 className="title-xl gradient-text">Admin Panel</h1>
          <p className="body-sm" style={{ marginTop: 6 }}>RampX Operations Centre</p>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p className="label" style={{ marginBottom: 6 }}>Email</p>
            <input id="admin-email" type="email" className="input" style={{ width: '100%' }} value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <p className="label" style={{ marginBottom: 6 }}>Password</p>
            <input id="admin-password" type="password" className="input" style={{ width: '100%' }} value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button id="admin-login-btn" type="submit" className="btn btn-primary" style={{ marginTop: 8, width: '100%' }} disabled={isLoading}>
            {isLoading ? '…' : 'Access Admin Panel →'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
