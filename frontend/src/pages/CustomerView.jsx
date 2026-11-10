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

const CATEGORY_ICONS = {
  'Beverages / Liquid Start': '☕',
  'Fruit & Bakery': '🥐',
  'Cereals & Grains': '🌾',
  'Main Plates': '🍳',
  'Appetizer / Starter': '🥟',
  'Main Course': '🍲',
  'Sides': '🍟',
  'Dessert': '🍮',
  'Hors d’œuvre': '🍢',
  'Amuse-bouche': '🥄',
  'Soup': '🥣',
  'Salad': '🥗',
  'Fish / Seafood Course': '🐟',
  'Palate Cleanser': '🍧',
  'Cheese Course': '🧀',
  'Mignardises / Petit Fours': '🍬',
  'Digestif & Beverages': '🍵',
};

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
    <div className="page-container" style={{ maxWidth: '1180px' }}>
      {/* Top Header & Mode Switcher */}
      <div className="page-header-wrap">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="page-badge-pill">✨ Restaurant Gastronomique</span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>• Commande Directe & Suivi Temps Réel</span>
          </div>
          <h2 className="page-header-title">
            {activeTab === 'menu' ? '🍽️ Carte des Menus & Commande' : '📱 Suivi de Commande en Direct'}
          </h2>
          <p className="page-header-subtitle">
            {activeTab === 'menu'
              ? 'Découvrez nos créations culinaires et commandez directement en cuisine en quelques clics.'
              : 'Visualisez l\'avancement de la préparation de vos plats en temps réel sans rafraîchir.'}
          </p>
        </div>

        {/* View Mode Toggle Segmented Control */}
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('menu')}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeTab === 'menu' ? '#ffffff' : 'transparent',
              color: activeTab === 'menu' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'menu' ? '800' : '600',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'menu' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📖</span>
            <span>La Carte</span>
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeTab === 'tracking' ? '#ffffff' : 'transparent',
              color: activeTab === 'tracking' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'tracking' ? '800' : '600',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'tracking' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📱</span>
            <span>Suivi</span>
            {trackedOrder && (
              <span style={{ fontSize: '0.72rem', background: '#2563eb', color: '#fff', padding: '1px 7px', borderRadius: '999px', fontWeight: '800' }}>
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
            {/* Meal Period Segmented Nav */}
            <div className="meal-periods-container">
              {MEAL_PERIODS.map((period) => {
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

            {selectedMealPeriod === 'Dinner & Full-Course Meal' && (
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', marginBottom: '22px', fontSize: '0.84rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>💡</span>
                <div>
                  <strong>Menu gastronomique à la carte :</strong> Vous pouvez librement composer votre repas selon vos envies parmi les 12 étapes proposées ci-dessous (la sélection de chaque étape est entièrement optionnelle).
                </div>
              </div>
            )}

            {loadingMenu ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
                Chargement du menu gastronomique...
              </div>
            ) : currentCategories.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                Aucune catégorie trouvée pour {selectedMealPeriod}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {currentCategories.map((cat, catIdx) => (
                  <section key={cat.id} className="category-section">
                    <div className="category-header">
                      <span className="category-step-badge">
                        Étape {cat.display_order}
                      </span>
                      <h3 className="category-title">
                        <span style={{ marginRight: '6px' }}>{CATEGORY_ICONS[cat.name] || '🍽️'}</span>
                        {cat.name}
                      </h3>
                    </div>

                    <div className="dishes-grid">
                      {cat.items.map((item) => {
                        const inCart = cart.find((ci) => ci.id === item.id);
                        return (
                          <div
                            key={item.id}
                            className={`dish-card ${!item.is_available ? 'unavailable' : ''}`}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                <h4 className="dish-title">
                                  {item.name}
                                </h4>
                                <span className="dish-price-pill">
                                  {formatPrice(item.price)}
                                </span>
                              </div>

                              <p className="dish-description">
                                {item.description}
                              </p>
                            </div>

                            <div className="dish-footer">
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  color: item.is_available ? '#059669' : '#dc2626',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}
                              >
                                {item.is_available ? (
                                  <>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                    Disponible
                                  </>
                                ) : (
                                  <>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                                    Épuisé
                                  </>
                                )}
                              </span>

                              {item.is_available ? (
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(item)}
                                  className={`btn-add-cart ${inCart ? 'in-cart' : ''}`}
                                >
                                  {inCart ? `+ Ajouter (${inCart.quantity})` : '+ Ajouter au panier'}
                                </button>
                              ) : (
                                <button
                                  disabled
                                  style={{
                                    backgroundColor: '#f1f5f9',
                                    color: '#94a3b8',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '7px 14px',
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
            <div className="cart-header">
              <div className="cart-title">
                <span style={{ fontSize: '1.3rem' }}>🛒</span>
                <span>Votre Panier</span>
                {cart.length > 0 && (
                  <span style={{ fontSize: '0.74rem', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '999px', fontWeight: '800', border: '1px solid #bfdbfe' }}>
                    {cartItemCount}
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '700' }}
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
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <span>{orderError}</span>
              </div>
            )}

            {cart.length === 0 ? (
              <div style={{ padding: '36px 12px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🍽️</div>
                <div style={{ fontWeight: '700', fontSize: '0.96rem', color: '#475569' }}>Votre panier est vide</div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px', color: '#94a3b8' }}>Sélectionnez des plats ci-dessus pour composer votre repas.</div>
              </div>
            ) : (
              <div>
                <ul style={{ margin: '0 0 16px 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                  {cart.map((ci) => (
                    <li key={ci.id} className="cart-item-row">
                      <div style={{ flex: 1, minWidth: 0, marginRight: '10px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ci.name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                          {formatPrice(ci.price)} unitaire • <strong>{formatPrice(ci.price * ci.quantity)}</strong>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(ci.id, -1)}
                          className="cart-qty-btn"
                          title="Diminuer"
                        >
                          -
                        </button>
                        <span style={{ fontWeight: '800', fontSize: '0.9rem', minWidth: '20px', textAlign: 'center', color: '#0f172a' }}>
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(ci.id, 1)}
                          className="cart-qty-btn"
                          title="Augmenter"
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
                            padding: '4px 6px',
                            borderRadius: '4px',
                          }}
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Subtotal & Total Box */}
                <div className="cart-total-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#64748b', marginBottom: '6px' }}>
                    <span>Nombre d'articles :</span>
                    <span style={{ fontWeight: '700', color: '#334155' }}>{cartItemCount} article{cartItemCount > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                    <span>Total Estimé :</span>
                    <span style={{ color: '#059669', fontSize: '1.2rem' }}>{formatPrice(cartSubtotal)}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '6px' }}>
                    *Tarification officielle validée par le serveur lors de la commande.
                  </span>
                </div>

                {/* Customer Details Form */}
                <form onSubmit={handleSubmitOrder}>
                  <div style={{ marginBottom: '14px' }}>
                    <label
                      htmlFor="selfOrderCustomerName"
                      style={{ display: 'block', fontWeight: '700', fontSize: '0.83rem', color: '#334155', marginBottom: '6px' }}
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

                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="btn-checkout"
                  >
                    {submittingOrder ? (
                      <>
                        <span>⏳</span>
                        <span>Envoi en cuisine...</span>
                      </>
                    ) : (
                      <>
                        <span>Valider la Commande</span>
                        <span>({formatPrice(cartSubtotal)})</span>
                        <span>🚀</span>
                      </>
                    )}
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
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
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
              {trackingLoading ? 'Recherche...' : '🔍 Suivre'}
            </button>
          </form>

          {trackingError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '14px 18px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '0.9rem',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
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
                borderRadius: '14px',
                padding: '16px 20px',
                color: '#065f46',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)',
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>🎉</span>
              <div>
                <strong style={{ fontSize: '1rem' }}>Commande enregistrée avec succès !</strong>
                <div style={{ fontSize: '0.84rem', marginTop: '2px', color: '#047857' }}>
                  Votre commande a été transmise instantanément à la cuisine via WebSocket. Suivez l'évolution en temps réel ci-dessous.
                </div>
              </div>
            </div>
          )}

          {trackedOrder && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
                overflow: 'hidden',
              }}
            >
              {/* Receipt Header Strip */}
              <div
                style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '800' }}>
                      Ticket de Commande
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#475569', padding: '1px 7px', borderRadius: '4px', fontWeight: '700' }}>
                      OCC v{trackedOrder.version}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', marginTop: '2px' }}>
                    {trackedOrder.id}
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#334155', marginTop: '3px', fontWeight: '600' }}>
                    Client : <strong>{trackedOrder.customer_name}</strong>
                  </div>
                </div>
                <StatusBadge status={trackedOrder.status} size="large" />
              </div>

              <div style={{ padding: '24px' }}>
                {/* Visual Lifecycle Stepper */}
                <OrderLifecycleStepper currentStatus={trackedOrder.status} />

                {/* Status Announcement Message Banner */}
                <div
                  style={{
                    marginTop: '20px',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    backgroundColor: trackedOrder.status === 'Ready' ? '#ecfdf5' : '#eff6ff',
                    border: `1.5px solid ${trackedOrder.status === 'Ready' ? '#6ee7b7' : '#93c5fd'}`,
                    color: trackedOrder.status === 'Ready' ? '#065f46' : '#1e40af',
                    textAlign: 'center',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
                  {STATUS_MESSAGES[trackedOrder.status] || 'Traitement de la commande en cours.'}
                </div>

                {/* Ordered Items List */}
                <div style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Articles Commandés ({trackedOrder.items.length})
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Passée à {new Date(trackedOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {trackedOrder.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.92rem',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', fontWeight: '800', fontSize: '0.84rem' }}>
                            {item.quantity}x
                          </span>
                          <div>
                            <span style={{ fontWeight: '700', color: '#1e293b' }}>
                              {item.name}
                            </span>
                            {item.unit_price > 0 && (
                              <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '8px' }}>
                                ({formatPrice(item.unit_price)})
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontWeight: '800', color: '#0f172a' }}>
                          {formatPrice(item.line_total || item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total Display */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '16px',
                      padding: '14px 18px',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '1.15rem',
                      fontWeight: '800',
                    }}
                  >
                    <span style={{ color: '#1e293b' }}>Total de la commande :</span>
                    <span style={{ color: '#059669', fontSize: '1.3rem' }}>
                      {formatPrice(trackedOrder.total_price || 0)}
                    </span>
                  </div>
                </div>

                {/* Shareable Tracking Link */}
                <div
                  style={{
                    marginTop: '22px',
                    padding: '14px 16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>
                      🔗 Lien de suivi direct :
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyTrackingLink(trackedOrder)}
                      style={{
                        backgroundColor: copiedLink ? '#10b981' : '#ffffff',
                        color: copiedLink ? '#ffffff' : '#1e293b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{copiedLink ? '✓' : '📋'}</span>
                      <span>{copiedLink ? 'Lien copié !' : 'Copier le lien'}</span>
                    </button>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', wordBreak: 'break-all', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                    {getTrackingUrl(trackedOrder)}
                  </div>
                </div>

                {/* Footer Actions */}
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('menu')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: '800',
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 0',
                    }}
                  >
                    ← Retourner à la Carte pour commander
                  </button>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Mise à jour automatique par WebSocket
                  </span>
                </div>
              </div>
            </div>
          )}

          {!trackedOrder && !trackingLoading && !trackingError && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '2px dashed #cbd5e1',
                padding: '48px 24px',
                textAlign: 'center',
                color: '#64748b',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔎</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '800' }}>
                Aucune commande sélectionnée
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#64748b', maxWidth: '380px', marginInline: 'auto' }}>
                Entrez votre identifiant de commande ci-dessus pour suivre son état en cuisine, ou parcourez notre carte gastronomique.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('menu')}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                📖 Parcourir la Carte des Menus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
