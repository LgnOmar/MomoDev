import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { createOrder } from '../services/api';

const QUICK_ITEMS = [
  'Classic Burger',
  'Cheese Pizza',
  'Crispy Fries',
  'Chicken Wings',
  'Caesar Salad',
  'Iced Lemon Tea',
  'Espresso',
];

export default function CashierView({ orders, onOrderCreated }) {
  const [customerName, setCustomerName] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const handleAddQuickItem = (item) => {
    setSelectedItems((prev) => [...prev, item]);
    setFormError('');
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    const trimmed = customItem.trim();
    if (!trimmed) return;
    setSelectedItems((prev) => [...prev, trimmed]);
    setCustomItem('');
    setFormError('');
  };

  const handleRemoveItem = (indexToRemove) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setFormError('Please enter a customer name.');
      return;
    }

    if (selectedItems.length === 0) {
      setFormError('Please add at least one item to the order.');
      return;
    }

    setSubmitting(true);
    try {
      const newOrder = await createOrder({
        customer_name: trimmedName,
        items: selectedItems,
      });

      // Reset form
      setCustomerName('');
      setSelectedItems([]);
      if (onOrderCreated) {
        onOrderCreated(newOrder);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const getTrackingUrl = (orderId) => {
    const origin = window.location.origin;
    return `${origin}/?role=customer&orderId=${encodeURIComponent(orderId)}`;
  };

  const handleCopyLink = (orderId) => {
    const url = getTrackingUrl(orderId);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(orderId);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
          Cashier Terminal
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
          Create orders and share live tracking links. All orders persist in SQLite and sync immediately via WebSockets.
        </p>
      </div>

      <div className="cashier-grid">
        {/* Order Creation Card */}
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>
            New Order Entry
          </h3>

          {formError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '16px',
              }}
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmitOrder}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="customerName"
                style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#334155', marginBottom: '6px' }}
              >
                Customer Name *
              </label>
              <input
                id="customerName"
                type="text"
                placeholder="e.g. Maria Gonzalez"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Quick Add Items */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '8px' }}>
                Quick Add Items:
              </span>
              <div className="quick-items-wrap">
                {QUICK_ITEMS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleAddQuickItem(item)}
                    className="quick-item-btn"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Item Input */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Custom item name..."
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomItem}
                style={{
                  background: '#e2e8f0',
                  border: '1px solid #cbd5e1',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#1e293b',
                  minHeight: '40px',
                }}
              >
                Add
              </button>
            </div>

            {/* Current Items List */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#334155', marginBottom: '6px' }}>
                Order Items ({selectedItems.length})
              </span>
              {selectedItems.length === 0 ? (
                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
                  No items added yet. Click quick items above or type a custom item.
                </div>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedItems.map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.88rem',
                      }}
                    >
                      <span>• {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontWeight: '700',
                          padding: '4px 8px',
                          fontSize: '0.9rem',
                        }}
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                minHeight: '46px',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
              }}
            >
              {submitting ? 'Placing Order...' : 'Submit Order'}
            </button>
          </form>
        </section>

        {/* Existing Orders List */}
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>
              All Orders ({orders.length})
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Auto-syncs via WebSocket
            </span>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📋</div>
              <div style={{ fontWeight: '600' }}>No orders yet</div>
              <div style={{ fontSize: '0.85rem' }}>Create an order to get started.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.map((ord) => {
                const trackingUrl = getTrackingUrl(ord.id);
                const isCopied = copiedId === ord.id;

                return (
                  <div
                    key={ord.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '14px',
                      backgroundColor: '#fcfcfd',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>
                            {ord.id}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                            (v{ord.version})
                          </span>
                        </div>
                        <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.92rem', marginTop: '2px' }}>
                          👤 {ord.customer_name}
                        </div>
                      </div>
                      <StatusBadge status={ord.status} />
                    </div>

                    {/* Items */}
                    <div style={{ marginTop: '10px', fontSize: '0.88rem', color: '#475569' }}>
                      <strong>Items:</strong> {ord.items.join(', ')}
                    </div>

                    <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Ordered: {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>

                    {/* Customer Tracking Link Bar */}
                    <div className="tracking-bar">
                      <span style={{ fontSize: '0.78rem', color: '#475569', wordBreak: 'break-all' }}>
                        🔗 <strong>Tracking:</strong> <code>{trackingUrl}</code>
                      </span>
                      <div className="tracking-bar-actions">
                        <button
                          onClick={() => handleCopyLink(ord.id)}
                          style={{
                            backgroundColor: isCopied ? '#10b981' : '#ffffff',
                            color: isCopied ? '#ffffff' : '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          {isCopied ? '✓ Copied!' : 'Copy Link'}
                        </button>
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#2563eb',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          Open ↗
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
