import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { createOrder, updateMenuItemAvailability } from '../services/api';

const QUICK_ITEMS = [
  'Couscous Royal Agneau',
  'Chakhchoukha de Biskra',
  'Tajine Zitoun Poulet',
  'Bourek Viande Hachée',
  'Chorba Frik Agneau',
  'Chakchouka Traditionnelle',
  'Msemen Miel & Beurre',
  'Thé à la Menthe Fraîche',
];

const formatPrice = (amount) => `${Number(amount || 0).toLocaleString()} DA`;

export default function CashierView({ orders, menu = [], onOrderCreated, onMenuItemUpdated }) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'availability'
  const [selectedMealPeriod, setSelectedMealPeriod] = useState('Breakfast');
  const [togglingItemId, setTogglingItemId] = useState(null);
  const [availabilityMessage, setAvailabilityMessage] = useState(null);

  // Walk-in order form state
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

  const getTrackingUrl = (order) => {
    const origin = window.location.origin;
    const identifier = typeof order === 'object' && order !== null
      ? (order.tracking_token || order.id)
      : order;
    return `${origin}/?role=customer&orderId=${encodeURIComponent(identifier)}`;
  };

  const handleCopyLink = (order) => {
    const orderId = typeof order === 'object' && order !== null ? order.id : order;
    const url = getTrackingUrl(order);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(orderId);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // Toggle item availability
  const handleToggleAvailability = async (item) => {
    setTogglingItemId(item.id);
    setAvailabilityMessage(null);
    try {
      const nextStatus = !item.is_available;
      const updated = await updateMenuItemAvailability(item.id, nextStatus);
      if (onMenuItemUpdated) {
        onMenuItemUpdated(updated);
      }
      setAvailabilityMessage(`"${item.name}" is now marked as ${nextStatus ? 'Available' : 'Unavailable'}.`);
      setTimeout(() => setAvailabilityMessage(null), 3000);
    } catch (err) {
      alert(`Error updating availability: ${err.message}`);
    } finally {
      setTogglingItemId(null);
    }
  };

  const currentCategories = menu.filter((cat) => cat.meal_period === selectedMealPeriod);

  return (
    <div className="page-container">
      {/* Top Header & Section Switcher */}
      <div className="page-header-wrap">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="page-badge-pill">💼 Terminal Caisse & Comptoir</span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>• Prise de commande & Contrôle des stocks</span>
          </div>
          <h2 className="page-header-title">
            {activeTab === 'orders' ? '📋 Gestion des Commandes au Comptoir' : '🔘 Contrôle de Disponibilité de la Carte'}
          </h2>
          <p className="page-header-subtitle">
            {activeTab === 'orders'
              ? 'Enregistrez les commandes des clients sur place et suivez la file d\'attente synchronisée en temps réel.'
              : 'Activez ou désactivez les plats en direct. Les clients voient immédiatement les modifications sans rafraîchir.'}
          </p>
        </div>

        {/* View Switcher Segmented Control */}
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeTab === 'orders' ? '#ffffff' : 'transparent',
              color: activeTab === 'orders' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'orders' ? '800' : '600',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'orders' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📋</span>
            <span>File des Commandes ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('availability')}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeTab === 'availability' ? '#ffffff' : 'transparent',
              color: activeTab === 'availability' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'availability' ? '800' : '600',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'availability' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🔘</span>
            <span>Disponibilité Carte</span>
          </button>
        </div>
      </div>

      {availabilityMessage && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '10px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            fontWeight: '600',
          }}
        >
          ✓ {availabilityMessage}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: ORDERS & WALK-IN ORDER ENTRY                  */}
      {/* ======================================================== */}
      {activeTab === 'orders' && (
        <div className="cashier-grid">
          {/* Order Creation Card */}
          <section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.01em' }}>
                📝 Prise de Commande au Comptoir
              </h3>
              <span style={{ fontSize: '0.74rem', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                Walk-in
              </span>
            </div>

            {formError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '0.86rem',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitOrder}>
              <div style={{ marginBottom: '18px' }}>
                <label
                  htmlFor="customerName"
                  style={{ display: 'block', fontWeight: '700', fontSize: '0.84rem', color: '#334155', marginBottom: '6px' }}
                >
                  Nom du Client / Identifiant Table *
                </label>
                <input
                  id="customerName"
                  type="text"
                  placeholder="Ex: Table 5 ou Mustapha"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                />
              </div>

              {/* Quick Add Items */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ display: 'block', fontWeight: '700', fontSize: '0.82rem', color: '#475569', marginBottom: '8px' }}>
                  ⚡ Ajout Rapide (Spécialités Populaires) :
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
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                <input
                  type="text"
                  placeholder="Autre plat ou demande spéciale..."
                  value={customItem}
                  onChange={(e) => setCustomItem(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    fontWeight: '700',
                    color: '#1e293b',
                    minHeight: '42px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  + Ajouter
                </button>
              </div>

              {/* Current Items List */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.84rem', color: '#334155' }}>
                    Articles sélectionnés ({selectedItems.length})
                  </span>
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedItems([])}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '700' }}
                    >
                      Tout effacer
                    </button>
                  )}
                </div>
                {selectedItems.length === 0 ? (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '0.84rem', color: '#94a3b8' }}>
                    Aucun article ajouté. Utilisez les raccourcis ci-dessus ou saisissez un plat.
                  </div>
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                    {selectedItems.map((item, idx) => (
                      <li
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.88rem',
                        }}
                      >
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>• {item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontWeight: '700',
                            padding: '4px 6px',
                            fontSize: '0.9rem',
                            borderRadius: '4px',
                          }}
                          title="Supprimer l'article"
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
                className="btn-checkout"
              >
                {submitting ? (
                  <>
                    <span>⏳</span>
                    <span>Envoi en cuisine...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Transmettre la Commande en Cuisine</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Existing Orders List */}
          <section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.01em' }}>
                  📋 File des Commandes ({orders.length})
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: '999px', fontWeight: '700' }}>
                <span className="ws-dot live" style={{ width: '6px', height: '6px' }} />
                <span>Flux Direct WebSocket</span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '2.8rem', marginBottom: '10px' }}>📋</div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#475569' }}>Aucune commande pour l'instant</div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Les commandes passées au comptoir ou par les clients s'afficheront ici en direct.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {orders.map((ord) => {
                  const trackingUrl = getTrackingUrl(ord);
                  const isCopied = copiedId === ord.id;
                  const borderAccentColor =
                    ord.status === 'Ready'
                      ? '#10b981'
                      : ord.status === 'Preparing'
                      ? '#f59e0b'
                      : ord.status === 'Served'
                      ? '#6366f1'
                      : '#3b82f6';

                  return (
                    <div
                      key={ord.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderLeft: `4px solid ${borderAccentColor}`,
                        borderRadius: '12px',
                        padding: '16px',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                              {ord.id}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '0.74rem', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                              v{ord.version}
                            </span>
                          </div>
                          <div style={{ fontWeight: '700', color: '#334155', fontSize: '0.94rem', marginTop: '3px' }}>
                            👤 {ord.customer_name}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {ord.total_price > 0 && (
                            <span className="dish-price-pill">
                              {formatPrice(ord.total_price)}
                            </span>
                          )}
                          <StatusBadge status={ord.status} />
                        </div>
                      </div>

                      {/* Items */}
                      <div style={{ marginTop: '12px', fontSize: '0.88rem', color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontWeight: '700', color: '#334155', marginRight: '6px' }}>Plats :</span>
                        {ord.items.map((it) => `${it.quantity > 1 ? `${it.quantity}x ` : ''}${it.name}`).join(', ')}
                      </div>

                      <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#94a3b8' }}>
                        Commandée à : {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>

                      {/* Customer Tracking Link Bar */}
                      <div className="tracking-bar">
                        <span style={{ fontSize: '0.78rem', color: '#475569', wordBreak: 'break-all' }}>
                          🔗 <strong>Suivi Client :</strong> <code>{trackingUrl}</code>
                        </span>
                        <div className="tracking-bar-actions">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(ord)}
                            style={{
                              backgroundColor: isCopied ? '#10b981' : '#ffffff',
                              color: isCopied ? '#ffffff' : '#334155',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{isCopied ? '✓' : '📋'}</span>
                            <span>{isCopied ? 'Copié !' : 'Copier'}</span>
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
                              fontWeight: '700',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            Ouvrir ↗
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
      )}

      {/* ======================================================== */}
      {/* SECTION 2: MENU AVAILABILITY MANAGEMENT                  */}
      {/* ======================================================== */}
      {activeTab === 'availability' && (
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
              🔘 Disponibilité de la Carte en Direct
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
              Basculez l'état des stocks d'un clic. Toute modification est immédiatement répercutée en temps réel sur la vue client par WebSocket.
            </p>
          </div>

          {/* Meal Period Tabs */}
          <div className="meal-periods-container">
            {['Breakfast', 'Lunch', 'Dinner & Full-Course Meal'].map((period) => {
              const isSelected = selectedMealPeriod === period;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSelectedMealPeriod(period)}
                  className={`meal-period-btn ${isSelected ? 'active' : ''}`}
                >
                  {period === 'Breakfast' && '🌅 Petit-Déjeuner'}
                  {period === 'Lunch' && '🥗 Déjeuner'}
                  {period === 'Dinner & Full-Course Meal' && '🍷 Dîner & Grand Menu'}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {currentCategories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <span className="category-step-badge">
                    Étape {cat.display_order}
                  </span>
                  <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>
                    {cat.name}
                  </h4>
                </div>

                <div className="availability-grid">
                  {cat.items.map((item) => {
                    const isToggling = togglingItemId === item.id;
                    return (
                      <div
                        key={item.id}
                        style={{
                          border: `1.5px solid ${item.is_available ? '#cbd5e1' : '#fca5a5'}`,
                          backgroundColor: item.is_available ? '#ffffff' : '#fef2f2',
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '0.92rem', color: item.is_available ? '#0f172a' : '#991b1b', lineHeight: 1.3 }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                            {formatPrice(item.price)}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleAvailability(item)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: item.is_available ? '#059669' : '#dc2626',
                            color: '#ffffff',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            cursor: isToggling ? 'wait' : 'pointer',
                            opacity: isToggling ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                            boxShadow: `0 2px 6px ${item.is_available ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isToggling ? '⏳...' : item.is_available ? '✓ En Stock' : '✕ Épuisé'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
