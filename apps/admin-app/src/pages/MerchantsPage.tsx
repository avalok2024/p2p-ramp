import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/client';
import { adminItems, adminTotal } from '../utils/adminApi';

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');

  const load = () =>
    api.get('/admin/merchants').then((r) => {
      setMerchants(adminItems(r));
      setTotal(adminTotal(r));
    });

  useEffect(() => { load(); }, []);

  const action = async (url: string, msg: string) => {
    setLoading(true);
    try { await api.post(url); toast.success(msg); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const filtered = merchants.filter(m =>
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_CLR: Record<string, string> = {
    ACTIVE: 'badge-green', SUSPENDED: 'badge-danger', PENDING: 'badge-warning',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="title-lg">Merchants</h1>
          <p className="body-sm" style={{ marginTop: 4 }}>{total || filtered.length} registered merchants</p>
        </div>
      </div>

      {/* Search */}
      <input
        id="merchant-search"
        className="input"
        placeholder="Search by email or name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ maxWidth: 360, marginBottom: 20 }}
      />

      {filtered.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>🏪</div>
          <p>No merchants found</p>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {['Name','Email','Status','Active Ads','Volume (₹)','Rating','Trades','Actions'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <motion.tr key={m.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--purple-dim)', border: '1px solid rgba(124,58,237,.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600, color: '#a78bfa',
                    }}>
                      {(m.displayName || m.email)?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{m.displayName || '—'}</span>
                  </div>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.email}</td>
                <td>
                  <span className={`badge ${STATUS_CLR[m.merchantStatus] || 'badge-muted'}`}>
                    {m.merchantStatus || 'ACTIVE'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>{m.activeAdsCount ?? '—'}</td>
                <td style={{ fontWeight: 600 }}>
                  {m.totalVolumeFiat != null
                    ? `₹${Number(m.totalVolumeFiat).toLocaleString()}`
                    : '—'}
                </td>
                <td>⭐ {m.rating ?? '—'}</td>
                <td>{m.completedTrades ?? '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(!m.merchantStatus || m.merchantStatus === 'PENDING') && (
                      <button
                        className="btn btn-success"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        disabled={loading}
                        onClick={() => action(`/admin/merchants/${m.id}/approve`, 'Merchant approved ✅')}
                      >
                        Approve
                      </button>
                    )}
                    {m.merchantStatus !== 'SUSPENDED' ? (
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        disabled={loading}
                        onClick={() => action(`/admin/merchants/${m.id}/suspend`, 'Merchant suspended')}
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        disabled={loading}
                        onClick={() => action(`/admin/merchants/${m.id}/activate`, 'Merchant activated')}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
