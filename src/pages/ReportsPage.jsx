import React, { useState } from 'react'
import { FiBarChart2, FiTrendingUp, FiPackage, FiDollarSign, FiCalendar } from 'react-icons/fi'
import { formatSum } from '../services/api'

export default function ReportsPage({ agent, currentUser, orders, payments, products }) {
  const [period, setPeriod] = useState('month') // 'today' | 'week' | 'month' | 'all'

  const now = new Date()
  const filterDate = (dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (period === 'today') {
      return d.toDateString() === now.toDateString()
    }
    if (period === 'week') {
      const weekAgo = new Date(now - 7 * 24 * 3600 * 1000)
      return d >= weekAgo
    }
    if (period === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }
    return true
  }

  const filteredOrders = (orders || []).filter(o => filterDate(o.date || o.createdAt))
  const filteredPayments = (payments || []).filter(p => filterDate(p.date || p.createdAt))

  const totalSales = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalPayments = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const orderCount = filteredOrders.length
  const paymentCount = filteredPayments.length

  // Top products
  const productSales = {}
  filteredOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const key = item.productName || item.name || item.productId
      if (!productSales[key]) productSales[key] = { name: key, qty: 0, total: 0 }
      productSales[key].qty += item.quantity || 0
      productSales[key].total += (item.price || 0) * (item.quantity || 0)
    })
  })
  const topProducts = Object.values(productSales).sort((a, b) => b.total - a.total).slice(0, 5)

  const kpi = agent?.kpi || {}

  const PERIODS = [
    { id: 'today', label: 'Bugun' },
    { id: 'week', label: 'Hafta' },
    { id: 'month', label: 'Oy' },
    { id: 'all', label: 'Hammasi' },
  ]

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '20px', paddingBottom: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiBarChart2 style={{ color: '#8b5cf6' }} /> Hisobotlar
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Savdo va to'lovlar tahlili
        </p>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button
            key={p.id}
            className={`btn btn-sm ${period === p.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="stat-card" style={{ borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <FiTrendingUp style={{ color: '#10b981' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SAVDO</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>{formatSum(totalSales)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{orderCount} ta buyurtma</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #2563eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <FiDollarSign style={{ color: '#60a5fa' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TO'LOV</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#60a5fa' }}>{formatSum(totalPayments)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{paymentCount} ta to'lov</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <FiCalendar style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PLAN</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#f59e0b' }}>{formatSum(kpi.monthTarget || 0)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Oylik maqsad</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <FiPackage style={{ color: '#a78bfa' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>MAHSULOT</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#a78bfa' }}>{products?.length || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Turlar</div>
        </div>
      </div>

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
            🏆 Eng Ko'p Sotilgan Mahsulotlar
          </h2>
          {topProducts.map((p, i) => {
            const percent = topProducts[0].total > 0 ? Math.round((p.total / topProducts[0].total) * 100) : 0
            return (
              <div key={p.name} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][i] + '33',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 800, color: '#fff',
                    }}>{i + 1}</span>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>{p.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#10b981', fontSize: '13px' }}>{formatSum(p.total)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.qty} dona</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px' }}>
                  <div style={{
                    width: `${percent}%`, height: '100%',
                    background: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][i],
                    borderRadius: '4px', transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Orders list */}
      <div className="card">
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
          📋 Buyurtmalar ({filteredOrders.length})
        </h2>
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
            Bu davrda buyurtmalar yo'q
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Do'kon</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Sana</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Summa</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 20).map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>{order.outletName || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {order.date ? new Date(order.date).toLocaleDateString('uz-UZ') : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                      {formatSum(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
