import React from 'react';

const STATUS_CONFIG = {
  New: {
    label: 'Reçue',
    bgColor: '#eff6ff',
    color: '#1d4ed8',
    borderColor: '#bfdbfe',
    icon: '●',
    dotColor: '#3b82f6',
  },
  Preparing: {
    label: 'En Préparation',
    bgColor: '#fffbeb',
    color: '#b45309',
    borderColor: '#fde68a',
    icon: '⏳',
    dotColor: '#f59e0b',
  },
  Ready: {
    label: 'Prête au comptoir',
    bgColor: '#ecfdf5',
    color: '#047857',
    borderColor: '#a7f3d0',
    icon: '✓',
    dotColor: '#10b981',
  },
  Served: {
    label: 'Servie',
    bgColor: '#f8fafc',
    color: '#475569',
    borderColor: '#e2e8f0',
    icon: '🍽',
    dotColor: '#94a3b8',
  },
};

export default function StatusBadge({ status, size = 'medium' }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bgColor: '#f1f5f9',
    color: '#334155',
    borderColor: '#cbd5e1',
    icon: '•',
    dotColor: '#64748b',
  };

  const isLarge = size === 'large';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isLarge ? '8px' : '6px',
        padding: isLarge ? '7px 16px' : '4px 12px',
        borderRadius: '9999px',
        fontSize: isLarge ? '0.92rem' : '0.8rem',
        fontWeight: '700',
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        letterSpacing: '0.01em',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.03)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: isLarge ? '8px' : '7px',
          height: isLarge ? '8px' : '7px',
          borderRadius: '50%',
          backgroundColor: config.dotColor,
          display: 'inline-block',
        }}
      />
      <span>{config.label}</span>
      {config.icon !== '●' && config.icon !== '•' && (
        <span style={{ fontSize: isLarge ? '0.9rem' : '0.78rem' }}>{config.icon}</span>
      )}
    </span>
  );
}
