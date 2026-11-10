import React from 'react';

export default function ConflictBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        backgroundColor: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: '12px',
        color: '#92400e',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.4rem' }}>⚡</span>
        <div>
          <strong style={{ fontSize: '0.92rem', color: '#78350f' }}>Avis de Synchronisation Simultanée (OCC)</strong>
          <div style={{ fontSize: '0.85rem', marginTop: '2px', lineHeight: 1.4 }}>{message}</div>
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'rgba(180, 83, 9, 0.1)',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer',
            color: '#92400e',
            padding: '6px 10px',
            lineHeight: 1,
            fontWeight: 'bold',
          }}
          title="Fermer"
        >
          ✕
        </button>
      )}
    </div>
  );
}
