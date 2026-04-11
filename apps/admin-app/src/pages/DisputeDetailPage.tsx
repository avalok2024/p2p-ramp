import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dispute, setDispute] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [decision, setDecision] = useState('RELEASE_TO_USER');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoadError(null);
    api
      .get(`/admin/disputes/${id}`)
      .then((r) => setDispute(r.data))
      .catch((e) => {
        setDispute(null);
        setLoadError(apiErrorMessage(e));
      });
  }, [id]);

  const resolve = async () => {
    if (!dispute?.orderId) return;
    setLoading(true);
    try {
      await api.post(`/orders/${dispute.orderId}/dispute/${id}/resolve`, { decision, adminNotes: notes });
      toast.success('Dispute resolved!');
      navigate('/disputes');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  if (loadError) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p className="body-sm" style={{ marginBottom: 16 }}>{loadError}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/disputes')}>← Back to disputes</button>
      </div>
    );
  }

  if (!dispute) return <div className="spinner" style={{ marginTop: 80 }} />;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/disputes')} className="btn btn-secondary" style={{ fontSize: 12 }}>← Back</button>
        <h1 className="title-lg">Dispute Review</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left — dispute + order info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <p className="label" style={{ marginBottom: 12 }}>Dispute Info</p>
            {[
              ['Status', dispute.status],
              ['Reason', dispute.reason],
              ['Raised By', dispute.raisedBy?.email],
              ['Created', new Date(dispute.createdAt).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="body-sm">{k}</span>
                <span style={{ fontSize: 14, fontWeight: 500, maxWidth: 200, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <p className="label" style={{ marginBottom: 12 }}>Order Info</p>
            {[
              ['Order #', dispute.order?.orderNumber ?? '—'],
              ['Ref',    dispute.order?.referenceCode],
              ['UUID',   <span className="mono" style={{ fontSize: 11 }} key="ou">{dispute.order?.id}</span>],
              ['Type',   dispute.order?.type],
              ['Amount', `₹${parseFloat('' + (dispute.order?.fiatAmount ?? 0)).toLocaleString()}`],
              ['Crypto', `${dispute.order?.cryptoAmount} ${dispute.order?.crypto}`],
              ['Status', dispute.order?.status],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="body-sm">{k}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Evidence */}
          {dispute.evidenceUrls?.length > 0 && (
            <div className="card">
              <p className="label" style={{ marginBottom: 12 }}>Evidence ({dispute.evidenceUrls.length})</p>
              {dispute.evidenceUrls.map((url: string, i: number) => (
                <img key={i} src={url} alt={`Evidence ${i+1}`} style={{ borderRadius: 8, marginBottom: 8, width: '100%' }} />
              ))}
            </div>
          )}
        </div>

        {/* Right — decision panel */}
        {dispute.status !== 'RESOLVED' && (
          <motion.div className="card card-purple" style={{ height: 'fit-content' }}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
            <p className="title-sm" style={{ marginBottom: 16 }}>⚖️ Admin Decision</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                { val: 'RELEASE_TO_USER',    label: '✅ Release crypto to buyer',    cls: 'card-glow' },
                { val: 'REFUND_TO_MERCHANT', label: '↩️ Refund crypto to merchant', cls: 'card-warning' },
                { val: 'HOLD',               label: '⏸️ Hold for further review',    cls: '' },
              ].map(d => (
                <div key={d.val}
                  className={`card ${decision === d.val ? d.cls : ''}`}
                  style={{ cursor: 'pointer', padding: '14px 16px', border: decision === d.val ? undefined : '1px solid var(--border)' }}
                  onClick={() => setDecision(d.val)}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{d.label}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <p className="label" style={{ marginBottom: 6 }}>Admin Notes</p>
              <textarea className="input" style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
                placeholder="Add resolution notes…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <button id="resolve-btn" className="btn btn-primary" style={{ width: '100%' }} onClick={resolve} disabled={loading}>
              {loading ? 'Resolving…' : 'Submit Decision →'}
            </button>
          </motion.div>
        )}

        {dispute.status === 'RESOLVED' && (
          <div className="card card-glow">
            <p className="title-sm">✅ Resolved</p>
            <p className="body-sm" style={{ marginTop: 8 }}>Decision: {dispute.adminDecision?.replace(/_/g,' ')}</p>
            <p className="body-sm" style={{ marginTop: 4 }}>{dispute.adminNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
