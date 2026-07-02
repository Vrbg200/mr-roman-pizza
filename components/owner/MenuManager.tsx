'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product, ProductCategory, CATEGORY_LABELS } from '@/types'

const CATEGORY_ORDER: ProductCategory[] = [
  'pizza_40', 'pizza_specialty', 'pizza_premium',
  'combo_roman', 'combo_brothers',
  'wings_ribs', 'desserts_snacks', 'drinks',
]

export default function MenuManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: 'pizza_40' as ProductCategory,
    price: '',
    available: true,
  })
  const [saving, setSaving] = useState(false)

  async function fetchProducts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('category')
      .order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  async function toggleAvailable(product: Product) {
    const supabase = createClient()
    await supabase
      .from('products')
      .update({ available: !product.available })
      .eq('id', product.id)
    fetchProducts()
  }

  async function handleSave() {
    if (!form.name || !form.price) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('products').insert({
      name: form.name,
      category: form.category,
      price: parseFloat(form.price),
      available: form.available,
      is_combo: form.category.startsWith('combo'),
    })
    setForm({ name: '', category: 'pizza_40', price: '', available: true })
    setShowForm(false)
    fetchProducts()
    setSaving(false)
  }

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = products.filter((p) => p.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {} as Record<string, Product[]>)

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-1)',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          width: '100%',
          padding: '12px',
          background: 'transparent',
          border: '2px dashed var(--border)',
          borderRadius: 10,
          color: 'var(--primary)',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        + Agregar producto
      </button>

      {showForm && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
            Nuevo producto
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
                style={{ ...inputStyle }}
              >
                {CATEGORY_ORDER.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Precio (Q)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                padding: '10px',
                background: 'var(--primary)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-3)',
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando menú...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                marginBottom: 8,
              }}>
                {CATEGORY_LABELS[category as ProductCategory]}
              </div>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
              }}>
                {items.map((product, index) => (
                  <div
                    key={product.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: index < items.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: product.available ? 'var(--text-1)' : 'var(--text-3)',
                        textDecoration: product.available ? 'none' : 'line-through',
                      }}>
                        {product.name}
                      </span>
                      <span style={{
                        fontSize: 13,
                        color: 'var(--accent)',
                        fontFamily: "'JetBrains Mono', monospace",
                        marginLeft: 10,
                      }}>
                        Q{product.price.toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleAvailable(product)}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: product.available ? 'var(--success)' : 'var(--border)',
                        background: product.available ? 'var(--success-bg)' : 'transparent',
                        color: product.available ? 'var(--success)' : 'var(--text-3)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {product.available ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}