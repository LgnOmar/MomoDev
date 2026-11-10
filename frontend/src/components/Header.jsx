import React from 'react';

export default function Header({ currentRole, wsStatus, onSelectRole }) {
  const roles = [
    { id: 'cashier', label: 'Cashier', icon: '💳' },
    { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { id: 'customer', label: 'Customer', icon: '📱' },
  ];

  const statusMap = {
    connected: { label: 'Live', color: '#10b981' },
    reconnecting: { label: 'Reconnecting...', color: '#f59e0b' },
    disconnected: { label: 'Offline', color: '#ef4444' },
  };

  const statusConfig = statusMap[wsStatus] || statusMap.disconnected;

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div className="header-brand">
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🍔</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Order Sync
            </h1>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>
              Real-Time Kitchen System
            </span>
          </div>
        </div>

        {/* Connection Indicator */}
        <div className="ws-badge" title={`WebSocket Status: ${wsStatus}`}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: statusConfig.color,
              display: 'inline-block',
              boxShadow: `0 0 6px ${statusConfig.color}`,
            }}
          />
          <span style={{ color: '#e2e8f0', fontSize: '0.75rem' }}>{statusConfig.label}</span>
        </div>
      </div>

      {/* Role Navigation */}
      <nav className="header-nav" aria-label="Role Navigation">
        {roles.map((r) => {
          const isActive = currentRole === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRole(r.id)}
              className="header-nav-btn"
              style={{
                backgroundColor: isActive ? '#3b82f6' : '#334155',
                color: '#ffffff',
                border: isActive ? '1px solid #60a5fa' : '1px solid transparent',
                boxShadow: isActive ? '0 2px 4px rgba(59, 130, 246, 0.4)' : 'none',
              }}
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
