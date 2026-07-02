'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import KitchenOrderCard from './KitchenOrderCard'
import KitchenReadyPanel from './KitchenReadyPanel'
import ScheduledOrders from './ScheduledOrders'

export default function KitchenQueue() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'queue' | 'ready'>('queue')

  const fetchOrders = useCallback(async () => {
    const supabase = createClient()
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
      .in('status', ['preparing', 'in_oven', 'ready'])
      .is('scheduled_for', null)
      .order('created_at', { ascending: true })

    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
    const supabase = createClient()
    const channel = supabase
      .channel('kitchen-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  const preparing = orders.filter((o) => o.status === 'preparing')
  const inOven    = orders.filter((o) => o.status === 'in_oven')
  const ready     = orders.filter((o) => o.status === 'ready')

  if (loading) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando cola...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => setView('queue')}
          style={{
            padding: '7px 18px',
            borderRadius: 20,
            border: '1px solid',
            borderColor: view === 'queue' ? 'var(--primary)' : 'var(--border)',
            background: view === 'queue' ? 'var(--primary)' : 'transparent',
            color: view === 'queue' ? '#fff' : 'var(--text-2)',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cola ({preparing.length + inOven.length})
        </button>
        <button
          onClick={() => setView('ready')}
          style={{
            padding: '7px 18px',
            borderRadius: 20,
            border: '1px solid',
            borderColor: view === 'ready'
              ? 'var(--success)'
              : ready.length > 0
              ? 'var(--success)'
              : 'var(--border)',
            background: view === 'ready'
              ? 'var(--success)'
              : ready.length > 0
              ? 'var(--success-bg)'
              : 'transparent',
            color: view === 'ready'
              ? '#fff'
              : ready.length > 0
              ? 'var(--success)'
              : 'var(--text-2)',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Listos para despachar ({ready.length})
        </button>
      </div>

      {view === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ScheduledOrders />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>

            {/* Nuevos */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--info)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Nuevos</span>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--text-3)',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '1px 9px',
                }}>
                  {preparing.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {preparing.map((order) => (
                  <KitchenOrderCard key={order.id} order={order} onUpdated={fetchOrders} />
                ))}
                {preparing.length === 0 && (
                  <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 26, textAlign: 'center' as const, fontSize: 13, color: 'var(--text-3)' }}>
                    Sin pedidos
                  </div>
                )}
              </div>
            </div>

            {/* En horno */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--warning)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>En horno</span>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--text-3)',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '1px 9px',
                }}>
                  {inOven.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {inOven.map((order) => (
                  <KitchenOrderCard key={order.id} order={order} onUpdated={fetchOrders} />
                ))}
                {inOven.length === 0 && (
                  <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 26, textAlign: 'center' as const, fontSize: 13, color: 'var(--text-3)' }}>
                    Sin pedidos
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'ready' && (
        <KitchenReadyPanel orders={ready} onUpdated={fetchOrders} />
      )}
    </div>
  )
}