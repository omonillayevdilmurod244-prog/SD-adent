import React from 'react'
import { useApp } from '../context/AppContext'
import { FiX, FiCheck, FiInfo, FiAlertTriangle, FiDollarSign } from 'react-icons/fi'

const ICONS = {
  success: <FiCheck />,
  error: <FiAlertTriangle />,
  info: <FiInfo />,
  cash: <FiDollarSign />,
  warning: <FiAlertTriangle />,
}

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', icon: '#10b981' },
  error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  icon: '#ef4444' },
  info:    { bg: 'rgba(37,99,235,0.15)',  border: 'rgba(37,99,235,0.4)',  icon: '#60a5fa' },
  cash:    { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', icon: '#10b981' },
  warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', icon: '#f59e0b' },
}

export default function ToastContainer() {
  const { toasts, removeToast } = useApp()

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '360px',
      width: 'calc(100vw - 32px)',
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.info
        return (
          <div
            key={t.id}
            className="animate-slide-up"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: '12px',
              padding: '12px 14px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{ color: c.icon, fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>
              {ICONS[t.type] || ICONS.info}
            </span>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#fff', lineHeight: 1.5 }}>
              {t.message}
            </span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                fontSize: '14px',
                flexShrink: 0,
                padding: '0',
                marginTop: '1px',
              }}
            >
              <FiX />
            </button>
          </div>
        )
      })}
    </div>
  )
}
