import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/client';

const METHODS = ['UPI','IMPS','NEFT','BANK_TRANSFER'];

export default function CreateAdPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    crypto: 'USDT', pricePerUnit: '', minAmount: '', maxAmount: '',
    paymentMethods: ['UPI'], upiId: '', paymentRemarks: '', paymentWindowMinutes: 30,
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleMethod = (m: string) => setForm(f => ({
    ...f,
    paymentMethods: f.paymentMethods.includes(m) ? f.paymentMethods.filter(x => x !== m) : [...f.paymentMethods, m],
  }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(form.minAmount) >= parseFloat(form.maxAmount)) return toast.error('Min must be less than Max');
    setLoading(true);
    try {
      await api.post('/merchants/ads', {
        ...form,
        pricePerUnit: parseFloat(form.pricePerUnit),
        minAmount:    parseFloat(form.minAmount),
        maxAmount:    parseFloat(form.maxAmount),
        paymentWindowMinutes: +form.paymentWindowMinutes,
      });
      toast.success('Ad created!');
      navigate('/ads');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate('/ads')} className="btn btn-secondary btn-sm">←</button>
        <h1 className="title-md">Create Ad</h1>
      </div>

      <motion.form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="label">Pricing</p>
          {[
            { id: 'price',  key: 'pricePerUnit', label: 'Price per USDT (₹)', ph: 'e.g. 85.50' },
            { id: 'min',    key: 'minAmount',    label: 'Min Order (₹)',        ph: 'e.g. 500'   },
            { id: 'max',    key: 'maxAmount',    label: 'Max Order (₹)',        ph: 'e.g. 50000' },
          ].map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label">{f.label}</label>
              <input id={f.id} type="number" className="input" placeholder={f.ph} value={(form as any)[f.key]} onChange={set(f.key)} required step="0.01" />
            </div>
          ))}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="label">Payment Methods</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {METHODS.map(m => (
              <button key={m} type="button"
                className={`badge ${form.paymentMethods.includes(m) ? 'badge-green' : 'badge-muted'}`}
                style={{ cursor: 'pointer', padding: '8px 14px', fontSize: 13 }}
                onClick={() => toggleMethod(m)}>{m}</button>
            ))}
          </div>
          <div className="input-group">
            <label className="input-label">Your UPI ID</label>
            <input id="upi-id" type="text" className="input" placeholder="you@upi" value={form.upiId} onChange={set('upiId')} />
          </div>
          <div className="input-group">
            <label className="input-label">Payment Remarks (optional)</label>
            <input type="text" className="input" placeholder="e.g. USDT Purchase" value={form.paymentRemarks} onChange={set('paymentRemarks')} />
          </div>
          <div className="input-group">
            <label className="input-label">Payment Window (minutes)</label>
            <input type="number" className="input" value={form.paymentWindowMinutes} onChange={set('paymentWindowMinutes')} min={5} max={120} />
          </div>
        </div>

        <button id="create-ad-submit" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
          {loading ? 'Creating…' : 'Publish Ad →'}
        </button>
      </motion.form>
    </div>
  );
}
