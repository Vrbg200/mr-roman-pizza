'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DeliveryPanel() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [delivering, setDelivering] = useState(false)
  const [view, setView] = useState<'list' | 'route'>('list')

  const fetchOrders = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(name, phone),
        address:client_addresses(address, sector),
        items:order_items(
          quantity,
          product:products(name, category)
        )
      `)
      .eq('status', 'in_delivery')
      .order('order_number', { ascending: true })

    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()

    const supabase = createClient()
    const channel = supabase
      .channel('delivery-panel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, fetchOrders)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  function toggleSelect(orderId: string) {
    const next = new Set(selected)
    if (next.has(orderId)) {
      next.delete(orderId)
    } else {
      next.add(orderId)
    }
    setSelected(next)
  }

  function selectAll() {
    setSelected(new Set(orders.map((o) => o.id)))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function handleDelivered(orderId: string) {
    const supabase = createClient()
    await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId)

    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(orderId)
      return next
    })
    fetchOrders()
  }

  async function handleDeliverSelected() {
    if (selected.size === 0) return
    setDelivering(true)
    const supabase = createClient()

    for (const orderId of selected) {
      await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId)
    }

    setSelected(new Set())
    fetchOrders()
    setDelivering(false)
    setView('list')
  }

  const selectedOrders = orders.filter((o) => selected.has(o.id))

  if (loading) {
    return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando entregas...</div>
  }

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
        <div style={{ fontSize: 32 }}>🛵</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)' }}>No hay entregas pendientes</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* Header con tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'list', label: 'Pedidos' },
            { key: 'route', label: `Ruta (${selected.size})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as 'list' | 'route')}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: view === tab.key ? 'var(--primary)' : 'var(--border)',
                background: view === tab.key ? 'var(--primary)' : 'transparent',
                color: view === tab.key ? '#fff' : 'var(--text-2)',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === 'list' && orders.length > 0 && (
          <button
            onClick={selected.size === orders.length ? clearSelection : selectAll}
            style={{
              fontSize: 12,
              color: 'var(--primary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {selected.size === orders.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
        )}
      </div>

      {/* Vista: lista de pedidos */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map((order) => {
            const isSelected = selected.has(order.id)
            return (
              <div
                key={order.id}
                style={{
                  background: 'var(--surface)',
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: 14,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onClick={() => toggleSelect(order.id)}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 11,
                      color: '#fff',
                    }}>
                      {isSelected && '✓'}
                    </div>
                    <div>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--primary)',
                        lineHeight: 1,
                      }}>
                        #{order.order_number ?? '—'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500, marginTop: 3 }}>
                        {order.client?.name ?? 'Cliente'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      Q{order.total.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {order.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div style={{
                  padding: '8px 0',
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}>
                  {order.items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                      <span style={{
                        fontWeight: 700,
                        color: 'var(--accent)',
                        fontFamily: "'JetBrains Mono', monospace",
                        minWidth: 22,
                      }}>
                        {item.quantity}×
                      </span>
                      <span style={{ color: 'var(--text-1)' }}>{item.product?.name}</span>
                    </div>
                  ))}
                </div>

                {/* Dirección */}
                {order.address && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                    marginBottom: 10,
                  }}>
                    <span style={{ fontSize: 13 }}>📍</span>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-1)' }}>
                        {(order.address as any).address}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                        {(order.address as any).sector}
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón entregado individual */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelivered(order.id) }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--success-bg)',
                    border: '1px solid var(--success)',
                    borderRadius: 8,
                    color: 'var(--success)',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Entregado
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Vista: ruta seleccionada */}
      {view === 'route' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selected.size === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 40,
              color: 'var(--text-3)',
              fontSize: 13,
            }}>
              Selecciona pedidos desde la lista para ver tu ruta
            </div>
          ) : (
            <>
              {selectedOrders.map((order, index) => (
                <div key={order.id} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 14,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                  }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {index + 1}
                    </div>
                    <div>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--primary)',
                      }}>
                        #{order.order_number ?? '—'}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-2)', marginLeft: 8 }}>
                        {order.client?.name}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    padding: '8px 0',
                    borderTop: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}>
                    {order.items?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                        <span style={{
                          fontWeight: 700,
                          color: 'var(--accent)',
                          fontFamily: "'JetBrains Mono', monospace",
                          minWidth: 22,
                        }}>
                          {item.quantity}×
                        </span>
                        <span style={{ color: 'var(--text-1)' }}>{item.product?.name}</span>
                      </div>
                    ))}
                  </div>

                  {order.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 13 }}>📍</span>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-1)' }}>
                          {(order.address as any).address}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                          {(order.address as any).sector}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      Q{order.total.toFixed(2)}
                    </div>
                    <button
                      onClick={() => handleDelivered(order.id)}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--success-bg)',
                        border: '1px solid var(--success)',
                        borderRadius: 8,
                        color: 'var(--success)',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Entregado
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleDeliverSelected}
                disabled={delivering}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: 'var(--success)',
                  border: 'none',
                  borderRadius: 9,
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                {delivering ? 'Marcando...' : `Marcar todos como entregados (${selected.size})`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}