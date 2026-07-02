'use client'

import { useState, useEffect } from 'react'
import { Product, ProductCategory, CATEGORY_LABELS } from '@/types'
import { useOrderStore, OrderItemDraft, OrderExtra } from '@/lib/store/orderStore'
import { calculateDeliveryFee, meetsZoneMinimum } from '@/lib/utils/delivery'
import { createClient } from '@/lib/supabase/client'
import ExtrasSelector from './ExtrasSelector'

// Qué categorías de pizza permite cada combo
const COMBO_PIZZA_RULES: Record<string, ProductCategory[]> = {
  'Combo Premium':                       ['pizza_premium'],
  'Combo Premium + Especialidad':        ['pizza_premium', 'pizza_specialty'],
  'Combo Premium + 1 Ingrediente':       ['pizza_premium', 'pizza_40'],
  'Combo Super Roman':                   ['pizza_specialty'],
  'Combo Especialidad + 1 Ingrediente':  ['pizza_specialty', 'pizza_40'],
  'Combo Roman':                         ['pizza_40'],
  'Combo Sweet Brother':                 ['pizza_40'],
  'Combo Tasty Brother':                 ['pizza_40'],
  'Combo Tasty Brother Especial':        ['pizza_specialty'],
  'Combo Sweet Brother Especial':        ['pizza_specialty'],
  'Combo Sweet Brother Premium':         ['pizza_premium'],
  'Combo Tasty Brother Premium':         ['pizza_premium'],
}

// Cuántas pizzas incluye cada combo
const COMBO_PIZZA_COUNT: Record<string, number> = {
  'Combo Premium':                       2,
  'Combo Premium + Especialidad':        2,
  'Combo Premium + 1 Ingrediente':       2,
  'Combo Super Roman':                   2,
  'Combo Especialidad + 1 Ingrediente':  2,
  'Combo Roman':                         2,
  'Combo Sweet Brother':                 1,
  'Combo Tasty Brother':                 1,
  'Combo Tasty Brother Especial':        1,
  'Combo Sweet Brother Especial':        1,
  'Combo Sweet Brother Premium':         1,
  'Combo Tasty Brother Premium':         1,
}

// Brothers incluyen snack en lugar de segunda pizza
const BROTHERS_COMBOS = [
  'Combo Sweet Brother',
  'Combo Tasty Brother',
  'Combo Tasty Brother Especial',
  'Combo Sweet Brother Especial',
  'Combo Sweet Brother Premium',
  'Combo Tasty Brother Premium',
]

interface ComboSelection {
  pizzas: (Product | null)[]
  drink: Product | null
}

