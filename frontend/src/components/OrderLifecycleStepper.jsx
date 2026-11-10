import React from 'react';

const STAGES = ['New', 'Preparing', 'Ready', 'Served'];

export default function OrderLifecycleStepper({ currentStatus }) {
  const currentIndex = STAGES.indexOf(currentStatus);

  return (
    <div className="stepper-wrap">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {STAGES.map((stage, idx) => {
          const isDone = currentIndex > idx;
          const isCurrent = currentIndex === idx;

          let circleBg = '#e2e8f0';
          let circleColor = '#64748b';
          let borderColor = '#cbd5e1';

          if (isDone) {
            circleBg = '#10b981';
            circleColor = '#ffffff';
            borderColor = '#10b981';
          } else if (isCurrent) {
            circleBg = '#3b82f6';
            circleColor = '#ffffff';
            borderColor = '#2563eb';
          }

          return (
            <div
              key={stage}
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
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: circleBg,
                  color: circleColor,
                  border: `2px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.75rem',
                  boxShadow: isCurrent ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className="stepper-label"
                style={{
                  fontWeight: isCurrent ? '700' : isDone ? '600' : '500',
                  color: isCurrent ? '#1d4ed8' : isDone ? '#0f766e' : '#94a3b8',
                }}
              >
                {stage}
              </span>
            </div>
          );
        })}

        {/* Progress Bar Line */}
        <div
          style={{
            position: 'absolute',
            top: '13px',
            left: '12%',
            right: '12%',
            height: '3px',
            backgroundColor: '#e2e8f0',
            zIndex: 0,
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: '#10b981',
              width: currentIndex <= 0 ? '0%' : `${(currentIndex / (STAGES.length - 1)) * 100}%`,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
