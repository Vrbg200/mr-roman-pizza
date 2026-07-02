'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Ingredient } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface WasteItem {
  ingredient: Ingredient
  estimated: number
  physical: number
  waste: number
  waste_pct: number
  physical_date: string
}

export default function WasteReport() {
  const [items, setItems] = useState<WasteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [avgWaste, setAvgWaste] = useState(0)

  useEffect(() => { fetchWaste() }, [])

  async function fetchWaste() {
    const supabase = createClient()
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('*')
      .eq('active', true)
      .order('name')

    if (!ingredients) { setLoading(false); return }

    const wasteItems: WasteItem[] = []

    for (const ingredient of ingredients) {
      const { data: logs } = await supabase
        .from('inventory_log')
        .select('quantity, type, created_at')
        .eq('ingredient_id', ingredient.id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!logs || logs.length < 2) continue

      const physicalLogs = logs.filter((l) => l.type === 'physical_count')
      if (physicalLogs.length < 2) continue

      const lastPhysical = physicalLogs[0]
      const prevPhysical = physicalLogs[1]
      const lastPhysicalIndex = logs.indexOf(lastPhysical)
      const prevPhysicalIndex = logs.indexOf(prevPhysical)

      const betweenLogs = logs.slice(lastPhysicalIndex + 1, prevPhysicalIndex)
      const consumptionBetween = betweenLogs.filter((l) => l.type === 'consumption_estimated').reduce((acc, l) => acc + l.quantity, 0)
      const restockBetween = betweenLogs.filter((l) => l.type === 'restock').reduce((acc, l) => acc + l.quantity, 0)

      const estimatedAtLast = prevPhysical.quantity - consumptionBetween + restockBetween
      const waste = Math.max(0, estimatedAtLast - lastPhysical.quantity)
      const waste_pct = estimatedAtLast > 0 ? (waste / estimatedAtLast) * 100 : 0

      if (waste > 0) {
        wasteItems.push({
          ingredient,
          estimated: estimatedAtLast,
          physical: lastPhysical.quantity,
          waste,
          waste_pct,
          physical_date: lastPhysical.created_at,
        })
      }
    }

    wasteItems.sort((a, b) => b.waste_pct - a.waste_pct)
    const avg = wasteItems.length > 0
      ? wasteItems.reduce((acc, i) => acc + i.waste_pct, 0) / wasteItems.length
      : 0

    setItems(wasteItems)
    setAvgWaste(avg)
    setLoading(false)
  }

  function wasteColor(pct: number) {
    if (pct > 15) return 'var(--danger)'
    if (pct > 8)  return 'var(--warning)'
    return 'var(--primary)'
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
        Reporte de merma
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
        Diferencia entre inventario estimado y conteo físico
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Calculando...</div>
      ) : items.length === 0 ? (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 24,
          textAlign: 'center' as const,
          fontSize: 13,
          color: 'var(--text-3)',
        }}>
          Sin datos de merma. Se necesitan al menos 2 conteos físicos por ingrediente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            background: avgWaste > 15 ? 'var(--danger-bg)' : avgWaste > 8 ? 'var(--warning-bg)' : 'var(--success-bg)',
            border: `1px solid ${avgWaste > 15 ? 'var(--danger)' : avgWaste > 8 ? 'var(--warning)' : 'var(--success)'}`,
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Merma promedio</span>
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              color: wasteColor(avgWaste),
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {avgWaste.toFixed(1)}%
            </span>
          </div>

          {items.map((item) => (
            <div key={item.ingredient.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                    {item.ingredient.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    Conteo: {format(new Date(item.physical_date), "dd 'de' MMM", { locale: es })}
                  </div>
                </div>
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: wasteColor(item.waste_pct),
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {item.waste_pct.toFixed(1)}%
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'Estimado', value: `${item.estimated.toFixed(2)} ${item.ingredient.unit}` },
                  { label: 'Real',     value: `${item.physical.toFixed(2)} ${item.ingredient.unit}` },
                  { label: 'Merma',    value: `${item.waste.toFixed(2)} ${item.ingredient.unit}`, highlight: true },
                ].map((s) => (
                  <div key={s.label} style={{
                    background: s.highlight ? 'var(--danger-bg)' : 'var(--surface-2)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    textAlign: 'center' as const,
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>{s.label}</div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: s.highlight ? 'var(--danger)' : 'var(--text-1)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2 }}>
                <div style={{
                  height: 4,
                  borderRadius: 2,
                  background: wasteColor(item.waste_pct),
                  width: `${Math.min(100, item.waste_pct)}%`,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}