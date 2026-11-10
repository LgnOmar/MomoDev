import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import OrderLifecycleStepper from '../components/OrderLifecycleStepper';
import ConflictBanner from '../components/ConflictBanner';
import { updateOrderStatus } from '../services/api';

const NEXT_STATUS_MAP = {
  New: { next: 'Preparing', actionLabel: 'Démarrer la préparation ⏳', btnColor: '#2563eb' },
  Preparing: { next: 'Ready', actionLabel: 'Marquer Prêt au comptoir 🔔', btnColor: '#059669' },
  Ready: { next: 'Served', actionLabel: 'Marquer Servi aux clients ✨', btnColor: '#4f46e5' },
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
      <div className="page-header-wrap">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="page-badge-pill">👨‍🍳 Écran Cuisine KDS</span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>• Synchronisation Temps Réel WebSocket</span>
          </div>
          <h2 className="page-header-title">
            🍳 Système d'Affichage Cuisine (KDS)
          </h2>
          <p className="page-header-subtitle">
            File des commandes en direct. Avancez les statuts au fur et à mesure de la préparation des plats.
          </p>
        </div>

        {/* Filter Toggle Segmented Control */}
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setFilterActiveOnly(true)}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              background: filterActiveOnly ? '#ffffff' : 'transparent',
              color: filterActiveOnly ? '#1d4ed8' : '#64748b',
              fontWeight: filterActiveOnly ? '800' : '600',
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: filterActiveOnly ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🔥 En cours</span>
            <span style={{ fontSize: '0.74rem', background: filterActiveOnly ? '#eff6ff' : '#e2e8f0', color: filterActiveOnly ? '#2563eb' : '#475569', padding: '1px 7px', borderRadius: '999px', fontWeight: '800' }}>
              {orders.filter((o) => o.status !== 'Served').length}
            </span>
          </button>
          <button
            onClick={() => setFilterActiveOnly(false)}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              background: !filterActiveOnly ? '#ffffff' : 'transparent',
              color: !filterActiveOnly ? '#1d4ed8' : '#64748b',
              fontWeight: !filterActiveOnly ? '800' : '600',
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: !filterActiveOnly ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📋 Toutes</span>
            <span style={{ fontSize: '0.74rem', background: !filterActiveOnly ? '#eff6ff' : '#e2e8f0', color: !filterActiveOnly ? '#2563eb' : '#475569', padding: '1px 7px', borderRadius: '999px', fontWeight: '800' }}>
              {orders.length}
            </span>
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
            borderRadius: '16px',
            border: '2px dashed #cbd5e1',
            padding: '56px 20px',
            textAlign: 'center',
            color: '#64748b',
            boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '3.2rem', marginBottom: '12px' }}>🍳</div>
          <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '800' }}>
            Aucun ticket en cuisine
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
            {filterActiveOnly ? 'Tous les plats sont actuellement préparés et servis !' : 'Aucune commande enregistrée pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="kitchen-grid">
          {displayedOrders.map((ord) => {
            const nextAction = NEXT_STATUS_MAP[ord.status];
            const isUpdating = updatingId === ord.id;
            const cardBorderColor =
              ord.status === 'Preparing'
                ? '#f59e0b'
                : ord.status === 'Ready'
                ? '#10b981'
                : ord.status === 'Served'
                ? '#cbd5e1'
                : '#3b82f6';

            return (
              <div
                key={ord.id}
                className="kitchen-ticket-card"
                style={{
                  border: `2px solid ${cardBorderColor}`,
                }}
              >
                {/* Header Strip */}
                <div
                  style={{
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.15rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                      {ord.id}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: '#475569',
                        backgroundColor: '#e2e8f0',
                        padding: '2px 7px',
                        borderRadius: '4px',
                      }}
                      title="Optimistic Concurrency Control (OCC) version"
                    >
                      v{ord.version}
                    </span>
                  </div>
                  <StatusBadge status={ord.status} />
                </div>

                <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>
                      👤 {ord.customer_name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
                      Reçue à {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>

                  {/* Lifecycle Stepper */}
                  <OrderLifecycleStepper currentStatus={ord.status} />

                  {/* Ordered Items Structured Table */}
                  <div style={{ marginTop: '14px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Détails des Plats ({ord.items.length})
                      </span>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px', fontWeight: '700' }}>Plat</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700' }}>Qté</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>Prix U.</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>Sous-total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ord.items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: idx < ord.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                              <td style={{ padding: '8px 10px', fontWeight: '700', color: '#1e293b' }}>
                                {item.name || item}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '0.8rem' }}>
                                  {item.quantity || 1}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                                {item.unit_price > 0 ? formatPrice(item.unit_price) : '-'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                                {item.line_total > 0 ? formatPrice(item.line_total) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {ord.total_price > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '12px',
                          padding: '10px 14px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.98rem',
                          fontWeight: '800',
                          color: '#0f172a',
                        }}
                      >
                        <span>Total de la Commande :</span>
                        <span style={{ color: '#059669', fontSize: '1.1rem' }}>{formatPrice(ord.total_price)}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    {nextAction ? (
                      <button
                        onClick={() => handleAdvanceStatus(ord)}
                        disabled={isUpdating}
                        className="kitchen-action-btn"
                        style={{
                          backgroundColor: nextAction.btnColor,
                          color: '#ffffff',
                          opacity: isUpdating ? 0.7 : 1,
                          boxShadow: `0 4px 12px ${nextAction.btnColor}40`,
                        }}
                      >
                        {isUpdating ? 'Mise à jour en cours...' : nextAction.actionLabel}
                      </button>
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '12px',
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: '10px',
                          fontSize: '0.88rem',
                          color: '#065f46',
                          fontWeight: '700',
                        }}
                      >
                        ✓ Commande Terminée & Servie
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
