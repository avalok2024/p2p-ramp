import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/client';
import { adminItems, adminTotal } from '../utils/adminApi';

export default function UsersPage() {
  const [users, setUsers]     = useState<any[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);

  const load = () =>
    api.get('/admin/users').then((r) => {
      setUsers(adminItems(r));
      setTotal(adminTotal(r));
    });
  useEffect(() => { load(); }, []);

  const action = async (url: string, msg: string) => {
    setLoading(true);
    try { await api.post(url); toast.success(msg); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const KYC_CLR: Record<string, string> = { VERIFIED:'badge-green', PENDING:'badge-warning', REJECTED:'badge-danger' };
  const ROLE_CLR: Record<string, string> = { USER:'badge-muted', MERCHANT:'badge-purple', ADMIN:'badge-green' };

  return (
    <div>
      <h1 className="title-lg" style={{ marginBottom: 24 }}>Users ({total || users.length})</h1>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>{['Email','Web3 Address','Role','KYC','Rating','Trades','Banned','Actions'].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <td>{u.email}</td>
                <td>
                  {u.web3Address ? (
                     <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                       <span className="mono" style={{ fontSize: 13 }}>{u.web3Address.slice(0,6)}...{u.web3Address.slice(-4)}</span>
                       <button onClick={() => { navigator.clipboard.writeText(u.web3Address); toast.success('Copied!'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>📋</button>
                     </div>
                  ) : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Not Linked</span>}
                </td>
                <td><span className={`badge ${ROLE_CLR[u.role]||'badge-muted'}`}>{u.role}</span></td>
                <td><span className={`badge ${KYC_CLR[u.kycStatus]||'badge-muted'}`}>{u.kycStatus}</span></td>
                <td>⭐ {u.rating}</td>
                <td>{u.completedTrades}</td>
                <td><span className={`badge ${u.isBanned ? 'badge-danger' : 'badge-green'}`}>{u.isBanned ? 'Yes' : 'No'}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  {u.kycStatus !== 'VERIFIED' && (
                    <button className="btn btn-success" style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => action(`/admin/users/${u.id}/kyc/approve`, 'KYC approved')}>KYC ✓</button>
                  )}
                  <button className={`btn ${u.isBanned ? 'btn-secondary' : 'btn-danger'}`} style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => action(`/admin/users/${u.id}/${u.isBanned ? 'unban' : 'ban'}`, u.isBanned ? 'User unbanned' : 'User banned')}>
                    {u.isBanned ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
