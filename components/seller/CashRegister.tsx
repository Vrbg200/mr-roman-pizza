'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CashSession {
  id: string
  opened_at: string
  estimated_total: number
  payment_summary: { cash: number; card: number }
}

interface Props {
  userId: string
}

export default function CashRegister({ userId }: Props) {
  const [session, setSession] = useState<CashSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closed, setClosed] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [physicalCash, setPhysicalCash] = useState('')
  const [physicalCard, setPhysicalCard] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => { fetchSession() }, [])

  async function fetchSession() {
    const supabase = createClient()
    const { data } = await supabase
      .from('cash_sessions')
      .select('*')
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)
      .single()

    setSession(data ?? null)

    if (data) {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, total, payment_method, client:clients(name), items:order_items(quantity, product:products(name))')
        .eq('status', 'delivered')
        .gte('confirmed_at', data.opened_at)
        .order('created_at', { ascending: false })
      setOrders(ordersData ?? [])
    }

    setLoading(false)
  }

  async function handleOpen() {
    setOpening(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('cash_sessions')
      .insert({
        opened_by: userId,
        estimated_total: 0,
        payment_summary: { cash: 0, card: 0 },
      })
      .select()
      .single()
    setSession(data)
    setOpening(false)
  }

  async function handleClose() {
    if (!session) return
    setClosing(true)
    const supabase = createClient()

    const totalCash = orders.filter((o) => o.payment_method === 'cash').reduce((acc, o) => acc + o.total, 0)
    const totalCard = orders.filter((o) => o.payment_method === 'card').reduce((acc, o) => acc + o.total, 0)
    const totalRevenue = totalCash + totalCard

    await supabase
      .from('cash_sessions')
      .update({
        closed_by: userId,
        estimated_total: totalRevenue,
        payment_summary: {
          cash: totalCash,
          card: totalCard,
          physical_cash: parseFloat(physicalCash) || 0,
          physical_card: parseFloat(physicalCard) || 0,
          diff_cash: (parseFloat(physicalCash) || 0) - totalCash,
          diff_card: (parseFloat(physicalCard) || 0) - totalCard,
          notes,
          orders_count: orders.length,
        },
        closed_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    setClosed(true)
    setClosing(false)
  }

  const totalCash = orders.filter((o) => o.payment_method === 'cash').reduce((acc, o) => acc + o.total, 0)
  const totalCard = orders.filter((o) => o.payment_method === 'card').reduce((acc, o) => acc + o.total, 0)
  const totalRevenue = totalCash + totalCard

  const diffCash = physicalCash ? parseFloat(physicalCash) - totalCash : null
  const diffCard = physicalCard ? parseFloat(physicalCard) - totalCard : null

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-1)',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
  }

  if (loading) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando caja...</div>

  if (closed) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 300,
        gap: 12,
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--success-bg)',
          border: '1px solid var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}>
          ✓
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Caja cerrada</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Total del día: Q{totalRevenue.toFixed(2)}
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          textAlign: 'center' as const,
        }}>
          <div style={{ fontSize: 32 }}>🗃️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
              No hay caja abierta
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Abre la caja para comenzar a registrar ventas del día
            </div>
          </div>
          <button
            onClick={handleOpen}
            disabled={opening}
            style={{
              padding: '12px 28px',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: 9,
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {opening ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Estado de caja */}
      <div style={{
        background: 'var(--success-bg)',
        border: '1px solid var(--success)',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>
            Caja abierta
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            Desde {format(new Date(session.opened_at), "HH:mm 'del' dd MMM", { locale: es })}
          </div>
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--accent)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          Q{totalRevenue.toFixed(2)}
        </div>
      </div>

      {/* Resumen */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
          Resumen del día
        </div>
        {[
          { label: 'Pedidos entregados', value: orders.length.toString() },
          { label: 'Efectivo', value: `Q${totalCash.toFixed(2)}`, color: 'var(--success)' },
          { label: 'Tarjeta', value: `Q${totalCard.toFixed(2)}`, color: 'var(--info)' },
          { label: 'Total', value: `Q${totalRevenue.toFixed(2)}`, color: 'var(--accent)', bold: true },
        ].map((row) => (
          <div key={row.label} style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: row.bold ? 15 : 13,
            fontWeight: row.bold ? 700 : 400,
            borderTop: row.bold ? '1px solid var(--border)' : 'none',
            paddingTop: row.bold ? 8 : 0,
          }}>
            <span style={{ color: 'var(--text-2)' }}>{row.label}</span>
            <span style={{
              color: row.color ?? 'var(--text-1)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Conteo físico */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
          Conteo físico (opcional)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
              Efectivo contado
            </label>
            <input
              type="number"
              value={physicalCash}
              onChange={(e) => setPhysicalCash(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
            {diffCash !== null && (
              <div style={{
                fontSize: 11,
                marginTop: 4,
                fontWeight: 600,
                color: diffCash >= 0 ? 'var(--success)' : 'var(--danger)',
              }}>
                {diffCash >= 0 ? '+' : ''}{diffCash.toFixed(2)} vs sistema
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
              Tarjeta contada
            </label>
            <input
              type="number"
              value={physicalCard}
              onChange={(e) => setPhysicalCard(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
            {diffCard !== null && (
              <div style={{
                fontSize: 11,
                marginTop: 4,
                fontWeight: 600,
                color: diffCard >= 0 ? 'var(--success)' : 'var(--danger)',
              }}>
                {diffCard >= 0 ? '+' : ''}{diffCard.toFixed(2)} vs sistema
              </div>
            )}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
            Notas
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones del día..."
            rows={2}
            style={{
              ...inputStyle,
              resize: 'none' as const,
            }}
          />
        </div>
      </div>

      {/* Pedidos del día */}
      {orders.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
          maxHeight: 280,
          overflowY: 'auto' as const,
        }}>
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-2)',
          }}>
            Pedidos del día ({orders.length})
          </div>
          {orders.map((order, index) => (
            <div key={order.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: index < orders.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>
                  {order.client?.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                  {order.items?.map((i: any) => `${i.quantity}× ${i.product?.name}`).join(', ')}
                </div>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  Q{order.total.toFixed(2)}
                </div>
                <div style={{
                  fontSize: 11,
                  color: order.payment_method === 'cash' ? 'var(--success)' : 'var(--info)',
                  marginTop: 1,
                }}>
                  {order.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cerrar caja */}
      <button
        onClick={handleClose}
        disabled={closing}
        style={{
          width: '100%',
          padding: '13px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 9,
          color: 'var(--text-1)',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {closing ? 'Cerrando...' : 'Cerrar caja del día'}
      </button>
    </div>
  )
}