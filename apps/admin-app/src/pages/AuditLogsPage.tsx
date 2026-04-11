import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/client';
import { adminItems } from '../utils/adminApi';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    api.get('/admin/audit-logs').then((r) => setLogs(adminItems(r)));
  }, []);

  return (
    <div>
      <h1 className="title-lg" style={{ marginBottom: 24 }}>Audit Logs</h1>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>{['Action','Actor','Entity','Entity ID','Time'].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <td><span className="badge badge-purple">{l.action}</span></td>
                <td style={{ fontSize: 12 }}>{l.actor?.email || 'System'}</td>
                <td><span className="badge badge-muted">{l.entity}</span></td>
                <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.entityId?.slice(0, 8)}…</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(l.createdAt).toLocaleString()}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="empty-state"><p>No audit logs yet</p></div>}
      </div>
    </div>
  );
}
