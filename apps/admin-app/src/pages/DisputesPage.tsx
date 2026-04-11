import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import { adminItems } from '../utils/adminApi';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/disputes').then((r) => setDisputes(adminItems(r)));
  }, []);

  const sColor: Record<string, string> = { PENDING:'badge-danger', UNDER_REVIEW:'badge-warning', RESOLVED:'badge-green' };

  return (
    <div>
      <h1 className="title-lg" style={{ marginBottom: 24 }}>Dispute Queue</h1>
      {disputes.length === 0 && <div className="empty-state"><div style={{ fontSize: 48 }}>✅</div><p>No open disputes</p></div>}
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            {['Order #','Order Ref','Reason','Raised By','Status','Created'].map(h => <th key={h}>{h}</th>)}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {disputes.map((d, i) => (
            <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
              <td style={{ fontWeight: 700 }}>{d.order?.orderNumber ?? '—'}</td>
              <td className="mono" style={{ fontSize: 12 }}>{d.order?.referenceCode || '—'}</td>
              <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.reason}</td>
              <td>{d.raisedBy?.email}</td>
              <td><span className={`badge ${sColor[d.status] || 'badge-muted'}`}>{d.status}</span></td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
              <td>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                  onClick={() => navigate(`/disputes/${d.id}`)}>Review →</button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
