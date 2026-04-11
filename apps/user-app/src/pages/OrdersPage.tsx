import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOrderStore, type Order } from '../store/order.store';

const statusColor: Record<string, string> = {
  COMPLETED: 'badge-green', ESCROW_LOCKED: 'badge-purple', PAID_MARKED: 'badge-warning',
  DISPUTE: 'badge-danger', CANCELLED: 'badge-muted', REFUNDED: 'badge-muted', CREATED: 'badge-muted',
};

export default function OrdersPage() {
  const { orders, fetchOrders, isLoading } = useOrderStore();
  const navigate = useNavigate();

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return (
    <div>
      <h1 className="title-lg" style={{ marginBottom: 20 }}>My Orders</h1>
      {isLoading && <div className="spinner" />}
      {!isLoading && orders.length === 0 && (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>No orders yet</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Create your first trade</p>
        </div>
      )}
      {orders.map((order: Order, i) => (
        <motion.div
          key={order.id}
          className="card"
          style={{ marginBottom: 10, cursor: 'pointer' }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => order.id && navigate(`/orders/${order.id}`)}
          whileTap={{ scale: 0.98 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-muted" style={{ fontSize: 10 }}>{order.type}</span>
                <p className="title-sm">{order.cryptoAmount} {order.crypto}</p>
              </div>
              <p className="body-sm" style={{ marginTop: 4 }}>₹{parseFloat('' + order.fiatAmount).toLocaleString()}</p>
              <p className="body-sm" style={{ marginTop: 2, fontFamily: 'monospace', fontSize: 10 }} title={order.id}>
                {order.orderNumber != null ? `#${order.orderNumber} · ` : ''}
                {order.referenceCode ?? '—'} · {order.id ? `${order.id.slice(0, 8)}…` : '—'}
              </p>
            </div>
            <span className={`badge ${statusColor[order.status] || 'badge-muted'}`}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
