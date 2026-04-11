import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth.store';
import { apiErrorMessage } from '../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isReg, setIsReg] = useState(false);
  const [displayName, setName] = useState('');
  const { login, register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isReg) await register({ email, password, displayName });
      else await login(email, password);
      navigate('/');
    } catch (err: unknown) { toast.error(apiErrorMessage(err)); }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <motion.div style={{ width: '100%', maxWidth: 420 }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🏪</div>
          <h1 className="title-xl gradient-text">Merchant Portal</h1>
          <p className="body-sm" style={{ marginTop: 6 }}>RampX Liquidity Providers</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isReg && (
            <div className="input-group">
              <label className="input-label">Business / Display Name</label>
              <input id="m-name" type="text" className="input" placeholder="My Crypto Shop" value={displayName} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Email</label>
            <input id="m-email" type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input id="m-password" type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button id="m-submit" type="submit" className="btn btn-primary btn-full btn-lg" disabled={isLoading}>
            {isLoading ? '…' : isReg ? 'Create Merchant Account' : 'Sign In →'}
          </button>
        </form>
        <p className="body-sm" style={{ textAlign: 'center', marginTop: 20 }}>
          {isReg ? 'Already registered?' : 'New merchant?'}{' '}
          <button onClick={() => setIsReg(!isReg)} style={{ color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            {isReg ? 'Sign in' : 'Register'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
