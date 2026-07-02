'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Ingredient } from '@/types'

interface IngredientWithLevel {
  ingredient: Ingredient
  estimated: number
  pct: number
}

export default function InventoryAlerts() {
  const [items, setItems] = useState<IngredientWithLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchInventory() }, [])

  async function fetchInventory() {
    const supabase = createClient()
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('*')
      .eq('active', true)
      .order('name')

    if (!ingredients) { setLoading(false); return }

    const withLevels: IngredientWithLevel[] = []

    for (const ingredient of ingredients) {
      const { data: logs } = await supabase
        .from('inventory_log')
        .select('quantity, type, created_at')
        .eq('ingredient_id', ingredient.id)
        .order('created_at', { ascending: false })
        .limit(100)

      let estimated = 0
      if (logs && logs.length > 0) {
        const lastPhysicalIndex = logs.findIndex((l) => l.type === 'physical_count')
        if (lastPhysicalIndex !== -1) {
          const lastPhysical = logs[lastPhysicalIndex]
          const afterLogs = logs.slice(0, lastPhysicalIndex)
          const consumption = afterLogs
            .filter((l) => l.type === 'consumption_estimated')
            .reduce((acc, l) => acc + l.quantity, 0)
          const restock = afterLogs
            .filter((l) => l.type === 'restock')
            .reduce((acc, l) => acc + l.quantity, 0)
          estimated = Math.max(0, lastPhysical.quantity - consumption + restock)
        }
      }

      const pct = ingredient.optimal_weekly > 0
        ? Math.min(100, (estimated / ingredient.optimal_weekly) * 100)
        : 0

      withLevels.push({ ingredient, estimated, pct })
    }

    setItems(withLevels.sort((a, b) => a.pct - b.pct))
    setLoading(false)
  }

  async function handleRestock(ingredientId: string) {
    const qty = parseFloat(restockQty)
    if (!qty || qty <= 0) return

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('inventory_log').insert({
      ingredient_id: ingredientId,
      registered_by: user!.id,
      quantity: qty,
      type: 'restock',
      notes: 'Recarga manual owner',
    })

    setRestockId(null)
    setRestockQty('')
    setSaving(false)
    fetchInventory()
  }

  function getLevel(pct: number) {
    if (pct > 60) return { label: 'Alto',    color: 'var(--success)', bg: 'var(--success-bg)' }
    if (pct > 30) return { label: 'Medio',   color: 'var(--info)',    bg: 'var(--info-bg)'    }
    if (pct > 10) return { label: 'Bajo',    color: 'var(--warning)', bg: 'var(--warning-bg)' }
    if (pct > 5)  return { label: 'Crítico', color: 'var(--danger)',  bg: 'var(--danger-bg)'  }
    return             { label: 'Agotado',   color: 'var(--danger)',  bg: 'var(--danger-bg)'  }
  }

  const alerts = items.filter((i) => i.pct <= 30)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Inventario</div>
        {alerts.length > 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--danger)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: 20,
            padding: '2px 8px',
          }}>
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(({ ingredient, estimated, pct }) => {
            const level = getLevel(pct)
            const isRestocking = restockId === ingredient.id

            return (
              <div key={ingredient.id}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {ingredient.name}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: level.color,
                      background: level.bg,
                      padding: '1px 6px',
                      borderRadius: 6,
                    }}>
                      {level.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11,
                      color: 'var(--text-3)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {estimated.toFixed(1)}/{ingredient.optimal_weekly} {ingredient.unit}
                    </span>
                    <button
                      onClick={() => {
                        setRestockId(isRestocking ? null : ingredient.id)
                        setRestockQty('')
                      }}
                      style={{
                        fontSize: 11,
                        color: isRestocking ? 'var(--text-3)' : 'var(--primary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        padding: 0,
                      }}
                    >
                      {isRestocking ? 'Cancelar' : '+ Recarga'}
                    </button>
                  </div>
                </div>

                <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, marginBottom: isRestocking ? 8 : 0 }}>
                  <div style={{
                    height: 4,
                    borderRadius: 2,
                    background: level.color,
                    width: `${pct}%`,
                    transition: 'width 0.3s',
                  }} />
                </div>

                {isRestocking && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <input
                      type="number"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      placeholder={`Cantidad en ${ingredient.unit}`}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 7,
                        color: 'var(--text-1)',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleRestock(ingredient.id)}
                      disabled={saving || !restockQty}
                      style={{
                        padding: '7px 12px',
                        background: 'var(--primary)',
                        border: 'none',
                        borderRadius: 7,
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {saving ? '...' : 'Guardar'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}