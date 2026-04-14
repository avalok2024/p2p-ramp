import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '../api/client';

const PERIOD_LABELS: Record<string, string> = {
  week: 'This Week', month: 'This Month', all: 'All Time',
};
import { useFormatCurrency } from '../hooks/useFormatCurrency';

export default function EarningsPage() {
  const { formatEth, symbol } = useFormatCurrency();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: '#16162a', border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 10, padding: '10px 14px', fontSize: 13,
      }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        <p style={{ color: 'var(--accent)', fontWeight: 700 }}>
          {formatEth(Number(payload[0]?.value ?? 0)).formatted}
        </p>
      </div>
    );
  };
  const [orders, setOrders]   = useState<any[]>([]);
  const [period, setPeriod]   = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    api.get('/orders').then(r => setOrders(Array.isArray(r.data) ? r.data : []));
  }, []);

  const completed = orders.filter(o => o.status === 'COMPLETED');

  // ── filter by period ───────────────────────────────────────────────────────
  const now = Date.now();
  const ms = { week: 7 * 86400000, month: 30 * 86400000 };
  const filtered = period === 'all'
    ? completed
    : completed.filter(o => now - new Date(o.createdAt).getTime() < ms[period]);

  const totalVolume  = filtered.reduce((s, o) => s + +o.cryptoAmount, 0);
  const totalTrades  = filtered.length;
  const avgOrder     = totalTrades ? totalVolume / totalTrades : 0;

  // ── build daily bar chart data ─────────────────────────────────────────────
  const buckets: Record<string, number> = {};
  filtered.forEach(o => {
    const d = new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    buckets[d] = (buckets[d] || 0) + +o.cryptoAmount;
  });
  const chartData = Object.entries(buckets)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, volume]) => ({ date, volume }));

  const stats = [
    { label: 'Total Volume',  value: formatEth(totalVolume).formatted, cls: 'card-glow' },
    { label: 'Trades',        value: totalTrades,                         cls: '' },
    { label: 'Avg Trade Size',value: formatEth(avgOrder).formatted, cls: '' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title-lg">Earnings</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['week', 'month', 'all'] as const).map(p => (
            <button
              key={p}
              id={`period-${p}`}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'week' ? '7D' : p === 'month' ? '30D' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} className={`card ${s.cls}`}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}>
            <p className="label" style={{ marginBottom: 6 }}>{s.label}</p>
            <p className="title-md" style={{ color: 'var(--accent)' }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Bar chart */}
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <p className="label" style={{ marginBottom: 16 }}>
          Daily Volume — {PERIOD_LABELS[period]}
        </p>
        {chartData.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div style={{ fontSize: 40 }}>📊</div>
            <p style={{ marginTop: 8 }}>No completed trades in this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
              <XAxis dataKey="date" tick={{ fill: '#555577', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555577', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatEth(v).formatted} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
              <Bar dataKey="volume" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Recent completed orders */}
      <div>
        <p className="title-sm" style={{ marginBottom: 12 }}>Recent Completions</p>
        {filtered.length === 0 ? (
          <div className="empty-state"><div style={{ fontSize: 40 }}>✅</div><p>No completed trades yet</p></div>
        ) : (
          filtered.slice(0, 10).map((o, i) => (
            <motion.div key={o.id} className="list-row"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
              <div>
                <p className="title-sm">{o.type} {o.crypto}</p>
                <p className="body-sm">{new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="title-sm" style={{ color: 'var(--accent)' }}>
                  +{formatEth(parseFloat(o.cryptoAmount)).formatted}
                </p>
                <p className="body-sm">₹{Number(o.fiatAmount).toLocaleString()}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