export default function WizardStep2() {
  const { draft, addItem, removeItem, setDeliveryFee, setStep } = useOrderStore()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [currentExtras, setCurrentExtras] = useState<OrderExtra[]>([])
  const [quantity, setQuantity] = useState(1)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Combo state
  const [comboSelection, setComboSelection] = useState<ComboSelection>({ pizzas: [], drink: null })
  const [comboStep, setComboStep] = useState<'pizza' | 'drink'>('pizza')
  const [currentPizzaSlot, setCurrentPizzaSlot] = useState(0)
  const [pizzaExtras, setPizzaExtras] = useState<OrderExtra[][]>([])

  useEffect(() => {
    async function fetchProducts() {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('available', true)
        .order('category')
        .order('name')
      setAllProducts(data ?? [])
      setLoadingProducts(false)
    }
    fetchProducts()
  }, [])

  const CATEGORY_ORDER: ProductCategory[] = [
    'pizza_40', 'pizza_specialty', 'pizza_premium',
    'combo_roman', 'combo_brothers',
    'wings_ribs', 'desserts_snacks',
  ]

  const categories = CATEGORY_ORDER.filter((cat) =>
    allProducts.some((p) => p.category === cat)
  )

  const productsInCategory = selectedCategory
    ? allProducts.filter((p) => p.category === selectedCategory)
    : []

  const isCombo = selectedProduct?.is_combo ?? false
  const allowedPizzaCategories = selectedProduct
    ? COMBO_PIZZA_RULES[selectedProduct.name] ?? []
    : []
  const totalPizzaSlots = selectedProduct
    ? COMBO_PIZZA_COUNT[selectedProduct.name] ?? 0
    : 0
  const isBrothers = selectedProduct
    ? BROTHERS_COMBOS.includes(selectedProduct.name)
    : false

  const pizzasForSlot = selectedProduct
    ? allProducts.filter((p) => {
        const slot = currentPizzaSlot
        // Para combos mixtos (Premium + Especialidad, etc.) alternar categorías
        if (allowedPizzaCategories.length === 2) {
          return p.category === allowedPizzaCategories[slot] && !p.is_combo
        }
        return allowedPizzaCategories.includes(p.category) && !p.is_combo
      })
    : []

  const drinks = allProducts.filter((p) => p.category === 'drinks')

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product)
    setCurrentExtras([])
    setQuantity(1)

    if (product.is_combo) {
      const slots = COMBO_PIZZA_COUNT[product.name] ?? 0
      setComboSelection({ pizzas: Array(slots).fill(null), drink: null })
      setComboStep('pizza')
      setCurrentPizzaSlot(0)
      setPizzaExtras(Array(slots).fill([]))
    }
  }

  function handleSelectPizzaForSlot(pizza: Product) {
    const newPizzas = [...comboSelection.pizzas]
    newPizzas[currentPizzaSlot] = pizza

    if (currentPizzaSlot < totalPizzaSlots - 1) {
      setComboSelection({ ...comboSelection, pizzas: newPizzas })
      setCurrentPizzaSlot(currentPizzaSlot + 1)
      setPizzaExtras((prev) => {
        const next = [...prev]
        next[currentPizzaSlot] = []
        return next
      })
    } else {
      setComboSelection({ ...comboSelection, pizzas: newPizzas })
      setComboStep('drink')
    }
  }

  function handleSelectDrink(drink: Product) {
    setComboSelection({ ...comboSelection, drink })
  }

  function handleAddCombo() {
    if (!selectedProduct || !comboSelection.drink) return
    if (comboSelection.pizzas.some((p) => p === null)) return

    // Agregar el combo como un item
    const extrasTotal = pizzaExtras.flat().reduce((acc, e) => acc + e.extra_price, 0)

    const item: OrderItemDraft = {
      product: selectedProduct,
      quantity: 1,
      unit_price: selectedProduct.price,
      extras: pizzaExtras.flat(),
      extras_total: extrasTotal,
      // Guardamos info del combo en el nombre para mostrar en el ticket
    }

    addItem(item)

    const updatedItems = [...draft.items, item]
    if (draft.order_type === 'delivery' && (draft.address as any)?.zone) {
      const fee = calculateDeliveryFee(updatedItems, (draft.address as any).zone.delivery_fee)
      setDeliveryFee(fee)
    }

    setSelectedProduct(null)
    setComboSelection({ pizzas: [], drink: null })
    setComboStep('pizza')
    setCurrentPizzaSlot(0)
    setPizzaExtras([])
  }

  function handleAddItem() {
    if (!selectedProduct) return

    const extrasTotal = currentExtras.reduce((acc, e) => acc + e.extra_price, 0) * quantity

    const item: OrderItemDraft = {
      product: selectedProduct,
      quantity,
      unit_price: selectedProduct.price,
      extras: currentExtras,
      extras_total: extrasTotal,
    }

    addItem(item)

    const updatedItems = [...draft.items, item]
    if (draft.order_type === 'delivery' && (draft.address as any)?.zone) {
      const fee = calculateDeliveryFee(updatedItems, (draft.address as any).zone.delivery_fee)
      setDeliveryFee(fee)
    }

    setSelectedProduct(null)
    setCurrentExtras([])
    setQuantity(1)
    setSelectedCategory(null)
  }

  function handleRemoveItem(index: number) {
    const updatedItems = draft.items.filter((_, i) => i !== index)
    if (draft.order_type === 'delivery' && (draft.address as any)?.zone) {
      const fee = calculateDeliveryFee(updatedItems, (draft.address as any).zone.delivery_fee)
      setDeliveryFee(fee)
    }
    removeItem(index)
  }

  function handleContinue() {
    if (draft.order_type === 'delivery' && (draft.address as any)?.zone) {
      const { meets, reason } = meetsZoneMinimum(draft.items, (draft.address as any).zone.label)
      if (!meets) { alert(reason); return }
    }
    setStep(3)
  }

  const isPizza = (category: string) =>
    ['pizza_40', 'pizza_specialty', 'pizza_premium'].includes(category)

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 14,
    fontFamily: 'inherit',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    cursor: 'pointer',
    textAlign: 'left' as const,
  }

  const btnStyle = (active: boolean) => ({
    padding: '5px 14px',
    borderRadius: 20,
    border: '1px solid',
    borderColor: active ? 'var(--primary)' : 'var(--border)',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-2)',
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  })

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* Catálogo */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        {/* Sin producto seleccionado — mostrar catálogo */}
        {!selectedProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Catálogo
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  style={btnStyle(selectedCategory === cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {selectedCategory && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 10,
              }}>
                {productsInCategory.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    style={cardStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{
                      height: 56,
                      borderRadius: 6,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: 'var(--text-3)',
                      overflow: 'hidden',
                    }}>
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                        : 'Sin foto'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2 }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
                      Q{product.price.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Producto seleccionado — no combo */}
        {selectedProduct && !isCombo && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--primary)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            maxWidth: 480,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{selectedProduct.name}</div>
                <div style={{ fontSize: 13, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  Q{selectedProduct.price.toFixed(2)}
                </div>
              </div>
              <button onClick={() => { setSelectedProduct(null); setSelectedCategory(null) }} style={{ fontSize: 12, color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cambiar
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Cantidad</span>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: 30, height: 30, border: 'none', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>−</button>
                <span style={{ minWidth: 28, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} style={{ width: 30, height: 30, border: 'none', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>+</button>
              </div>
            </div>

            {isPizza(selectedProduct.category) && (
              <ExtrasSelector
                productId={selectedProduct.id}
                currentExtras={currentExtras}
                onExtrasChange={setCurrentExtras}
              />
            )}

            <button onClick={handleAddItem} style={{ width: '100%', padding: '11px', background: 'var(--primary)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Agregar a la orden
            </button>
          </div>
        )}

        {/* Combo seleccionado */}
        {selectedProduct && isCombo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>

            {/* Header del combo */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--primary)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{selectedProduct.name}</div>
                <div style={{ fontSize: 13, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>Q{selectedProduct.price.toFixed(2)}</div>
              </div>
              <button onClick={() => { setSelectedProduct(null); setSelectedCategory(null) }} style={{ fontSize: 12, color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cambiar
              </button>
            </div>

            {/* Progreso del combo */}
            <div style={{ display: 'flex', gap: 6 }}>
              {comboSelection.pizzas.map((p, i) => (
                <div key={i} style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 7,
                  border: '1px solid',
                  borderColor: p ? 'var(--success)' : i === currentPizzaSlot && comboStep === 'pizza' ? 'var(--primary)' : 'var(--border)',
                  background: p ? 'var(--success-bg)' : 'transparent',
                  fontSize: 11,
                  color: p ? 'var(--success)' : 'var(--text-3)',
                  textAlign: 'center' as const,
                }}>
                  {p ? p.name : `Pizza ${i + 1}`}
                </div>
              ))}
              <div style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 7,
                border: '1px solid',
                borderColor: comboSelection.drink ? 'var(--success)' : comboStep === 'drink' ? 'var(--primary)' : 'var(--border)',
                background: comboSelection.drink ? 'var(--success-bg)' : 'transparent',
                fontSize: 11,
                color: comboSelection.drink ? 'var(--success)' : 'var(--text-3)',
                textAlign: 'center' as const,
              }}>
                {comboSelection.drink ? comboSelection.drink.name : 'Bebida'}
              </div>
            </div>

            {/* Selección de pizza */}
            {comboStep === 'pizza' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                  Selecciona pizza {currentPizzaSlot + 1} de {totalPizzaSlots}
                  <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>
                    ({allowedPizzaCategories.length === 2
                      ? CATEGORY_LABELS[allowedPizzaCategories[currentPizzaSlot]]
                      : allowedPizzaCategories.map((c) => CATEGORY_LABELS[c]).join(' o ')})
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                  {pizzasForSlot.map((pizza) => (
                    <button
                      key={pizza.id}
                      onClick={() => handleSelectPizzaForSlot(pizza)}
                      style={{ ...cardStyle, border: '1px solid var(--border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div style={{ height: 48, borderRadius: 6, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-3)', overflow: 'hidden' }}>
                        {pizza.image_url ? <img src={pizza.image_url} alt={pizza.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} /> : 'Sin foto'}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2 }}>{pizza.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selección de bebida */}
            {comboStep === 'drink' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                  Selecciona bebida incluida
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                  {drinks.map((drink) => (
                    <button
                      key={drink.id}
                      onClick={() => handleSelectDrink(drink)}
                      style={{
                        ...cardStyle,
                        border: `1px solid ${comboSelection.drink?.id === drink.id ? 'var(--primary)' : 'var(--border)'}`,
                        background: comboSelection.drink?.id === drink.id ? 'var(--primary-bg)' : 'var(--surface)',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{drink.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Incluida</div>
                    </button>
                  ))}
                </div>

                {comboSelection.drink && (
                  <button
                    onClick={handleAddCombo}
                    style={{ width: '100%', padding: '12px', background: 'var(--primary)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Agregar combo a la orden
                  </button>
                )}

                <button
                  onClick={() => setComboStep('pizza')}
                  style={{ fontSize: 12, color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ← Cambiar pizzas
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ticket lateral */}
      <div style={{ width: 320, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Ticket actual</div>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{draft.items.length} item{draft.items.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px' }}>
          {draft.items.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                  {item.quantity}× {item.product.name}
                </div>
                {item.extras.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    + {item.extras.map((e) => e.ingredient.name).join(', ')}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>
                  Q{(item.unit_price * item.quantity + item.extras_total).toFixed(2)}
                </div>
              </div>
              <button onClick={() => handleRemoveItem(index)} style={{ fontSize: 11, color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                Quitar
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)' }}>
            <span>Subtotal</span><span>Q{draft.subtotal.toFixed(2)}</span>
          </div>
          {draft.order_type === 'delivery' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)' }}>
              <span>Envío</span>
              <span style={{ color: draft.delivery_fee === 0 ? 'var(--success)' : 'var(--text-2)' }}>
                {draft.delivery_fee === 0 ? 'Gratis' : `Q${draft.delivery_fee.toFixed(2)}`}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, marginTop: 4 }}>
            <span style={{ color: 'var(--text-1)' }}>Total</span>
            <span style={{ color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
              Q{draft.total.toFixed(2)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
              ← Atrás
            </button>
            {draft.items.length > 0 && (
              <button onClick={handleContinue} style={{ flex: 2, padding: '10px', background: 'var(--primary)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Confirmar →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}