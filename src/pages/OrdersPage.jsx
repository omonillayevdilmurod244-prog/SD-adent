import React, { useState } from 'react'
import { FiFileText, FiSearch, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { formatSum } from '../services/api'

export default function OrdersPage({ orders }) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const filtered = (orders || []).filter(o =>
    o.outletName?.toLowerCase().includes(search.toLowerCase()) ||
    o.id?.toLowerCase().includes(search.toLowerCase())
  )

  const statusMap = {
    completed: { label: 'Bajarildi', cls: 'badge-success' },
    pending: { label: 'Kutmoqda', cls: 'badge-warning' },
    cancelled: { label: 'Bekor', cls: 'badge-danger' },
    processing: { label: 'Jarayonda', cls: 'badge-primary' },
  }

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '20px', paddingBottom: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiFileText style={{ color: '#f59e0b' }} /> Buyurtmalar Tarixi
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Jami {filtered.length} ta buyurtma
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: '40px' }}
          placeholder="Do'kon nomi yoki buyurtma ID bo'yicha qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
          <div style={{ fontWeight: 700, color: '#fff' }}>Buyurtmalar topilmadi</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(order => {
          const st = statusMap[order.status] || { label: order.status, cls: 'badge-warning' }
          const isExpanded = expandedId === order.id
          return (
            <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '15px' }}>
                    {order.outletName || 'Noma\'lum do\'kon'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {order.id} · {order.date ? new Date(order.date).toLocaleDateString('uz-UZ') : '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#10b981', fontSize: '15px' }}>{formatSum(order.total)}</div>
                    <span className={`badge ${st.cls}`} style={{ fontSize: '11px' }}>{st.label}</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </span>
                </div>
              </div>

              {isExpanded && order.items && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'rgba(255,255,255,0.02)' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    MAHSULOTLAR ({order.items.length} ta)
                  </h3>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{item.productName || item.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.quantity} dona × {formatSum(item.price)}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '13px' }}>
                        {formatSum((item.price || 0) * (item.quantity || 0))}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontWeight: 800, fontSize: '15px' }}>
                    <span style={{ color: '#fff' }}>Jami:</span>
                    <span style={{ color: '#10b981' }}>{formatSum(order.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
