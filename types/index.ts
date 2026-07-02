export type Role = 'owner' | 'seller' | 'kitchen' | 'delivery'

export type OrderStatus =
  | 'preparing'
  | 'in_oven'
  | 'ready'
  | 'in_delivery'
  | 'delivered'

export type OrderType = 'delivery' | 'pickup'

export type PaymentMethod = 'cash' | 'card'

export type InventoryLogType =
  | 'physical_count'
  | 'restock'
  | 'consumption_estimated'

export type ZoneLabel = 'A' | 'B' | 'C'

export type ProductCategory =
  | 'pizza_40'
  | 'pizza_specialty'
  | 'pizza_premium'
  | 'combo_roman'
  | 'combo_brothers'
  | 'desserts_snacks'
  | 'wings_ribs'
  | 'drinks'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  created_at: string
}

export interface Client {
  id: string
  name: string
  phone: string
  nit: string | null
  email: string | null
  created_at: string
  phones?: ClientPhone[]
  addresses?: ClientAddress[]
}

export interface ClientPhone {
  id: string
  client_id: string
  phone: string
  is_primary: boolean
}

export interface ClientAddress {
  id: string
  client_id: string
  address: string
  sector: string
  zone_id: string | null
  is_default: boolean
  zone?: Zone
}

export interface Zone {
  id: string
  name: string
  label: ZoneLabel
  min_pizzas_40: number
  min_wings_ribs: number
  free_delivery_pizzas: number
  free_delivery_items: number
  delivery_fee: number
}

export interface ZoneSector {
  id: string
  zone_id: string
  sector_name: string
}

export interface Product {
  id: string
  name: string
  category: ProductCategory
  price: number
  available: boolean
  is_combo: boolean
  image_url: string | null
  created_at: string
}

export interface ComboItem {
  id: string
  combo_id: string
  product_id: string | null
  allowed_category: ProductCategory | null
  quantity: number
  slot_label: string | null
}

export interface Ingredient {
  id: string
  name: string
  unit: string
  optimal_weekly: number
  alert_low_pct: number
  alert_critical_pct: number
  active: boolean
  created_at: string
}

export interface Recipe {
  id: string
  product_id: string
  ingredient_id: string
  quantity_base: number
  is_extra_eligible: boolean
  ingredient?: Ingredient
}

export interface IngredientCost {
  id: string
  ingredient_id: string
  registered_by: string
  quantity_purchased: number
  total_cost: number
  cost_per_unit: number
  purchase_date: string
  notes: string | null
  created_at: string
  ingredient?: Ingredient
}

export interface InventoryLog {
  id: string
  ingredient_id: string
  registered_by: string
  quantity: number
  type: InventoryLogType
  notes: string | null
  log_date: string
  created_at: string
}

export interface Order {
  id: string
  client_id: string
  seller_id: string
  address_id: string | null
  type: OrderType
  status: OrderStatus
  subtotal: number
  delivery_fee: number
  total: number
  payment_method: PaymentMethod
  pizzas_completed: number
  order_number: number | null
  confirmed_at: string
  in_oven_at: string | null
  edit_deadline: string
  scheduled_for: string | null
  created_at: string
  client?: Client
  address?: ClientAddress
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  extras_total: number
  product?: Product
  extras?: OrderItemExtra[]
}

export interface OrderItemExtra {
  id: string
  order_item_id: string
  ingredient_id: string
  multiplier: number
  extra_price: number
  ingredient?: Ingredient
}

export interface CashSession {
  id: string
  opened_by: string
  closed_by: string | null
  estimated_total: number
  payment_summary: {
    cash: number
    card: number
    physical_cash?: number
    physical_card?: number
    diff_cash?: number
    diff_card?: number
    notes?: string
    orders_count?: number
  }
  opened_at: string
  closed_at: string | null
}

// Precios reales de extras según menú
export const EXTRA_PRICES: Record<string, number> = {
  'Queso Mozzarella':   10,
  'Pepperoni':          15,
  'Jamón':              15,
  'Bolitas de Carne':   15,
  'Salchicha Italiana': 15,
  'Tocino':             20,
  'Cebolla':             8,
  'Aceitunas Negras':    8,
  'Champiñones':        15,
  'Pimientos':          10,
  'Piña':               19,
  'Jalapeños':          10,
  'Jalapeños Mitad':     5,
  'Salsa Tomate':        5,
  'Salsa Alfredo':      10,
  'Salsa Cheddar':       5,
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  pizza_40:        'Pizzas de 1 Ingrediente',
  pizza_specialty: 'Pizzas Especialidad',
  pizza_premium:   'Pizzas Premium',
  combo_roman:     'Mr. Roman Combos',
  combo_brothers:  'Mr. Roman Brother Combos',
  desserts_snacks: 'Postres y Snacks',
  wings_ribs:      'Alitas y Costillas',
  drinks:          'Bebidas',
}

export const PIZZA_CATEGORIES: ProductCategory[] = [
  'pizza_40',
  'pizza_specialty',
  'pizza_premium',
]