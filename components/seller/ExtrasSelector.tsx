'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Ingredient, EXTRA_PRICES } from '@/types'
import { OrderExtra } from '@/lib/store/orderStore'

interface Props {
  productId: string
  currentExtras: OrderExtra[]
  onExtrasChange: (extras: OrderExtra[]) => void
}

export default function ExtrasSelector({ productId, currentExtras, onExtrasChange }: Props) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [inventoryPct, setInventoryPct] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchIngredients() {
      const supabase = createClient()

      // Todos los ingredientes activos excepto masa
      const { data } = await supabase
        .from('ingredients')
        .select('*')
        .eq('active', true)
        .neq('name', 'Masa')
        .order('name')

      if (!data) { setLoading(false); return }

      // Calcular % de inventario por ingrediente
      const pct: Record<string, number> = {}
      for (const ingredient of data) {
        const { data: logs } = await supabase
          .from('inventory_log')
          .select('quantity, type, created_at')
          .eq('ingredient_id', ingredient.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!logs || logs.length === 0) { pct[ingredient.id] = 100; continue }

        const lastPhysicalIndex = logs.findIndex((l) => l.type === 'physical_count')
        if (lastPhysicalIndex === -1) { pct[ingredient.id] = 100; continue }

        const lastPhysical = logs[lastPhysicalIndex]
        const afterLogs = logs.slice(0, lastPhysicalIndex)
        const consumption = afterLogs
          .filter((l) => l.type === 'consumption_estimated')
          .reduce((acc, l) => acc + l.quantity, 0)
        const restock = afterLogs
          .filter((l) => l.type === 'restock')
          .reduce((acc, l) => acc + l.quantity, 0)
        const estimated = lastPhysical.quantity - consumption + restock
        pct[ingredient.id] = ingredient.optimal_weekly > 0
          ? Math.max(0, (estimated / ingredient.optimal_weekly) * 100)
          : 100
      }

      setIngredients(data)
      setInventoryPct(pct)
      setLoading(false)
    }
    fetchIngredients()
  }, [])

  function toggleExtra(ingredient: Ingredient) {
    const exists = currentExtras.find((e) => e.ingredient.id === ingredient.id)
    const price = EXTRA_PRICES[ingredient.name] ?? 10

    if (exists) {
      onExtrasChange(currentExtras.filter((e) => e.ingredient.id !== ingredient.id))
    } else {
      onExtrasChange([...currentExtras, { ingredient, multiplier: 2, extra_price: price }])
    }
  }

  if (loading) return <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Cargando extras...</div>
  if (ingredients.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
        Extras disponibles
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ingredients.map((ingredient) => {
          const pct = inventoryPct[ingredient.id] ?? 100
          const disabled = pct <= 5
          const isSelected = currentExtras.some((e) => e.ingredient.id === ingredient.id)
          const price = EXTRA_PRICES[ingredient.name] ?? 10

          return (
            <button
              key={ingredient.id}
              onClick={() => !disabled && toggleExtra(ingredient)}
              disabled={disabled}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: disabled
                  ? 'var(--border)'
                  : isSelected
                  ? 'var(--primary)'
                  : 'var(--border)',
                background: disabled
                  ? 'transparent'
                  : isSelected
                  ? 'var(--primary-bg)'
                  : 'transparent',
                color: disabled
                  ? 'var(--text-3)'
                  : isSelected
                  ? 'var(--primary)'
                  : 'var(--text-2)',
                fontFamily: 'inherit',
                fontSize: 12,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {ingredient.name}
              {!disabled && ` +Q${price}`}
              {disabled && ' (agotado)'}
            </button>
          )
        })}
      </div>

      {currentExtras.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--primary)' }}>
          +Q{currentExtras.reduce((acc, e) => acc + e.extra_price, 0).toFixed(2)} en extras
        </div>
      )}
    </div>
  )
}