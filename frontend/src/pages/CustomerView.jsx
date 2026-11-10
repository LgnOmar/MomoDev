import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import OrderLifecycleStepper from '../components/OrderLifecycleStepper';
import { createOrder, fetchOrderById } from '../services/api';

const MEAL_PERIODS = ['Breakfast', 'Lunch', 'Dinner & Full-Course Meal'];

const STATUS_MESSAGES = {
  New: 'Votre commande a été reçue et transmise en cuisine.',
  Preparing: "L'équipe en cuisine prépare activement votre repas !",
  Ready: 'Votre commande est prête et chaude au comptoir ! 🔔',
  Served: 'Votre commande a été servie. Bon appétit !',
};

const formatPrice = (amount) => `${Number(amount || 0).toLocaleString()} DA`;

export default function CustomerView({
  initialOrderId,
  allOrders,
  menu,
  loadingMenu,
  onOrderPlaced,
  onTrackOrder,
}) {
  // Navigation: 'menu' (ordering) vs 'tracking' (live order status)
  const [activeTab, setActiveTab] = useState(initialOrderId ? 'tracking' : 'menu');
  const [selectedMealPeriod, setSelectedMealPeriod] = useState('Breakfast');

  // Shopping cart state (with optional local persistence)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('restaurant_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customerName, setCustomerName] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);

  // Tracking state
  const [trackSearchId, setTrackSearchId] = useState(initialOrderId || '');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('restaurant_cart', JSON.stringify(cart));
    } catch {
      // Local storage unavailable
    }
  }, [cart]);

  // Sync tracked order when initialOrderId prop changes
  useEffect(() => {
    if (initialOrderId) {
      setTrackSearchId(initialOrderId);
      loadTrackedOrder(initialOrderId);
      setActiveTab('tracking');
    }
  }, [initialOrderId]);

  // Keep tracked order in sync with live allOrders updates
  useEffect(() => {
    if (trackedOrder) {
      const match = allOrders.find(
        (o) => o.id.toLowerCase() === trackedOrder.id.toLowerCase()
      );
      if (match && (match.status !== trackedOrder.status || match.version !== trackedOrder.version)) {
        setTrackedOrder(match);
      }
    }
  }, [allOrders]);

  const loadTrackedOrder = async (idToFetch) => {
    const clean = idToFetch.trim();
    if (!clean) return;

    setTrackingLoading(true);
    setTrackingError(null);
    try {
      const order = await fetchOrderById(clean);
      if (!order) {
        setTrackedOrder(null);
        setTrackingError(`Order "${clean}" was not found. Please verify your order ID.`);
      } else {
        setTrackedOrder(order);
        if (onTrackOrder) {
          onTrackOrder(order.id);
        }
      }
    } catch (err) {
      setTrackedOrder(null);
      setTrackingError(err.message || 'Failed to retrieve order status');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Cart operations
  const handleAddToCart = (item) => {
    if (!item.is_available) return;

    setCart((prevCart) => {
      const existing = prevCart.find((ci) => ci.id === item.id);
      if (existing) {
        return prevCart.map((ci) =>
          ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [
        ...prevCart,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          is_available: item.is_available,
        },
      ];
    });
    setOrderError(null);
  };

  const handleUpdateQuantity = (itemId, delta) => {
    setCart((prevCart) => {
      return prevCart
        .map((ci) => {
          if (ci.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean);
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((ci) => ci.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Calculate cart totals
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Submit order to restaurant
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setOrderError(null);

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setOrderError('Please enter your name so we can identify your order.');
      return;
    }

    if (cart.length === 0) {
      setOrderError('Your cart is empty. Please select some delicious items first.');
      return;
    }

    // Check if any cart item is currently unavailable in the live menu
    for (const cartItem of cart) {
      for (const cat of menu) {
        const found = cat.items.find((i) => i.id === cartItem.id);
        if (found && !found.is_available) {
          setOrderError(`"${cartItem.name}" has just become unavailable. Please remove it from your cart.`);
          return;
        }
      }
    }

    setSubmittingOrder(true);
    try {
      const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const orderPayload = {
        customer_name: trimmedName,
        items: cart.map((ci) => ({
          menu_item_id: ci.id,
          quantity: ci.quantity,
        })),
        idempotency_key: idempotencyKey,
      };

      const createdOrder = await createOrder(orderPayload);

      // Order placed successfully!
      setPlacedOrder(createdOrder);
      setTrackedOrder(createdOrder);
      setCart([]);
      try { localStorage.removeItem('restaurant_cart'); } catch {}
      setActiveTab('tracking');

      if (onOrderPlaced) {
        onOrderPlaced(createdOrder);
      }
    } catch (err) {
      setOrderError(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const getTrackingUrl = (order) => {
    const identifier = typeof order === 'object' && order !== null
      ? (order.tracking_token || order.id)
      : order;
    return `${window.location.origin}/?role=customer&orderId=${encodeURIComponent(identifier)}`;
  };

  const handleCopyTrackingLink = (order) => {
    navigator.clipboard.writeText(getTrackingUrl(order)).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Filter categories for the active meal period
  const currentCategories = menu.filter(
    (cat) => cat.meal_period === selectedMealPeriod
  );

  return (
    <div className="page-container" style={{ maxWidth: '1100px' }}>
      {/* Top Navigation & Mode Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            {activeTab === 'menu' ? 'Menu & Commande en Ligne' : 'Suivi de Commande en Direct'}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
            {activeTab === 'menu'
              ? 'Découvrez nos spécialités et commandez directement en cuisine en quelques clics.'
              : 'Suivez la préparation de vos plats en temps réel.'}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('menu')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeTab === 'menu' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: activeTab === 'menu' ? '#eff6ff' : '#ffffff',
              color: activeTab === 'menu' ? '#1d4ed8' : '#475569',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📖</span>
            <span>Menu</span>
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeTab === 'tracking' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: activeTab === 'tracking' ? '#eff6ff' : '#ffffff',
              color: activeTab === 'tracking' ? '#1d4ed8' : '#475569',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📱</span>
            <span>Suivi Commande</span>
            {trackedOrder && (
              <span style={{ fontSize: '0.75rem', background: '#3b82f6', color: '#fff', padding: '1px 6px', borderRadius: '999px' }}>
                {trackedOrder.id}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: RESTAURANT MENU & SHOPPING CART                  */}
      {/* ======================================================== */}
      {activeTab === 'menu' && (
        <div className="customer-layout-grid">
          {/* Main Menu Column */}
          <div style={{ minWidth: 0 }}>
            {/* Meal Period Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '8px',
                marginBottom: '20px',
                overflowX: 'auto',
              }}
            >
              {MEAL_PERIODS.map((period) => {
                const isSelected = selectedMealPeriod === period;
                return (
                  <button
                    key={period}
                    onClick={() => setSelectedMealPeriod(period)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isSelected ? '#1e293b' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                      fontWeight: isSelected ? '700' : '600',
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {period === 'Breakfast' && '🌅 '}
                    {period === 'Lunch' && '🥗 '}
                    {period === 'Dinner & Full-Course Meal' && '🍷 '}
                    {period}
                  </button>
                );
              })}
            </div>

            {selectedMealPeriod === 'Dinner & Full-Course Meal' && (
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '0.82rem', color: '#475569' }}>
                💡 <strong>Menu gastronomique à la carte :</strong> Vous pouvez librement composer votre repas selon vos envies parmi les 12 étapes proposées ci-dessous (la sélection de chaque étape est entièrement optionnelle).
              </div>
            )}

            {loadingMenu ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                Chargement du menu...
              </div>
            ) : currentCategories.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                Aucune catégorie trouvée pour {selectedMealPeriod}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {currentCategories.map((cat, catIdx) => (
                  <section
                    key={cat.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      padding: '18px 20px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                        Étape {cat.display_order}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>
                        {cat.name}
                      </h3>
                    </div>

                    <div className="dishes-grid">
                      {cat.items.map((item) => {
                        const inCart = cart.find((ci) => ci.id === item.id);
                        return (
                          <div
                            key={item.id}
                            style={{
                              border: `1px solid ${item.is_available ? '#e2e8f0' : '#fecaca'}`,
                              borderRadius: '8px',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              backgroundColor: item.is_available ? '#fcfcfd' : '#fef2f2',
                              opacity: item.is_available ? 1 : 0.85,
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700', color: '#0f172a' }}>
                                  {item.name}
                                </h4>
                                <span style={{ fontWeight: '800', fontSize: '0.98rem', color: '#059669', whiteSpace: 'nowrap' }}>
                                  {formatPrice(item.price)}
                                </span>
                              </div>

                              <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                                {item.description}
                              </p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  color: item.is_available ? '#059669' : '#dc2626',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {item.is_available ? '● Disponible' : '✕ Épuisé'}
                              </span>

                              {item.is_available ? (
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(item)}
                                  style={{
                                    backgroundColor: inCart ? '#10b981' : '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '0.82rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {inCart ? `+ Ajouter (${inCart.quantity})` : '+ Ajouter au panier'}
                                </button>
                              ) : (
                                <button
                                  disabled
                                  style={{
                                    backgroundColor: '#e2e8f0',
                                    color: '#94a3b8',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '0.82rem',
                                    fontWeight: '600',
                                    cursor: 'not-allowed',
                                  }}
                                >
                                  Indisponible
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          {/* Floating / Sticky Shopping Cart Panel */}
          <div className="cart-panel-sticky">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>🛒</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  Votre Panier
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  Vider
                </button>
              )}
            </div>

            {orderError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  marginBottom: '14px',
                }}
              >
                ⚠️ {orderError}
              </div>
            )}

            {cart.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🍽️</div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#64748b' }}>Votre panier est vide</div>
                <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>Sélectionnez des plats ci-dessus pour composer votre commande.</div>
              </div>
            ) : (
              <div>
                <ul style={{ margin: '0 0 16px 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                  {cart.map((ci) => (
                    <li
                      key={ci.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.88rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: '10px' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ci.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {formatPrice(ci.price)} unitaire • {formatPrice(ci.price * ci.quantity)}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(ci.id, -1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: '700', fontSize: '0.88rem', minWidth: '18px', textAlign: 'center' }}>
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(ci.id, 1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(ci.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            marginLeft: '4px',
                            fontWeight: 'bold',
                            padding: '2px 4px',
                          }}
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Subtotal & Total */}
                <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>
                    <span>Nombre d'articles :</span>
                    <span>{cartItemCount} article{cartItemCount > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                    <span>Total Estimé :</span>
                    <span style={{ color: '#059669' }}>{formatPrice(cartSubtotal)}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                    *Tarification officielle validée par le serveur lors de la commande.
                  </span>
                </div>

                {/* Customer Details Form */}
                <form onSubmit={handleSubmitOrder}>
                  <div style={{ marginBottom: '14px' }}>
                    <label
                      htmlFor="selfOrderCustomerName"
                      style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#334155', marginBottom: '6px' }}
                    >
                      Nom du Client / N° de Table *
                    </label>
                    <input
                      id="selfOrderCustomerName"
                      type="text"
                      placeholder="Ex: Amine / Table 4"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.92rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingOrder}
                    style={{
                      width: '100%',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      minHeight: '46px',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '0.98rem',
                      cursor: submittingOrder ? 'wait' : 'pointer',
                      opacity: submittingOrder ? 0.7 : 1,
                      boxShadow: '0 3px 6px rgba(37, 99, 235, 0.35)',
                    }}
                  >
                    {submittingOrder ? 'Envoi en cuisine...' : `Valider la Commande (${formatPrice(cartSubtotal)})`}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: ORDER CONFIRMATION & LIVE REAL-TIME TRACKING     */}
      {/* ======================================================== */}
      {activeTab === 'tracking' && (
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {/* Lookup Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadTrackedOrder(trackSearchId);
            }}
            className="customer-search-form"
          >
            <input
              type="text"
              placeholder="Numéro de commande (ex: ORD-1001)..."
              value={trackSearchId}
              onChange={(e) => setTrackSearchId(e.target.value)}
              className="customer-search-input"
            />
            <button
              type="submit"
              disabled={trackingLoading || !trackSearchId.trim()}
              className="customer-search-btn"
              style={{ opacity: trackingLoading || !trackSearchId.trim() ? 0.7 : 1 }}
            >
              {trackingLoading ? 'Recherche...' : 'Suivre'}
            </button>
          </form>

          {trackingError && (
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
              🔍 {trackingError}
            </div>
          )}

          {placedOrder && placedOrder.id === trackedOrder?.id && (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '14px 18px',
                color: '#065f46',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>🎉</span>
              <div>
                <strong>Commande enregistrée avec succès !</strong>
                <div style={{ fontSize: '0.82rem', marginTop: '2px' }}>
                  Votre commande a été transmise en direct à la cuisine. Suivez sa progression ci-dessous.
                </div>
              </div>
            </div>
          )}

          {trackedOrder && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                overflow: 'hidden',
              }}
            >
              {/* Receipt Header */}
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
                    Ticket de Commande
                  </span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    {trackedOrder.id}
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#334155', marginTop: '2px', fontWeight: '600' }}>
                    Client : {trackedOrder.customer_name}
                  </div>
                </div>
                <StatusBadge status={trackedOrder.status} size="large" />
              </div>

              <div style={{ padding: '20px' }}>
                {/* Visual Lifecycle Stepper */}
                <OrderLifecycleStepper currentStatus={trackedOrder.status} />

                {/* Status Message */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    backgroundColor: trackedOrder.status === 'Ready' ? '#ecfdf5' : '#eff6ff',
                    border: `1px solid ${trackedOrder.status === 'Ready' ? '#a7f3d0' : '#bfdbfe'}`,
                    color: trackedOrder.status === 'Ready' ? '#065f46' : '#1e40af',
                    textAlign: 'center',
                    fontWeight: '600',
                    fontSize: '0.92rem',
                  }}
                >
                  {STATUS_MESSAGES[trackedOrder.status] || 'Traitement de la commande en cours.'}
                </div>

                {/* Ordered Items List */}
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.82rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Articles commandés ({trackedOrder.items.length})
                  </h4>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {trackedOrder.items.map((item, idx) => (
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
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '600', color: '#1e293b' }}>
                            {item.quantity}x {item.name}
                          </span>
                          {item.unit_price > 0 && (
                            <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '6px' }}>
                              (@ {formatPrice(item.unit_price)})
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>
                          {formatPrice(item.line_total || item.unit_price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Total Display */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '2px dashed #e2e8f0', fontSize: '1.05rem', fontWeight: '800' }}>
                    <span>Total :</span>
                    <span style={{ color: '#059669' }}>
                      {formatPrice(trackedOrder.total_price || 0)}
                    </span>
                  </div>
                </div>

                {/* Shareable Tracking Link */}
                <div
                  style={{
                    marginTop: '20px',
                    padding: '10px 14px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#475569', wordBreak: 'break-all' }}>
                    🔗 <strong>Lien de suivi :</strong> <code>{getTrackingUrl(trackedOrder)}</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyTrackingLink(trackedOrder)}
                    style={{
                      backgroundColor: copiedLink ? '#10b981' : '#ffffff',
                      color: copiedLink ? '#ffffff' : '#1e293b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedLink ? '✓ Copié !' : 'Copier le lien'}
                  </button>
                </div>

                {/* Footer Actions */}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('menu')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: '700',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    ← Retour au Menu / Commander
                  </button>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Version OCC : v{trackedOrder.version}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!trackedOrder && !trackingLoading && !trackingError && (
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
                Aucune commande sélectionnée
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem' }}>
                Saisissez votre numéro de commande ci-dessus ou parcourez le menu pour commander.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('menu')}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                Parcourir le Menu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
