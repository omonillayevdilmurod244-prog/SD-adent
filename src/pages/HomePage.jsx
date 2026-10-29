import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiMapPin, FiTrendingUp, FiDollarSign, FiPackage, FiCalendar, FiActivity } from 'react-icons/fi'
import { formatSum } from '../services/api'

export default function HomePage({ agent, currentUser, outlets, orders }) {
  const navigate = useNavigate()

  const kpi = agent?.kpi || {}
  const todaySales = kpi.todaySales ?? 0
  const monthSales = kpi.monthSales ?? 0
  const monthTarget = kpi.monthTarget ?? 0
  const visitedToday = kpi.visitedToday ?? 0
  const totalOutlets = outlets?.length ?? 0
  const pendingOrders = orders?.filter(o => o.status === 'pending')?.length ?? 0
  const progress = monthTarget > 0 ? Math.min(100, Math.round((monthSales / monthTarget) * 100)) : 0

  const quickActions = [
    { icon: <FiShoppingCart />, label: 'Buyurtma Berish', color: '#2563eb', to: '/order-create' },
    { icon: <FiMapPin />, label: "Do'konlarga Borish", color: '#06b6d4', to: '/outlets' },
    { icon: <FiDollarSign />, label: "To'lov Qabul Qilish", color: '#10b981', to: '/payments' },
    { icon: <FiPackage />, label: 'Omborni Tekshirish', color: '#f59e0b', to: '/warehouse' },
  ]

  const recentOrders = (orders || []).slice(0, 5)

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '20px', paddingBottom: '24px' }}>
      {/* Welcome */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>
          Xush kelibsiz, {agent?.name || currentUser?.name || 'Agent'}! 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          {agent?.company || currentUser?.company || 'SD Agent'} · Bugungi ish kuni
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="stat-card" style={{ borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FiActivity style={{ color: '#10b981', fontSize: '18px' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>BUGUNGI SAVDO</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981' }}>{formatSum(todaySales)}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #2563eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FiTrendingUp style={{ color: '#60a5fa', fontSize: '18px' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>OYLIK SAVDO</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#60a5fa' }}>{formatSum(monthSales)}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #06b6d4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FiMapPin style={{ color: '#06b6d4', fontSize: '18px' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>TASHRIF</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#06b6d4' }}>{visitedToday} / {totalOutlets}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FiShoppingCart style={{ color: '#f59e0b', fontSize: '18px' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>BUYURTMALAR</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#f59e0b' }}>{pendingOrders}</div>
        </div>
      </div>

      {/* Monthly Progress */}
      {monthTarget > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Oylik Reja Bajarilishi</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Maqsad: {formatSum(monthTarget)}</div>
            </div>
            <div style={{
              fontSize: '24px', fontWeight: 900,
              color: progress >= 100 ? '#10b981' : progress >= 60 ? '#f59e0b' : '#ef4444',
            }}>
              {progress}%
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: progress >= 100 ? '#10b981' : progress >= 60 ? '#f59e0b' : '#2563eb',
              borderRadius: '8px',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>⚡ Tezkor Amallar</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {quickActions.map(a => (
            <button
              key={a.to}
              className="btn btn-secondary"
              style={{ flexDirection: 'column', gap: '8px', padding: '16px', height: 'auto' }}
              onClick={() => navigate(a.to)}
            >
              <span style={{ fontSize: '24px', color: a.color }}>{a.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>📋 So'nggi Buyurtmalar</h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/orders')}
            >
              Barchasi →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentOrders.map(order => (
              <div
                key={order.id}
                className="card"
                style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>
                    {order.outletName || 'Noma\'lum do\'kon'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {order.id} · {order.itemCount || 0} ta mahsulot
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '13px' }}>
                    {formatSum(order.total)}
                  </div>
                  <span className={`badge ${order.status === 'completed' ? 'badge-success' : order.status === 'pending' ? 'badge-warning' : 'badge-primary'}`}
                    style={{ fontSize: '10px', marginTop: '4px' }}>
                    {order.status === 'completed' ? 'Bajarildi' : order.status === 'pending' ? 'Kutmoqda' : order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentOrders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
          <div style={{ fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Hali buyurtma yo'q</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
            Birinchi buyurtmangizni yarating!
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/order-create')}>
            <FiShoppingCart /> Buyurtma Berish
          </button>
        </div>
      )}
    </div>
  )
}
