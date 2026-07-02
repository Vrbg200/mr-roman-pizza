'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Ingredient } from '@/types'

interface IngredientWithEstimate {
  ingredient: Ingredient
  estimated: number
  pct: number
}

export default function InventoryPanel() {
  const [items, setItems] = useState<IngredientWithEstimate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'low' | 'critical'>('all')
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [showNewIngredient, setShowNewIngredient] = useState(false)
  const [newIngredient, setNewIngredient] = useState({ name: '', unit: 'kg', optimal_weekly: '' })
  const [savingNew, setSavingNew] = useState(false)

  const fetchInventory = useCallback(async () => {
    const supabase = createClient()
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('*')
      .eq('active', true)
      .order('name')

    if (!ingredients) { setLoading(false); return }

    const withEstimates: IngredientWithEstimate[] = []

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

      withEstimates.push({ ingredient, estimated, pct })
    }

    setItems(withEstimates.sort((a, b) => a.pct - b.pct))
    setLoading(false)
  }, [])

  useEffect(() => { fetchInventory() }, [fetchInventory])

async function handleRestock(ingredientId: string) {
  const qty = parseFloat(restockQty)
  console.log('handleRestock called', { ingredientId, qty, restockQty })
  if (!qty || qty <= 0) return
  setSaving(true)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('user:', user?.id)
  const { error } = await supabase.from('inventory_log').insert({
    ingredient_id: ingredientId,
    registered_by: user!.id,
    quantity: qty,
    type: 'restock',
    notes: 'Recarga manual owner',
  })
  console.log('insert error:', error)
  setRestockId(null)
  setRestockQty('')
  setSaving(false)
  fetchInventory()
}

  async function handleAddIngredient() {
    if (!newIngredient.name || !newIngredient.optimal_weekly) return
    setSavingNew(true)
    const supabase = createClient()
    const { error } = await supabase.from('ingredients').insert({
      name: newIngredient.name.trim(),
      unit: newIngredient.unit,
      optimal_weekly: parseFloat(newIngredient.optimal_weekly),
      alert_low_pct: 30,
      alert_critical_pct: 10,
      active: true,
    })
    if (!error) {
      setNewIngredient({ name: '', unit: 'kg', optimal_weekly: '' })
      setShowNewIngredient(false)
      fetchInventory()
    }
    setSavingNew(false)
  }

  function getLevel(pct: number) {
    if (pct > 60) return { label: 'Alto',    color: 'var(--success)', bg: 'var(--success-bg)' }
    if (pct > 30) return { label: 'Medio',   color: 'var(--info)',    bg: 'var(--info-bg)'    }
    if (pct > 10) return { label: 'Bajo',    color: 'var(--warning)', bg: 'var(--warning-bg)' }
    if (pct > 5)  return { label: 'Crítico', color: 'var(--danger)',  bg: 'var(--danger-bg)'  }
    return             { label: 'Agotado',   color: 'var(--danger)',  bg: 'var(--danger-bg)'  }
  }

  const filtered = items.filter(({ pct }) => {
    if (filter === 'low') return pct <= 30
    if (filter === 'critical') return pct <= 10
    return true
  })

  const alertCount = items.filter(({ pct }) => pct <= 30).length

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

      {/* Filtros y alertas */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all',      label: 'Todos'   },
            { key: 'low',      label: 'Bajo'    },
            { key: 'critical', label: 'Crítico' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as 'all' | 'low' | 'critical')}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: filter === f.key ? 'var(--primary)' : 'var(--border)',
                background: filter === f.key ? 'var(--primary)' : 'transparent',
                color: filter === f.key ? '#fff' : 'var(--text-2)',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {alertCount > 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--danger)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: 20,
            padding: '2px 10px',
          }}>
            {alertCount} alerta{alertCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Botón agregar ingrediente */}
      <button
        onClick={() => setShowNewIngredient(!showNewIngredient)}
        style={{
          width: '100%',
          padding: '11px',
          background: 'transparent',
          border: '2px dashed var(--border)',
          borderRadius: 10,
          color: 'var(--primary)',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        + Agregar ingrediente
      </button>

      {/* Formulario nuevo ingrediente */}
      {showNewIngredient && (
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
            Nuevo ingrediente
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
                Nombre
              </label>
              <input
                type="text"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                placeholder="ej. Queso Mozzarella"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
                Unidad
              </label>
              <select
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                style={{ ...inputStyle }}
              >
                <option value="kg">kg</option>
                <option value="litros">litros</option>
                <option value="unidades">unidades</option>
                <option value="gramos">gramos</option>
                <option value="ml">ml</option>
                <option value="onzas">onzas</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
                Óptimo semanal
              </label>
              <input
                type="number"
                value={newIngredient.optimal_weekly}
                onChange={(e) => setNewIngredient({ ...newIngredient, optimal_weekly: e.target.value })}
                placeholder="ej. 40"
                min="0"
                step="0.1"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAddIngredient}
              disabled={savingNew}
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
              {savingNew ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setShowNewIngredient(false)}
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

      {/* Lista de ingredientes */}
      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando inventario...</div>
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {filtered.map(({ ingredient, estimated, pct }, index) => {
            const level = getLevel(pct)
            const isRestocking = restockId === ingredient.id

            return (
              <div
                key={ingredient.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: index < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                      {ingredient.name}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: level.color,
                      background: level.bg,
                      padding: '1px 7px',
                      borderRadius: 6,
                    }}>
                      {level.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontSize: 12,
                      color: 'var(--text-3)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {estimated.toFixed(1)} / {ingredient.optimal_weekly} {ingredient.unit}
                    </span>
                    <button
                      onClick={() => {
                        setRestockId(isRestocking ? null : ingredient.id)
                        setRestockQty('')
                      }}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
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

                <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3 }}>
                  <div style={{
                    height: 5,
                    borderRadius: 3,
                    background: level.color,
                    width: `${pct}%`,
                    transition: 'width 0.3s',
                  }} />
                </div>

                {pct <= 30 && !isRestocking && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    Sugerido reponer: {(ingredient.optimal_weekly - estimated).toFixed(1)} {ingredient.unit}
                  </div>
                )}

                {isRestocking && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                      type="number"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      placeholder={`Cantidad en ${ingredient.unit}`}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleRestock(ingredient.id)}
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
                        padding: '7px 14px',
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