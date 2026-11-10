import React from 'react';

export default function ConflictBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '8px',
        color: '#92400e',
        marginBottom: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
        <div>
          <strong>Concurrency Notice:</strong>
          <div style={{ fontSize: '0.88rem', marginTop: '2px' }}>{message}</div>
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '1.1rem',
            cursor: 'pointer',
            color: '#b45309',
            padding: '4px 8px',
            lineHeight: 1,
          }}
          title="Dismiss notification"
        >
          ✕
        </button>
      )}
    </div>
  );
}
