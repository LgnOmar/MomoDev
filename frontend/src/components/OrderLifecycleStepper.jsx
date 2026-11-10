import React from 'react';

const STAGES = [
  { key: 'New', label: 'Reçue', icon: '📝' },
  { key: 'Preparing', label: 'En Cuisine', icon: '👨‍🍳' },
  { key: 'Ready', label: 'Prête !', icon: '🔔' },
  { key: 'Served', label: 'Servie', icon: '✨' },
];

export default function OrderLifecycleStepper({ currentStatus }) {
  const stageKeys = STAGES.map((s) => s.key);
  const currentIndex = stageKeys.indexOf(currentStatus);

  return (
    <div className="stepper-wrap">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {STAGES.map((stage, idx) => {
          const isDone = currentIndex > idx;
          const isCurrent = currentIndex === idx;

          let circleBg = '#f1f5f9';
          let circleColor = '#94a3b8';
          let borderColor = '#cbd5e1';

          if (isDone) {
            circleBg = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            circleColor = '#ffffff';
            borderColor = '#10b981';
          } else if (isCurrent) {
            circleBg = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
            circleColor = '#ffffff';
            borderColor = '#2563eb';
          }

          return (
            <div
              key={stage.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: circleBg,
                  color: circleColor,
                  border: `2px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  boxShadow: isCurrent
                    ? '0 0 0 5px rgba(59, 130, 246, 0.25), 0 4px 10px rgba(37, 99, 235, 0.3)'
                    : isDone
                    ? '0 2px 6px rgba(16, 185, 129, 0.25)'
                    : 'none',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {isDone ? '✓' : stage.icon}
              </div>
              <span
                className="stepper-label"
                style={{
                  fontWeight: isCurrent ? '800' : isDone ? '700' : '500',
                  color: isCurrent ? '#1d4ed8' : isDone ? '#065f46' : '#94a3b8',
                }}
              >
                {stage.label}
              </span>
            </div>
          );
        })}

        {/* Progress Bar Line */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '12%',
            right: '12%',
            height: '4px',
            backgroundColor: '#e2e8f0',
            borderRadius: '999px',
            zIndex: 0,
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
              width: currentIndex <= 0 ? '0%' : `${(currentIndex / (STAGES.length - 1)) * 100}%`,
              transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
