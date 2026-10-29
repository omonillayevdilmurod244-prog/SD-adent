import React from 'react'
import { NavLink } from 'react-router-dom'
import { FiHome, FiMapPin, FiShoppingCart, FiFileText, FiPackage, FiBarChart2, FiSettings } from 'react-icons/fi'

const NAV_ITEMS = [
  { to: '/', icon: <FiHome />, label: 'Bosh' },
  { to: '/outlets', icon: <FiMapPin />, label: "Do'konlar" },
  { to: '/order-create', icon: <FiShoppingCart />, label: 'Buyurtma' },
  { to: '/orders', icon: <FiFileText />, label: 'Tarix' },
  { to: '/payments', icon: <FiBarChart2 />, label: "To'lov" },
  { to: '/warehouse', icon: <FiPackage />, label: 'Ombor' },
  { to: '/settings', icon: <FiSettings />, label: 'Sozlama' },
]

export default function BottomNav() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '64px',
      background: 'rgba(11,17,32,0.97)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 99,
      padding: '0 4px',
    }}>
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            padding: '6px 8px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '10px',
            fontWeight: 600,
            color: isActive ? '#60a5fa' : 'var(--text-muted)',
            background: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
            transition: 'color 0.2s, background 0.2s',
            minWidth: '44px',
          })}
        >
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
