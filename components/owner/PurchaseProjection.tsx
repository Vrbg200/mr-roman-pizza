'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Ingredient } from '@/types'
import { subWeeks, startOfWeek, endOfWeek } from 'date-fns'

interface ProjectionItem {
  ingredient: Ingredient
  avg_weekly: number
  estimated: number
  weeks_of_stock: number
  suggested_purchase: number
}

export default function PurchaseProjection() {
  const [items, setItems] = useState<ProjectionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProjection() }, [])

  async function fetchProjection() {
    const supabase = createClient()
    const now = new Date()

    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('*')
      .eq('active', true)
      .order('name')

    if (!ingredients) { setLoading(false); return }

    const projections: ProjectionItem[] = []

    for (const ingredient of ingredients) {
      const weeklyConsumptions: number[] = []

      for (let i = 1; i <= 4; i++) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 })

        const { data: logs } = await supabase
          .from('inventory_log')
          .select('quantity')
          .eq('ingredient_id', ingredient.id)
          .eq('type', 'consumption_estimated')
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', weekEnd.toISOString())

        weeklyConsumptions.push((logs ?? []).reduce((acc, l) => acc + l.quantity, 0))
      }

      const avg_weekly = weeklyConsumptions.reduce((a, b) => a + b, 0) / 4

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
          const consumption = afterLogs.filter((l) => l.type === 'consumption_estimated').reduce((acc, l) => acc + l.quantity, 0)
          const restock = afterLogs.filter((l) => l.type === 'restock').reduce((acc, l) => acc + l.quantity, 0)
          estimated = Math.max(0, lastPhysical.quantity - consumption + restock)
        }
      }

      const weeks_of_stock = avg_weekly > 0 ? estimated / avg_weekly : 99
      const suggested_purchase = Math.max(0, ingredient.optimal_weekly - estimated)

      projections.push({ ingredient, avg_weekly, estimated, weeks_of_stock, suggested_purchase })
    }

    setItems(projections.sort((a, b) => a.weeks_of_stock - b.weeks_of_stock))
    setLoading(false)
  }

  function urgency(weeks: number) {
    if (weeks < 0.5) return { label: 'Urgente',        color: 'var(--danger)',  bg: 'var(--danger-bg)'  }
    if (weeks < 1)   return { label: 'Esta semana',    color: 'var(--warning)', bg: 'var(--warning-bg)' }
    if (weeks < 2)   return { label: 'Próxima semana', color: 'var(--info)',    bg: 'var(--info-bg)'    }
    return                  { label: 'Con stock',      color: 'var(--success)', bg: 'var(--success-bg)' }
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
        Proyección de compras
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
        Basado en el promedio de consumo de las últimas 4 semanas
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Calculando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(({ ingredient, avg_weekly, estimated, weeks_of_stock, suggested_purchase }) => {
            const u = urgency(weeks_of_stock)
            return (
              <div key={ingredient.id} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                      {ingredient.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      Consumo promedio: {avg_weekly.toFixed(2)} {ingredient.unit}/semana
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: u.color,
                    background: u.bg,
                    padding: '3px 8px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                  }}>
                    {u.label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'En stock', value: `${estimated.toFixed(1)} ${ingredient.unit}`, color: 'var(--text-1)' },
                    { label: 'Semanas', value: weeks_of_stock > 99 ? '∞' : weeks_of_stock.toFixed(1), color: weeks_of_stock < 1 ? 'var(--danger)' : 'var(--text-1)' },
                    { label: 'Comprar', value: suggested_purchase > 0 ? `${suggested_purchase.toFixed(1)} ${ingredient.unit}` : '—', color: suggested_purchase > 0 ? 'var(--primary)' : 'var(--success)' },
                  ].map((stat) => (
                    <div key={stat.label} style={{
                      background: 'var(--surface-2)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      textAlign: 'center' as const,
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>{stat.label}</div>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: stat.color,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}