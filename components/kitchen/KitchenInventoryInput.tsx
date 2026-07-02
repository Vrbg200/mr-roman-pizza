'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Ingredient } from '@/types'

interface Entry {
  ingredient: Ingredient
  quantity: string
}

export default function KitchenInventoryInput() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetchIngredients() {
      const supabase = createClient()
      const { data } = await supabase
        .from('ingredients')
        .select('*')
        .eq('active', true)
        .order('name')
      setEntries((data ?? []).map((ing) => ({ ingredient: ing, quantity: '' })))
      setLoading(false)
    }
    fetchIngredients()
  }, [])

  function updateQuantity(id: string, value: string) {
    setEntries((prev) => prev.map((e) => e.ingredient.id === id ? { ...e, quantity: value } : e))
  }

  async function handleSave() {
    const filled = entries.filter((e) => e.quantity !== '' && !isNaN(parseFloat(e.quantity)))
    if (filled.length === 0) return

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    for (const entry of filled) {
      await supabase.from('inventory_log').insert({
        ingredient_id: entry.ingredient.id,
        registered_by: user!.id,
        quantity: parseFloat(entry.quantity),
        type: 'physical_count',
        notes: 'Conteo físico cocina',
        log_date: new Date().toISOString().split('T')[0],
      })
    }

    setEntries((prev) => prev.map((e) => ({ ...e, quantity: '' })))
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 560 }}>
      {saved && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success)',
          borderRadius: 10,
          padding: '10px 16px',
          fontSize: 13,
          color: 'var(--success)',
          fontWeight: 600,
          marginBottom: 16,
        }}>
          ✓ Inventario registrado correctamente
        </div>
      )}

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        {entries.map((entry, index) => (
          <div key={entry.ingredient.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderBottom: index < entries.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                {entry.ingredient.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                Óptimo: {entry.ingredient.optimal_weekly} {entry.ingredient.unit}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                value={entry.quantity}
                onChange={(e) => updateQuantity(entry.ingredient.id, e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
                style={{
                  width: 80,
                  padding: '7px 10px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-1)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  outline: 'none',
                  textAlign: 'right' as const,
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-3)', width: 32 }}>
                {entry.ingredient.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          padding: '13px',
          background: 'var(--primary)',
          border: 'none',
          borderRadius: 9,
          color: '#fff',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {saving ? 'Guardando...' : 'Registrar inventario'}
      </button>

      <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' as const, marginTop: 8 }}>
        Solo completa los ingredientes que puedas contar. Los vacíos se omiten.
      </div>
    </div>
  )
}