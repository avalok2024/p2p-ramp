import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/client';

export default function AdsPage() {
  const [ads, setAds] = useState<any[]>([]);
  const navigate = useNavigate();

  const load = () => api.get('/merchants/my-ads').then(r => setAds(r.data));
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, isActive: boolean) => {
    try { await api.patch(`/merchants/ads/${id}`, { isActive: !isActive }); load(); toast.success(isActive ? 'Ad paused' : 'Ad activated'); }
    catch { toast.error('Failed'); }
  };

  const del = async (id: string) => {
    try { await api.delete(`/merchants/ads/${id}`); load(); toast.success('Ad deleted'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="section-header" style={{ paddingTop: 16 }}>
        <h1 className="title-lg">My Ads</h1>
        <button id="create-ad-btn" className="btn btn-primary btn-sm" onClick={() => navigate('/ads/create')}>
          + New Ad
        </button>
      </div>

      {ads.length === 0 && (
        <div className="empty-state">
          <div className="icon">📢</div>
          <p>No ads yet</p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/ads/create')}>Create First Ad</button>
        </div>
      )}

      {ads.map((ad, i) => (
        <motion.div key={ad.id} className={`card ${ad.isActive ? '' : ''}`} style={{ marginBottom: 12, opacity: ad.isActive ? 1 : 0.6 }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: ad.isActive ? 1 : 0.6, y: 0 }} transition={{ delay: i * 0.06 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <span className="badge badge-purple">{ad.crypto}</span>
                <span className={`badge ${ad.isActive ? 'badge-green' : 'badge-muted'}`}>{ad.isActive ? 'ACTIVE' : 'PAUSED'}</span>
              </div>
              <p className="title-sm">₹{ad.pricePerUnit} / {ad.crypto}</p>
              <p className="body-sm">₹{ad.minAmount} – ₹{ad.maxAmount}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {ad.paymentMethods?.map((m: string) => <span key={m} className="badge badge-muted">{m}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => toggle(ad.id, ad.isActive)}>
              {ad.isActive ? 'Pause' : 'Activate'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => del(ad.id)}>Delete</button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
