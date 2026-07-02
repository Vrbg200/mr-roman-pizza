import { OrderItemDraft } from '@/lib/store/orderStore'

const PIZZA_CATEGORIES = ['pizza_40', 'pizza_specialty', 'pizza_premium']
const WINGS_RIBS_CATEGORIES = ['wings_ribs']

export function calculateDeliveryFee(
  items: OrderItemDraft[],
  baseFee: number
): number {
  const totalPizzas = items
    .filter((i) => PIZZA_CATEGORIES.includes(i.product.category))
    .reduce((acc, i) => acc + i.quantity, 0)

  const totalWingsRibs = items
    .filter((i) => WINGS_RIBS_CATEGORIES.includes(i.product.category))
    .reduce((acc, i) => acc + i.quantity, 0)

  if (totalPizzas >= 6 || totalWingsRibs >= 4) return 0
  return baseFee
}

export function meetsZoneMinimum(
  items: OrderItemDraft[],
  zoneLabel: string
): { meets: boolean; reason?: string } {
  const COMBO_CATEGORIES = ['combo_roman', 'combo_brothers']

  // Si hay cualquier combo, cumple el mínimo automáticamente
  const hasCombo = items.some((i) => COMBO_CATEGORIES.includes(i.product.category))
  if (hasCombo) return { meets: true }

  const totalPizzas40 = items
    .filter((i) => i.product.category === 'pizza_40')
    .reduce((acc, i) => acc + i.quantity, 0)

  const totalPremium = items
    .filter((i) => i.product.category === 'pizza_premium')
    .reduce((acc, i) => acc + i.quantity, 0)

  const totalSpecialty = items
    .filter((i) => i.product.category === 'pizza_specialty')
    .reduce((acc, i) => acc + i.quantity, 0)

  const totalWingsRibs = items
    .filter((i) => i.product.category === 'wings_ribs')
    .reduce((acc, i) => acc + i.quantity, 0)

  if (zoneLabel === 'A' || zoneLabel === 'B') {
    if (totalPizzas40 >= 1 || totalPremium >= 1 || totalSpecialty >= 1 || totalWingsRibs >= 1)
      return { meets: true }
    return {
      meets: false,
      reason: 'Zona A/B requiere mínimo 1 pizza o 1 orden de alitas/costillas',
    }
  }

  if (zoneLabel === 'C') {
    if (totalPremium >= 1 || totalPizzas40 >= 2 || totalWingsRibs >= 1)
      return { meets: true }
    return {
      meets: false,
      reason: 'Zona C requiere mínimo 1 pizza premium, 2 pizzas de 40, o 1 orden de alitas/costillas',
    }
  }

  return { meets: true }
}

export function calculateEstimatedTime(pizzasInQueue: number): number {
  if (pizzasInQueue <= 0) return 30
  return 30 + (pizzasInQueue - 1) * 10
}