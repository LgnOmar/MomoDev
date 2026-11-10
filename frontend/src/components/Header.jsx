import React from 'react';

export default function Header({ currentRole, wsStatus, onSelectRole }) {
  const roles = [
    { id: 'customer', label: 'Espace Client (Menu & Suivi)', icon: '📱' },
    { id: 'kitchen', label: 'Cuisine (KDS)', icon: '🍳' },
    { id: 'cashier', label: 'Caisse & Stocks', icon: '💳' },
  ];

  const statusMap = {
    connected: { label: 'En direct', color: '#10b981', isLive: true },
    reconnecting: { label: 'Reconnexion...', color: '#f59e0b', isLive: false },
    disconnected: { label: 'Hors ligne', color: '#ef4444', isLive: false },
  };

  const statusConfig = statusMap[wsStatus] || statusMap.disconnected;

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
        <div className="header-brand">
          <div className="header-brand-icon">
            <span>🍽️</span>
          </div>
          <div>
            <h1 className="header-brand-title">
              <span>Le Relais Gastronomique</span>
              <span style={{ fontSize: '0.65rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontWeight: '800', letterSpacing: '0.04em' }}>
                DIRECT SYNC
              </span>
            </h1>
            <span className="header-brand-subtitle">
              Gestion de Commandes & Synchronisation Temps Réel
            </span>
          </div>
        </div>

        {/* Live WebSocket Connection Indicator */}
        <div className="ws-badge" title={`Statut WebSocket: ${wsStatus}`}>
          <span
            className={`ws-dot ${statusConfig.isLive ? 'live' : ''}`}
            style={{ backgroundColor: statusConfig.color }}
          />
          <span style={{ color: '#f1f5f9', fontSize: '0.78rem' }}>{statusConfig.label}</span>
        </div>
      </div>

      {/* Role Navigation Segmented Bar */}
      <nav className="header-nav" aria-label="Navigation des Rôles">
        {roles.map((r) => {
          const isActive = currentRole === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRole(r.id)}
              className={`header-nav-btn ${isActive ? 'active' : ''}`}
            >
              <span>{r.icon}</span>
              <span>{r.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
