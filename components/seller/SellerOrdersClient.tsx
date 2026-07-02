'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props { sellerId: string }

const STATUS_LABELS: Record<OrderStatus, string> = {
  preparing:   'Preparando',
  in_oven:     'En horno',
  ready:       'Listo',
  in_delivery: 'En entrega',
  delivered:   'Entregado',
}

const STATUS_COLORS: Record<OrderStatus, { color: string; bg: string }> = {
  preparing:   { color: 'var(--info)',    bg: 'var(--info-bg)'    },
  in_oven:     { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  ready:       { color: 'var(--success)', bg: 'var(--success-bg)' },
  in_delivery: { color: '#A78BFA',        bg: '#1F1F2E'           },
  delivered:   { color: 'var(--text-3)',  bg: 'var(--surface-2)'  },
}

export default function SellerOrdersClient({ sellerId }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(name, phone),
        items:order_items(quantity, product:products(name))
      `)
      .eq('seller_id', sellerId)
      .not('status', 'eq', 'delivered')
      .order('created_at', { ascending: false })

    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }, [sellerId])

  useEffect(() => {
    fetchOrders()
    const supabase = createClient()
    const channel = supabase
      .channel('seller-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  if (loading) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando pedidos...</div>

  if (orders.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 300,
        gap: 8,
      }}>
        <div style={{ fontSize: 32 }}>🍕</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)' }}>No hay pedidos activos</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {orders.map((order) => {
        const sc = STATUS_COLORS[order.status]
        return (
          <div key={order.id} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--primary)',
                }}>
                  #{order.order_number ?? '—'}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                    {order.client?.name ?? 'Cliente'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: sc.color,
                background: sc.bg,
                padding: '3px 8px',
                borderRadius: 6,
              }}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {order.items?.map((item, i) => (
                <span key={i} style={{
                  fontSize: 12,
                  color: 'var(--text-2)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '2px 8px',
                }}>
                  {item.quantity}× {item.product?.name}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {order.type === 'delivery' ? 'Domicilio' : 'Recoger en local'}
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--accent)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Q{order.total.toFixed(2)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}