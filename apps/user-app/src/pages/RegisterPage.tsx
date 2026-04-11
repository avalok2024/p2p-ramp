import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth.store';
import { apiErrorMessage } from '../api/client';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', displayName: '', phone: '' });
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form);
      navigate('/');
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="app-shell page-no-nav" style={{ justifyContent: 'center', minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
          <h1 className="title-xl gradient-text">Create Account</h1>
          <p className="body-sm" style={{ marginTop: 6 }}>Start trading crypto safely</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { id: 'reg-name',     key: 'displayName', label: 'Full Name',    type: 'text',     ph: 'Rahul Verma',         ac: 'name' },
            { id: 'reg-email',    key: 'email',        label: 'Email',        type: 'email',    ph: 'you@example.com',     ac: 'email' },
            { id: 'reg-phone',    key: 'phone',        label: 'Phone',        type: 'tel',      ph: '+91 9876543210',      ac: 'tel' },
            { id: 'reg-password', key: 'password',     label: 'Password',     type: 'password', ph: 'Min 8 characters',    ac: 'new-password' },
          ].map((f) => (
            <div key={f.key} className="input-group">
              <label className="input-label">{f.label}</label>
              <input
                id={f.id}
                type={f.type}
                className="input"
                placeholder={f.ph}
                value={(form as any)[f.key]}
                onChange={set(f.key)}
                autoComplete={f.ac}
                required={f.key !== 'phone'}
              />
            </div>
          ))}

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={isLoading}
            style={{ marginTop: 8 }}
          >
            {isLoading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>

        <p className="body-sm" style={{ textAlign: 'center', marginTop: 24 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
