import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import OrderLifecycleStepper from '../components/OrderLifecycleStepper';
import ConflictBanner from '../components/ConflictBanner';
import { updateOrderStatus } from '../services/api';

const NEXT_STATUS_MAP = {
  New: { next: 'Preparing', actionLabel: 'Démarrer la préparation ⏳', btnColor: '#2563eb' },
  Preparing: { next: 'Ready', actionLabel: 'Marquer Prêt ✓', btnColor: '#059669' },
  Ready: { next: 'Served', actionLabel: 'Marquer Servi 🍽', btnColor: '#4f46e5' },
};

const formatPrice = (amount) => `${Number(amount || 0).toLocaleString()} DA`;

export default function KitchenView({ orders, onOrderUpdated }) {
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [conflictMessage, setConflictMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const displayedOrders = filterActiveOnly
    ? orders.filter((o) => o.status !== 'Served')
    : orders;

  const handleAdvanceStatus = async (order) => {
    const nextConfig = NEXT_STATUS_MAP[order.status];
    if (!nextConfig) return;

    setUpdatingId(order.id);
    setConflictMessage(null);
    setErrorMessage(null);

    try {
      const result = await updateOrderStatus(order.id, {
        status: nextConfig.next,
        version: order.version,
      });

      if (result.conflict) {
        // Optimistic concurrency control conflict!
        setConflictMessage(
          `Conflict on ${order.id}: Another user already updated this order to '${result.currentOrder.status}' (v${result.currentOrder.version}). Order was automatically refreshed.`
        );
        if (onOrderUpdated) {
          onOrderUpdated(result.currentOrder);
        }
      } else if (!result.success) {
        setErrorMessage(result.error || 'Failed to update order status');
      } else if (result.order && onOrderUpdated) {
        onOrderUpdated(result.order);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Network error updating order');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="kitchen-header">
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            Kitchen Display System (KDS)
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
            Live ticket queue. Advance statuses as orders move through prep. All updates broadcast immediately.
          </p>
        </div>

        {/* Filter Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e2e8f0', padding: '4px', borderRadius: '8px', alignSelf: 'flex-start' }}>
          <button
            onClick={() => setFilterActiveOnly(true)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: filterActiveOnly ? '#ffffff' : 'transparent',
              color: filterActiveOnly ? '#0f172a' : '#64748b',
              fontWeight: filterActiveOnly ? '700' : '600',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: filterActiveOnly ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              minHeight: '36px',
            }}
          >
            Active ({orders.filter((o) => o.status !== 'Served').length})
          </button>
          <button
            onClick={() => setFilterActiveOnly(false)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: !filterActiveOnly ? '#ffffff' : 'transparent',
              color: !filterActiveOnly ? '#0f172a' : '#64748b',
              fontWeight: !filterActiveOnly ? '700' : '600',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: !filterActiveOnly ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              minHeight: '36px',
            }}
          >
            All ({orders.length})
          </button>
        </div>
      </div>

      {conflictMessage && (
        <ConflictBanner message={conflictMessage} onDismiss={() => setConflictMessage(null)} />
      )}

      {errorMessage && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.88rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>❌ {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 'bold', padding: '4px' }}
          >
            ✕
          </button>
        </div>
      )}

      {displayedOrders.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '50px 20px',
            textAlign: 'center',
            color: '#94a3b8',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🍳</div>
          <h3 style={{ margin: '0 0 6px 0', color: '#475569', fontSize: '1.15rem' }}>
            No tickets to prepare
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            {filterActiveOnly ? 'All orders are currently served!' : 'No orders have been entered yet.'}
          </p>
        </div>
      ) : (
        <div className="kitchen-grid">
          {displayedOrders.map((ord) => {
            const nextAction = NEXT_STATUS_MAP[ord.status];
            const isUpdating = updatingId === ord.id;

            return (
              <div
                key={ord.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: `2px solid ${ord.status === 'Preparing' ? '#fbbf24' : ord.status === 'Ready' ? '#34d399' : '#e2e8f0'}`,
                  boxShadow: '0 3px 6px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Header Strip */}
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>
                      {ord.id}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        color: '#64748b',
                        backgroundColor: '#e2e8f0',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                      title="Optimistic concurrency control version counter"
                    >
                      v{ord.version}
                    </span>
                  </div>
                  <StatusBadge status={ord.status} />
                </div>

                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1e293b', marginBottom: '2px' }}>
                    👤 {ord.customer_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '10px' }}>
                    Received: {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>

                  {/* Lifecycle Stepper */}
                  <OrderLifecycleStepper currentStatus={ord.status} />

                  {/* Ordered Items Structured Table */}
                  <div style={{ marginTop: '10px', flex: 1 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Détails de la Commande :
                    </span>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '4px 6px' }}>Plat</th>
                          <th style={{ padding: '4px 6px', textAlign: 'center' }}>Qté</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>Prix U.</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>Sous-total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ord.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px', fontWeight: '600', color: '#1e293b' }}>
                              {item.name || item}
                            </td>
                            <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', color: '#2563eb' }}>
                              {item.quantity || 1}
                            </td>
                            <td style={{ padding: '6px', textAlign: 'right', color: '#64748b' }}>
                              {item.unit_price > 0 ? formatPrice(item.unit_price) : '-'}
                            </td>
                            <td style={{ padding: '6px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                              {item.line_total > 0 ? formatPrice(item.line_total) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {ord.total_price > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '10px',
                          paddingTop: '8px',
                          borderTop: '2px solid #e2e8f0',
                          fontSize: '0.95rem',
                          fontWeight: '800',
                          color: '#0f172a',
                        }}
                      >
                        <span>Total Commande :</span>
                        <span style={{ color: '#059669' }}>{formatPrice(ord.total_price)}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    {nextAction ? (
                      <button
                        onClick={() => handleAdvanceStatus(ord)}
                        disabled={isUpdating}
                        className="kitchen-action-btn"
                        style={{
                          backgroundColor: nextAction.btnColor,
                          color: '#ffffff',
                          opacity: isUpdating ? 0.7 : 1,
                          boxShadow: `0 2px 4px ${nextAction.btnColor}40`,
                        }}
                      >
                        {isUpdating ? 'Updating...' : nextAction.actionLabel}
                      </button>
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '12px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '8px',
                          fontSize: '0.88rem',
                          color: '#475569',
                          fontWeight: '600',
                        }}
                      >
                        ✓ Commande Terminée (Servie)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
