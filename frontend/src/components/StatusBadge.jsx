import React from 'react';

const STATUS_CONFIG = {
  New: {
    label: 'New',
    bgColor: '#dbeafe',
    color: '#1e40af',
    borderColor: '#93c5fd',
    icon: '●',
  },
  Preparing: {
    label: 'Preparing',
    bgColor: '#fef3c7',
    color: '#92400e',
    borderColor: '#fcd34d',
    icon: '⏳',
  },
  Ready: {
    label: 'Ready',
    bgColor: '#d1fae5',
    color: '#065f46',
    borderColor: '#6ee7b7',
    icon: '✓',
  },
  Served: {
    label: 'Served',
    bgColor: '#f1f5f9',
    color: '#475569',
    borderColor: '#cbd5e1',
    icon: '🍽',
  },
};

export default function StatusBadge({ status, size = 'medium' }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bgColor: '#f3f4f6',
    color: '#374151',
    borderColor: '#d1d5db',
    icon: '•',
  };

  const isLarge = size === 'large';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isLarge ? '6px' : '4px',
        padding: isLarge ? '6px 14px' : '3px 10px',
        borderRadius: '9999px',
        fontSize: isLarge ? '0.95rem' : '0.8rem',
        fontWeight: '600',
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        letterSpacing: '0.01em',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <span style={{ fontSize: isLarge ? '1rem' : '0.85rem' }}>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
