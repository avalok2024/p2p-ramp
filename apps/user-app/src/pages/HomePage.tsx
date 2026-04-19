import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/auth.store';
import { useOrderStore } from '../store/order.store';
import { useWeb3Store } from '../store/web3.store';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

const statusColor: Record<string, string> = {
  COMPLETED: 'badge-green',
  ESCROW_LOCKED: 'badge-purple',
  PAID_MARKED: 'badge-warning',
  DISPUTE: 'badge-danger',
  CANCELLED: 'badge-muted',
  REFUNDED: 'badge-muted',
  CREATED: 'badge-muted',
  SCAN_PAY_MERCHANT_PAID: 'badge-green',
};

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const { fetchOrders } = useOrderStore();
  const { balanceEth } = useWeb3Store();
  const { formatEth, symbol } = useFormatCurrency();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const activeOrder = orders.find((o) =>
    !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status),
  );

  const ethNum = parseFloat(balanceEth || '0');
  const displayBal = formatEth(Number.isFinite(ethNum) ? ethNum : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="body-sm">Good to see you 👋</p>
        <h1 className="title-lg">{user?.displayName || user?.email?.split('@')[0]}</h1>
      </motion.div>

      {/* Balance card */}
      <motion.div className="card card-glow" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        <p className="label">On-chain wallet (Sepolia ETH)</p>
        <h2 className="title-xl" style={{ margin: '8px 0', fontFamily: "'SF Mono', monospace" }}>
          {(Number.isFinite(ethNum) ? ethNum : 0).toFixed(6)} ETH
        </h2>
        {symbol !== 'ETH' && (
          <p className="body-sm" style={{ marginTop: 6, color: 'rgba(255,255,255,0.5)' }}>
            ≈ {displayBal.formatted} <span style={{ fontSize: 11 }}>(display only)</span>
          </p>
        )}
        <p className="body-sm" style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          When a trade completes, escrow sends native ETH to this app wallet address (synced to your profile).
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button id="home-buy-btn" onClick={() => navigate('/buy')} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
            Buy Crypto
          </button>
          <button id="home-sell-btn" onClick={() => navigate('/sell')} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
            Sell Crypto
          </button>
        </div>
        {/* Scan & Pay CTA */}
        <motion.button
          id="home-scan-pay-btn"
          onClick={() => navigate('/scan-pay')}
          className="btn btn-sm"
          whileTap={{ scale: 0.96 }}
          style={{
            marginTop: 10, width: '100%',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(59,130,246,0.25))',
            border: '1px solid rgba(139,92,246,0.5)',
            color: '#c4b5fd',
            fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>⚡</span> Scan &amp; Pay — Pay anyone with crypto
        </motion.button>
      </motion.div>

      {/* Active order alert */}
      {activeOrder && (
        <motion.div
          className="card card-warning"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => navigate(`/orders/${activeOrder.id}`)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="label">Active Order</p>
              <p className="title-sm" style={{ marginTop: 4 }}>
                {activeOrder.type} {activeOrder.cryptoAmount} {activeOrder.crypto}
              </p>
            </div>
            <span className={`badge ${statusColor[activeOrder.status] || 'badge-muted'}`}>
              {activeOrder.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="body-sm" style={{ marginTop: 8 }}>Tap to continue →</p>
        </motion.div>
      )}

      {/* Recent orders */}
      <div>
        <div className="section-header">
          <p className="title-sm">Recent Orders</p>
          <Link to="/orders" className="body-sm" style={{ color: 'var(--accent)' }}>See all</Link>
        </div>
        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No orders yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Start your first trade above</p>
          </div>
        ) : (
          orders.slice(0, 3).map((order) => (
            <motion.div
              key={order.id}
              className="list-row"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/orders/${order.id}`)}
              whileTap={{ scale: 0.98 }}
            >
              <div>
                <p className="title-sm">{order.type} {order.crypto}</p>
                <p className="body-sm">₹{parseFloat('' + order.fiatAmount).toLocaleString()}</p>
              </div>
              <span className={`badge ${statusColor[order.status] || 'badge-muted'}`}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
