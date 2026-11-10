import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import OrderLifecycleStepper from '../components/OrderLifecycleStepper';
import { fetchOrderById } from '../services/api';

const STATUS_MESSAGES = {
  New: 'Your order has been received by the cashier and is queued for preparation.',
  Preparing: 'The kitchen team is actively preparing your meal right now!',
  Ready: 'Your food is fresh and ready for pickup at the counter! 🔔',
  Served: 'Your order has been served. Enjoy your meal!',
};

export default function CustomerView({ initialOrderId, allOrders, onSearchOrder }) {
  const [searchInput, setSearchInput] = useState(initialOrderId || '');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Sync search input with URL prop if it changes
  useEffect(() => {
    if (initialOrderId) {
      setSearchInput(initialOrderId);
      loadOrder(initialOrderId);
    }
  }, [initialOrderId]);

  // If order is currently displayed and updated in allOrders via WebSocket, update our displayed order!
  useEffect(() => {
    if (currentOrder) {
      const match = allOrders.find((o) => o.id.toLowerCase() === currentOrder.id.toLowerCase());
      if (match && (match.status !== currentOrder.status || match.version !== currentOrder.version)) {
        setCurrentOrder(match);
      }
    }
  }, [allOrders]);

  const loadOrder = async (orderIdToFetch) => {
    const clean = orderIdToFetch.trim();
    if (!clean) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const order = await fetchOrderById(clean);
      if (!order) {
        setCurrentOrder(null);
        setErrorMessage(`Order "${clean}" was not found. Please check your order ID.`);
      } else {
        setCurrentOrder(order);
        if (onSearchOrder) {
          onSearchOrder(order.id);
        }
      }
    } catch (err) {
      setCurrentOrder(null);
      setErrorMessage(err.message || 'Failed to retrieve order status');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrder(searchInput);
  };

  return (
    <div className="customer-container">
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
          Customer Order Tracker
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
          Real-time tracking of your meal preparation. This screen updates live as the kitchen works.
        </p>
      </div>

      {/* Order Lookup Search */}
      <form onSubmit={handleSearchSubmit} className="customer-search-form">
        <input
          type="text"
          placeholder="Enter Order ID (e.g. ORD-1001)..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="customer-search-input"
        />
        <button
          type="submit"
          disabled={loading || !searchInput.trim()}
          className="customer-search-btn"
          style={{ opacity: loading || !searchInput.trim() ? 0.7 : 1 }}
        >
          {loading ? 'Searching...' : 'Track Order'}
        </button>
      </form>

      {errorMessage && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '14px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.88rem',
            textAlign: 'center',
          }}
        >
          🔍 {errorMessage}
        </div>
      )}

      {currentOrder && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Card Top Banner */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                Order Receipt
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                {currentOrder.id}
              </div>
              <div style={{ fontSize: '0.92rem', color: '#334155', marginTop: '2px', fontWeight: '600' }}>
                Welcome, {currentOrder.customer_name}!
              </div>
            </div>
            <StatusBadge status={currentOrder.status} size="large" />
          </div>

          <div style={{ padding: '20px' }}>
            {/* Status Stepper */}
            <OrderLifecycleStepper currentStatus={currentOrder.status} />

            {/* Dynamic Status Banner */}
            <div
              style={{
                marginTop: '16px',
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: currentOrder.status === 'Ready' ? '#ecfdf5' : '#eff6ff',
                border: `1px solid ${currentOrder.status === 'Ready' ? '#a7f3d0' : '#bfdbfe'}`,
                color: currentOrder.status === 'Ready' ? '#065f46' : '#1e40af',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '0.92rem',
              }}
            >
              {STATUS_MESSAGES[currentOrder.status] || 'Order is being processed.'}
            </div>

            {/* Items Summary */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.82rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Items in Your Order ({currentOrder.items.length})
              </h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentOrder.items.map((item, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #f1f5f9',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      color: '#1e293b',
                    }}
                  >
                    <span>🍴 {item}</span>
                    <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.85rem' }}>✓</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Meta Footer */}
            <div
              style={{
                marginTop: '20px',
                paddingTop: '14px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.75rem',
                color: '#94a3b8',
              }}
            >
              <span>Placed: {new Date(currentOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span>Sync Version: #{currentOrder.version} (OCC Verified)</span>
            </div>
          </div>
        </div>
      )}

      {!currentOrder && !loading && !errorMessage && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px dashed #cbd5e1',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔎</div>
          <h3 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '1.05rem' }}>
            No Order Selected
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            Enter your order ID above or use the tracking link provided by the cashier.
          </p>
        </div>
      )}
    </div>
  );
}
