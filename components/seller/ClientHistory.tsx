'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  clientId: string
}

interface LastOrder {
  order_number: number | null
  total: number
  created_at: string
  items: { quantity: number; product_name: string }[]
}

export default function ClientHistory({ clientId }: Props) {
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null)
  const [frequent, setFrequent] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      const supabase = createClient()

      // Última orden
      const { data: lastOrderData } = await supabase
        .from('orders')
        .select(`
          order_number,
          total,
          created_at,
          items:order_items(quantity, product:products(name))
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastOrderData) {
        setLastOrder({
          order_number: lastOrderData.order_number,
          total: lastOrderData.total,
          created_at: lastOrderData.created_at,
          items: (lastOrderData.items as any[]).map((i) => ({
            quantity: i.quantity,
            product_name: i.product?.name ?? '—',
          })),
        })
      }

      // Productos frecuentes
      const { data: allOrders } = await supabase
        .from('orders')
        .select('items:order_items(quantity, product:products(name))')
        .eq('client_id', clientId)
        .limit(20)

      if (allOrders) {
        const productCount: Record<string, number> = {}
        for (const order of allOrders) {
          for (const item of (order.items as any[])) {
            const name = item.product?.name ?? '—'
            productCount[name] = (productCount[name] ?? 0) + item.quantity
          }
        }

        const sorted = Object.entries(productCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }))

        setFrequent(sorted)
      }

      setLoading(false)
    }

    fetchHistory()
  }, [clientId])

  if (loading) return null
  if (!lastOrder && frequent.length === 0) return null

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {lastOrder && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>
            Último pedido
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              {lastOrder.items.slice(0, 2).map((item, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  {item.quantity}× {item.product_name}
                </div>
              ))}
              {lastOrder.items.length > 2 && (
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  +{lastOrder.items.length - 2} más
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' as const }}>
              {lastOrder.order_number && (
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--primary)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  #{lastOrder.order_number}
                </div>
              )}
              <div style={{
                fontSize: 12,
                color: 'var(--accent)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Q{lastOrder.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {frequent.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>
            Pide frecuentemente
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {frequent.map((p) => (
              <span key={p.name} style={{
                fontSize: 11,
                color: 'var(--text-2)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '2px 8px',
              }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}