'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

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

export default function OwnerOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'all'>('active')

  const fetchOrders = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('orders')
      .select(`
        *,
        client:clients(name, phone),
        items:order_items(quantity, product:products(name))
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (filter === 'active') {
      query = query.not('status', 'eq', 'delivered')
    }

    const { data } = await query
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    fetchOrders()
    const supabase = createClient()
    const channel = supabase
      .channel('owner-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  return (
    <div style={{ maxWidth: 720 }}>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { key: 'active', label: 'Activos' },
          { key: 'all', label: 'Todos' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as 'active' | 'all')}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: filter === f.key ? 'var(--primary)' : 'var(--border)',
              background: filter === f.key ? 'var(--primary)' : 'transparent',
              color: filter === f.key ? '#fff' : 'var(--text-2)',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando pedidos...</div>
      ) : orders.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin pedidos</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map((order) => {
            const sc = STATUS_COLORS[order.status]
            return (
              <div key={order.id} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    minWidth: 44,
                  }}>
                    #{order.order_number ?? '—'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>
                      {order.client?.name ?? 'Cliente'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {order.items?.map((item, i) => (
                        <span key={i} style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {item.quantity}× {item.product?.name}{i < (order.items?.length ?? 0) - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
                      {' · '}
                      {order.type === 'delivery' ? 'Domicilio' : 'Recoger'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: sc.color,
                    background: sc.bg,
                    padding: '3px 8px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                  }}>
                    {STATUS_LABELS[order.status]}
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
      )}
    </div>
  )
}