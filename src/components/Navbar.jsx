import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiRefreshCw, FiLogOut, FiActivity, FiZap } from 'react-icons/fi'
import { formatSum } from '../services/api'

export default function Navbar({ agent, currentUser, onSync, isSyncing, onLogout }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const name = agent?.name || currentUser?.name || 'Agent'
  const avatar = agent?.avatar || currentUser?.avatar || '👨‍💼'
  const kpi = agent?.kpi || {}
  const todaySales = kpi.todaySales ?? 0
  const monthSales = kpi.monthSales ?? 0

  return (
    <nav style={{
      background: 'rgba(11,17,32,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', gap: '12px' }}>
        {/* Logo */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: '#fff',
          }}>
            <FiZap />
          </div>
          <span style={{ fontWeight: 900, fontSize: '16px', color: '#fff' }}>
            SD <span style={{ color: '#38bdf8' }}>Agent</span>
          </span>
        </div>

        {/* KPI quick stats */}
        {agent && (
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)' }}>Bugun</div>
              <div style={{ fontWeight: 700, color: '#10b981' }}>{formatSum(todaySales)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)' }}>Oy</div>
              <div style={{ fontWeight: 700, color: '#38bdf8' }}>{formatSum(monthSales)}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onSync}
            disabled={isSyncing}
            title="Sinxronlash"
          >
            <FiRefreshCw style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {/* Avatar menu */}
          <div style={{ position: 'relative' }}>
            <button
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
              onClick={() => setMenuOpen(v => !v)}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', border: '2px solid rgba(37,99,235,0.5)',
              }}>
                {avatar}
              </div>
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '44px',
                background: '#131c31', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '8px', minWidth: '200px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                zIndex: 200,
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currentUser?.login}</div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                  onClick={() => { setMenuOpen(false); onLogout() }}
                >
                  <FiLogOut /> Chiqish
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
