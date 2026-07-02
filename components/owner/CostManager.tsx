'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product, Ingredient, ProductCategory, CATEGORY_LABELS } from '@/types'

const PIZZA_CATEGORIES: ProductCategory[] = ['pizza_40', 'pizza_specialty', 'pizza_premium']

interface IngredientWithCost extends Ingredient {
  latest_cost_per_unit: number | null
}

interface PizzaCost {
  product: Product
  cost: number
  margin: number
  margin_pct: number
  breakdown: { ingredient: string; qty: number; unit: string; cost: number }[]
}

export default function CostManager() {
  const [tab, setTab] = useState<'costs' | 'ingredients'>('costs')
  const [pizzaCosts, setPizzaCosts] = useState<PizzaCost[]>([])
  const [ingredients, setIngredients] = useState<IngredientWithCost[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Para registrar costo de ingrediente
  const [addingCost, setAddingCost] = useState<string | null>(null)
  const [costForm, setCostForm] = useState({ quantity: '', total_cost: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()

    // Ingredientes con último costo
    const { data: ings } = await supabase
      .from('ingredients')
      .select('*')
      .eq('active', true)
      .order('name')

    if (!ings) { setLoading(false); return }

    const ingsWithCost: IngredientWithCost[] = []
    for (const ing of ings) {
      const { data: cost } = await supabase
        .from('ingredient_costs')
        .select('cost_per_unit')
        .eq('ingredient_id', ing.id)
        .order('purchase_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      ingsWithCost.push({
        ...ing,
        latest_cost_per_unit: cost?.cost_per_unit ?? null,
      })
    }

    setIngredients(ingsWithCost)

    // Pizzas con recetas
    const { data: products } = await supabase
      .from('products')
      .select('*, recipes:recipes(quantity_base, ingredient:ingredients(name, unit))')
      .in('category', PIZZA_CATEGORIES)
      .eq('available', true)
      .order('category')
      .order('name')

    if (!products) { setLoading(false); return }

    const costs: PizzaCost[] = []
    for (const product of products) {
      let totalCost = 0
      const breakdown: PizzaCost['breakdown'] = []

      for (const recipe of (product.recipes as any[]) ?? []) {
        const ing = ingsWithCost.find((i) => i.name === recipe.ingredient?.name)
        const costPerUnit = ing?.latest_cost_per_unit ?? 0
        const lineCost = recipe.quantity_base * costPerUnit
        totalCost += lineCost

        breakdown.push({
          ingredient: recipe.ingredient?.name ?? '—',
          qty: recipe.quantity_base,
          unit: recipe.ingredient?.unit ?? '',
          cost: lineCost,
        })
      }

      const margin = product.price - totalCost
      const margin_pct = product.price > 0 ? (margin / product.price) * 100 : 0

      costs.push({
        product,
        cost: totalCost,
        margin,
        margin_pct,
        breakdown,
      })
    }

    setPizzaCosts(costs)
    setLoading(false)
  }

  async function handleSaveCost(ingredientId: string) {
    if (!costForm.quantity || !costForm.total_cost) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('ingredient_costs').insert({
      ingredient_id: ingredientId,
      registered_by: user!.id,
      quantity_purchased: parseFloat(costForm.quantity),
      total_cost: parseFloat(costForm.total_cost),
      purchase_date: new Date().toISOString().split('T')[0],
    })

    setCostForm({ quantity: '', total_cost: '' })
    setAddingCost(null)
    setSaving(false)
    fetchData()
  }

  function marginColor(pct: number) {
    if (pct >= 60) return 'var(--success)'
    if (pct >= 40) return 'var(--warning)'
    return 'var(--danger)'
  }

  const inputStyle = {
    flex: 1,
    padding: '8px 12px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-1)',
    fontFamily: 'inherit',
    fontSize: 12,
    outline: 'none',
  }

  if (loading) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando costos...</div>

  return (
    <div style={{ maxWidth: 720 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          { key: 'costs', label: 'Ganancia por pizza' },
          { key: 'ingredients', label: 'Costos de ingredientes' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'costs' | 'ingredients')}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: tab === t.key ? 'var(--primary)' : 'var(--border)',
              background: tab === t.key ? 'var(--primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-2)',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: costos por pizza */}
      {tab === 'costs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pizzaCosts.length === 0 && (
            <div style={{
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              borderRadius: 10,
              padding: 16,
              fontSize: 13,
              color: 'var(--warning)',
            }}>
              Registra los costos de ingredientes primero para ver la ganancia por pizza.
            </div>
          )}
          {pizzaCosts.map((item) => (
            <div key={item.product.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setExpanded(expanded === item.product.id ? null : item.product.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left' as const,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                    {item.product.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {CATEGORY_LABELS[item.product.category]}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Precio</div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--accent)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      Q{item.product.price.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Costo</div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-2)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      Q{item.cost.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Margen</div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: marginColor(item.margin_pct),
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {item.margin_pct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </button>

              {expanded === item.product.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>
                    Desglose de costo
                  </div>
                  {item.breakdown.map((b, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: 'var(--text-2)',
                      marginBottom: 4,
                    }}>
                      <span>{b.ingredient}</span>
                      <span style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {b.qty} {b.unit} · Q{b.cost.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    fontWeight: 600,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                  }}>
                    <span style={{ color: 'var(--text-1)' }}>Ganancia neta</span>
                    <span style={{
                      color: marginColor(item.margin_pct),
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      Q{item.margin.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: costos de ingredientes */}
      {tab === 'ingredients' && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {ingredients.map((ing, index) => (
            <div key={ing.id}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: addingCost === ing.id || index < ingredients.length - 1
                  ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                    {ing.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {ing.latest_cost_per_unit !== null
                      ? `Q${ing.latest_cost_per_unit.toFixed(4)} por ${ing.unit}`
                      : 'Sin costo registrado'}
                  </div>
                </div>
                <button
                  onClick={() => setAddingCost(addingCost === ing.id ? null : ing.id)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  + Registrar compra
                </button>
              </div>

              {addingCost === ing.id && (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--primary-bg)',
                  borderBottom: index < ingredients.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    Registrar compra de {ing.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                        Cantidad ({ing.unit})
                      </div>
                      <input
                        type="number"
                        value={costForm.quantity}
                        onChange={(e) => setCostForm({ ...costForm, quantity: e.target.value })}
                        placeholder={`ej. 10`}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                        Costo total (Q)
                      </div>
                      <input
                        type="number"
                        value={costForm.total_cost}
                        onChange={(e) => setCostForm({ ...costForm, total_cost: e.target.value })}
                        placeholder="ej. 150"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  {costForm.quantity && costForm.total_cost && (
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      Costo por {ing.unit}:{' '}
                      <strong style={{ color: 'var(--primary)' }}>
                        Q{(parseFloat(costForm.total_cost) / parseFloat(costForm.quantity)).toFixed(4)}
                      </strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSaveCost(ing.id)}
                      disabled={saving}
                      style={{
                        flex: 1,
                        padding: '9px',
                        background: 'var(--primary)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => { setAddingCost(null); setCostForm({ quantity: '', total_cost: '' }) }}
                      style={{
                        padding: '9px 14px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--text-3)',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}