'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product, Ingredient, Recipe, CATEGORY_LABELS, ProductCategory } from '@/types'

const PIZZA_CATEGORIES: ProductCategory[] = ['pizza_40', 'pizza_specialty', 'pizza_premium']

interface ProductWithRecipes extends Product {
  recipes: (Recipe & { ingredient: Ingredient })[]
}

export default function RecipeManager() {
  const [products, setProducts] = useState<ProductWithRecipes[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newRecipe, setNewRecipe] = useState({
    ingredient_id: '',
    quantity_base: '',
    is_extra_eligible: true,
  })
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    const supabase = createClient()
    const { data: productsData } = await supabase
      .from('products')
      .select('*, recipes:recipes(*, ingredient:ingredients(*))')
      .in('category', PIZZA_CATEGORIES)
      .order('category')
      .order('name')

    const { data: ingredientsData } = await supabase
      .from('ingredients')
      .select('*')
      .eq('active', true)
      .order('name')

    setProducts((productsData as ProductWithRecipes[]) ?? [])
    setIngredients(ingredientsData ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleAddRecipe(productId: string) {
    if (!newRecipe.ingredient_id || !newRecipe.quantity_base) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('recipes').upsert({
      product_id: productId,
      ingredient_id: newRecipe.ingredient_id,
      quantity_base: parseFloat(newRecipe.quantity_base),
      is_extra_eligible: newRecipe.is_extra_eligible,
    })
    setNewRecipe({ ingredient_id: '', quantity_base: '', is_extra_eligible: true })
    setAddingTo(null)
    fetchData()
    setSaving(false)
  }

  async function handleDeleteRecipe(recipeId: string) {
    const supabase = createClient()
    await supabase.from('recipes').delete().eq('id', recipeId)
    fetchData()
  }

  async function handleToggleExtra(recipeId: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('recipes').update({ is_extra_eligible: !current }).eq('id', recipeId)
    fetchData()
  }

  const grouped = PIZZA_CATEGORIES.reduce((acc, cat) => {
    const items = products.filter((p) => p.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {} as Record<string, ProductWithRecipes[]>)

  const inputStyle = {
    padding: '8px 12px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-1)',
    fontFamily: 'inherit',
    fontSize: 12,
    outline: 'none',
  }

  if (loading) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando recetas...</div>

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            marginBottom: 10,
          }}>
            {CATEGORY_LABELS[category as ProductCategory]}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((product) => (
              <div key={product.id} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setExpanded(expanded === product.id ? null : product.id)}
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
                      {product.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {product.recipes?.length ?? 0} ingrediente{product.recipes?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                    {expanded === product.id ? '▲' : '▼'}
                  </span>
                </button>

                {expanded === product.id && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {product.recipes?.length === 0 && (
                      <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-3)' }}>
                        Sin ingredientes. Agrega la receta.
                      </div>
                    )}

                    {product.recipes?.map((recipe, index) => (
                      <div
                        key={recipe.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          borderBottom: index < product.recipes.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 13, color: 'var(--text-1)' }}>
                            {recipe.ingredient?.name}
                          </span>
                          <span style={{
                            fontSize: 12,
                            color: 'var(--text-3)',
                            fontFamily: "'JetBrains Mono', monospace",
                            marginLeft: 8,
                          }}>
                            {recipe.quantity_base} {recipe.ingredient?.unit}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => handleToggleExtra(recipe.id, recipe.is_extra_eligible)}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid',
                              borderColor: recipe.is_extra_eligible ? 'var(--primary)' : 'var(--border)',
                              background: recipe.is_extra_eligible ? 'var(--primary-bg)' : 'transparent',
                              color: recipe.is_extra_eligible ? 'var(--primary)' : 'var(--text-3)',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {recipe.is_extra_eligible ? 'Extra ✓' : 'Sin extra'}
                          </button>
                          <button
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            style={{
                              fontSize: 12,
                              color: 'var(--danger)',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))}

                    {addingTo === product.id ? (
                      <div style={{
                        padding: '12px 16px',
                        background: 'var(--primary-bg)',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
                          <select
                            value={newRecipe.ingredient_id}
                            onChange={(e) => setNewRecipe({ ...newRecipe, ingredient_id: e.target.value })}
                            style={{ ...inputStyle, width: '100%' }}
                          >
                            <option value="">Seleccionar ingrediente</option>
                            {ingredients
                              .filter((ing) => !product.recipes?.find((r) => r.ingredient_id === ing.id))
                              .map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name} ({ing.unit})
                                </option>
                              ))}
                          </select>
                          <input
                            type="number"
                            value={newRecipe.quantity_base}
                            onChange={(e) => setNewRecipe({ ...newRecipe, quantity_base: e.target.value })}
                            placeholder="Cantidad"
                            step="0.01"
                            style={{ ...inputStyle, width: '100%' }}
                          />
                        </div>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          color: 'var(--text-2)',
                          cursor: 'pointer',
                        }}>
                          <input
                            type="checkbox"
                            checked={newRecipe.is_extra_eligible}
                            onChange={(e) => setNewRecipe({ ...newRecipe, is_extra_eligible: e.target.checked })}
                          />
                          Disponible como extra
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleAddRecipe(product.id)}
                            disabled={saving}
                            style={{
                              flex: 1,
                              padding: '8px',
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
                            {saving ? '...' : 'Agregar'}
                          </button>
                          <button
                            onClick={() => setAddingTo(null)}
                            style={{
                              padding: '8px 12px',
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              borderRadius: 7,
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
                    ) : (
                      <button
                        onClick={() => setAddingTo(product.id)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderTop: '1px solid var(--border)',
                          color: 'var(--primary)',
                          fontFamily: 'inherit',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left' as const,
                        }}
                      >
                        + Agregar ingrediente
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}