import React, { useState } from 'react'
import { FiPackage, FiSearch, FiAlertTriangle } from 'react-icons/fi'
import { formatSum } from '../services/api'

export default function WarehousePage({ products, categories }) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const filtered = (products || []).filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !selectedCategory || String(p.categoryId) === String(selectedCategory)
    return matchSearch && matchCat
  })

  const lowStock = filtered.filter(p => p.stock !== undefined && p.stock <= 5)
  const totalValue = filtered.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0)

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '20px', paddingBottom: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiPackage style={{ color: '#f59e0b' }} /> Ombor
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          {filtered.length} ta mahsulot · Ombor qiymati: <b style={{ color: '#10b981' }}>{formatSum(totalValue)}</b>
        </p>
      </div>

      {lowStock.length > 0 && (
        <div className="card animate-fade-in" style={{ marginBottom: '16px', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <FiAlertTriangle style={{ color: '#f59e0b', fontSize: '18px' }} />
            <span style={{ fontWeight: 700, color: '#fbbf24' }}>Kam qolgan mahsulotlar ({lowStock.length})</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {lowStock.map(p => (
              <span key={p.id} className="badge badge-warning">
                {p.name}: {p.stock} ta
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
          <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '40px' }}
            placeholder="Mahsulot qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={{ minWidth: '160px' }}
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          <option value="">Barcha kategoriyalar</option>
          {(categories || []).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
          <div style={{ fontWeight: 700, color: '#fff' }}>Mahsulotlar topilmadi</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
        {filtered.map(product => {
          const stockLevel = product.stock === undefined ? null : product.stock <= 0 ? 'out' : product.stock <= 5 ? 'low' : 'ok'
          return (
            <div
              key={product.id}
              className="card"
              style={{
                border: stockLevel === 'out' ? '1px solid rgba(239,68,68,0.4)' :
                        stockLevel === 'low' ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px', lineHeight: 1.3 }}>{product.name}</div>
                  {product.sku && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>SKU: {product.sku}</div>
                  )}
                </div>
                {stockLevel && (
                  <span className={`badge ${stockLevel === 'out' ? 'badge-danger' : stockLevel === 'low' ? 'badge-warning' : 'badge-success'}`}>
                    {stockLevel === 'out' ? 'Tugagan' : stockLevel === 'low' ? 'Kam' : 'Yetarli'}
                  </span>
                )}
              </div>

              {product.category && (
                <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginBottom: '8px', fontWeight: 600 }}>
                  {product.category}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>{formatSum(product.price)}</div>
                  {product.unit && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>1 {product.unit}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: stockLevel === 'out' ? '#ef4444' : stockLevel === 'low' ? '#f59e0b' : '#fff' }}>
                    {product.stock ?? '∞'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>dona qoldi</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
