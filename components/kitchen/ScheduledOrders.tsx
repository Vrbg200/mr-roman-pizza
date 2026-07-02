'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { format, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import KitchenOrderCard from './KitchenOrderCard'

export default function ScheduledOrders() {
  const [orders, setOrders] = useState<Order[]>([])

  async function fetchScheduled() {
    const supabase = createClient()
    const now = new Date()

    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(name, phone),
        address:client_addresses(address, sector, zone:zones(label)),
        items:order_items(
          *,
          product:products(name, category),
          extras:order_item_extras(*, ingredient:ingredients(name))
        )
      `)
      .not('scheduled_for', 'is', null)
      .in('status', ['preparing', 'in_oven'])
      .order('scheduled_for', { ascending: true })

    if (!data) return

    const visible = data.filter((order) => {
      const scheduledAt = new Date(order.scheduled_for!)
      const minutesUntil = differenceInMinutes(scheduledAt, now)

      const totalPizzas = order.items?.filter((i: any) =>
        ['pizza_40', 'pizza_specialty', 'pizza_premium'].includes(i.product?.category ?? '')
      ).reduce((acc: number, i: any) => acc + i.quantity, 0) ?? 0

      let threshold = 60
      if (totalPizzas >= 11 && totalPizzas <= 15) threshold = 90
      if (totalPizzas > 15) threshold = 120

      return minutesUntil <= threshold && minutesUntil > -30
    })

    setOrders(visible as Order[])
  }

  useEffect(() => {
    fetchScheduled()
    const interval = setInterval(fetchScheduled, 60000)
    return () => clearInterval(interval)
  }, [])

  if (orders.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--primary)',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
          Pedidos agendados próximos ({orders.length})
        </span>
      </div>
      {orders.map((order) => (
        <div key={order.id}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
            Entrega: {format(new Date(order.scheduled_for!), "dd MMM 'a las' HH:mm", { locale: es })}
          </div>
          <KitchenOrderCard order={order} onUpdated={fetchScheduled} />
        </div>
      ))}
    </div>
  )
}