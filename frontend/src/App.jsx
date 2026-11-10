import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CashierView from './pages/CashierView';
import KitchenView from './pages/KitchenView';
import CustomerView from './pages/CustomerView';
import { fetchOrders, fetchMenu } from './services/api';
import { wsService } from './services/websocket';
import './App.css';

export default function App() {
  // Read initial role and orderId from URL query string
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      role: params.get('role') || 'customer', // Customer self-service is now primary
      orderId: params.get('orderId') || '',
    };
  };

  const initialParams = getUrlParams();
  const [currentRole, setCurrentRole] = useState(initialParams.role);
  const [customerOrderId, setCustomerOrderId] = useState(initialParams.orderId);

  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Sync state when browser navigation occurs (Back/Forward)
  useEffect(() => {
    const handlePopState = () => {
      const { role, orderId } = getUrlParams();
      setCurrentRole(role);
      setCustomerOrderId(orderId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL search params cleanly
  const updateUrl = (role, orderId = '') => {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (orderId) params.set('orderId', orderId);
    const newRelativePath = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, '', newRelativePath);
  };

  const handleRoleSelect = (newRole) => {
    setCurrentRole(newRole);
    updateUrl(newRole, newRole === 'customer' ? customerOrderId : '');
  };

  const handleCustomerTrackOrder = (orderIdToTrack) => {
    setCustomerOrderId(orderIdToTrack);
    updateUrl('customer', orderIdToTrack);
  };

  // REST API fetch for authoritative order list
  const loadInitialOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders via REST API:', err);
      setFetchError(err.message || 'Could not connect to backend server');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // REST API fetch for structured menu
  const loadInitialMenu = useCallback(async () => {
    setLoadingMenu(true);
    try {
      const data = await fetchMenu();
      setMenu(data);
    } catch (err) {
      console.error('Failed to load menu via REST API:', err);
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  // Initial mount: load data & establish WebSocket connection
  useEffect(() => {
    loadInitialOrders();
    loadInitialMenu();

    // Start WebSocket
    wsService.connect();

    const unsubStatus = wsService.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubMessages = wsService.onMessage((msg) => {
      if (!msg || !msg.event || !msg.data) return;

      if (msg.event === 'order_created') {
        setOrders((prev) => {
          if (prev.some((o) => o.id === msg.data.id)) return prev;
          return [msg.data, ...prev];
        });
      } else if (msg.event === 'order_updated') {
        setOrders((prev) =>
          prev.map((o) => (o.id === msg.data.id ? msg.data : o))
        );
      } else if (msg.event === 'menu_item_updated') {
        const updatedItem = msg.data;
        setMenu((prevMenu) =>
          prevMenu.map((cat) => ({
            ...cat,
            items: cat.items.map((item) =>
              item.id === updatedItem.id ? updatedItem : item
            ),
          }))
        );
      }
    });

    // When WebSocket reconnects, refresh data from REST API to recover any missed events
    const unsubReconnect = wsService.onReconnect(() => {
      console.log('WebSocket reconnected! Refreshing data from REST API...');
      loadInitialOrders();
      loadInitialMenu();
    });

    return () => {
      unsubStatus();
      unsubMessages();
      unsubReconnect();
      wsService.disconnect();
    };
  }, [loadInitialOrders, loadInitialMenu]);

  const handleOrderCreated = (newOrder) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === newOrder.id)) return prev;
      return [newOrder, ...prev];
    });
  };

  const handleOrderUpdated = (updatedOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
  };

  const handleMenuItemUpdated = (updatedItem) => {
    setMenu((prevMenu) =>
      prevMenu.map((cat) => ({
        ...cat,
        items: cat.items.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        ),
      }))
    );
  };

  return (
    <div className="app-container">
      <Header
        currentRole={currentRole}
        wsStatus={wsStatus}
        onSelectRole={handleRoleSelect}
      />

      {fetchError && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            borderBottom: '1px solid #f87171',
            padding: '12px 24px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
          }}
        >
          <span>
            ⚠️ <strong>Backend Connection Error:</strong> {fetchError}. Please verify that the FastAPI backend is running at <code>http://127.0.0.1:8000</code>.
          </span>
          <button
            onClick={() => {
              setFetchError(null);
              loadInitialOrders();
              loadInitialMenu();
            }}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '4px',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      <main className="main-content">
        {currentRole === 'cashier' && (
          <CashierView
            orders={orders}
            menu={menu}
            onOrderCreated={handleOrderCreated}
            onMenuItemUpdated={handleMenuItemUpdated}
          />
        )}

        {currentRole === 'kitchen' && (
          <KitchenView
            orders={orders}
            onOrderUpdated={handleOrderUpdated}
          />
        )}

        {currentRole === 'customer' && (
          <CustomerView
            initialOrderId={customerOrderId}
            allOrders={orders}
            menu={menu}
            loadingMenu={loadingMenu}
            onOrderPlaced={(createdOrder) => {
              handleOrderCreated(createdOrder);
              handleCustomerTrackOrder(createdOrder.id);
            }}
            onTrackOrder={handleCustomerTrackOrder}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <div className="app-footer-brand">
            <span style={{ fontSize: '1.15rem' }}>🍽️</span>
            <strong>Le Relais Gastronomique</strong>
            <span style={{ color: '#94a3b8' }}>• Système Intégré de Commande & KDS</span>
          </div>
          <div className="app-footer-meta">
            <span>Devise : <strong>Dinar Algérien (DA)</strong></span>
            <span>•</span>
            <span>Synchronisation : <strong>WebSocket Bi-directionnel</strong></span>
            <span>•</span>
            <span>Concurrence : <strong>OCC v-counter</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
