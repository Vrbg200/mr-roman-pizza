'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types'
import { formatDistanceToNow, differenceInSeconds } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  order: Order
  onUpdated: () => void
}

const OVEN_ALERT_SECONDS = 5 * 60  // 5 min — alerta si no marcó en horno
const OVEN_COOK_SECONDS  = 6 * 60  // 6 min — tiempo en horno antes de pasar a listo

export default function KitchenOrderCard({ order, onUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [ovenElapsed, setOvenElapsed] = useState(0)
  const [printing, setPrinting] = useState(false)
  const supabase = createClient()

  const totalPizzas = order.items?.filter((i) =>
    ['pizza_40', 'pizza_specialty', 'pizza_premium'].includes(i.product?.category ?? '')
  ).reduce((acc, i) => acc + i.quantity, 0) ?? 0

  const isLate = order.status === 'preparing' && elapsed > OVEN_ALERT_SECONDS

  // Timer para pedidos en preparación (alerta 5 min)
  useEffect(() => {
    if (order.status !== 'preparing') return
    function tick() {
      setElapsed(differenceInSeconds(new Date(), new Date(order.confirmed_at)))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [order.confirmed_at, order.status])

  // Timer para pedidos en horno (auto ready a los 6 min)
  const autoReady = useCallback(async () => {
    await supabase
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', order.id)
    onUpdated()
  }, [order.id])

  useEffect(() => {
    if (order.status !== 'in_oven' || !order.in_oven_at) return

    function tick() {
      const secs = differenceInSeconds(new Date(), new Date(order.in_oven_at!))
      setOvenElapsed(secs)

      // Auto pasar a ready después de 6 min
      if (secs >= OVEN_COOK_SECONDS) {
        autoReady()
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [order.status, order.in_oven_at, autoReady])

  async function updateStatus(newStatus: OrderStatus) {
    setLoading(true)
    const updates: any = { status: newStatus }
    if (newStatus === 'in_oven') updates.in_oven_at = new Date().toISOString()
    await supabase.from('orders').update(updates).eq('id', order.id)
    onUpdated()
    setLoading(false)
  }

  async function incrementCompleted() {
    if (order.pizzas_completed >= totalPizzas) return
    setLoading(true)
    await supabase
      .from('orders')
      .update({ pizzas_completed: order.pizzas_completed + 1 })
      .eq('id', order.id)
    onUpdated()
    setLoading(false)
  }

  async function decrementCompleted() {
    if (order.pizzas_completed <= 0) return
    setLoading(true)
    await supabase
      .from('orders')
      .update({ pizzas_completed: order.pizzas_completed - 1 })
      .eq('id', order.id)
    onUpdated()
    setLoading(false)
  }

  async function handlePrintAndDispatch() {
    setPrinting(true)
    const ticketContent = generateTicket(order)
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) { setPrinting(false); return }
    printWindow.document.write(ticketContent)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()

    const newStatus = order.type === 'pickup' ? 'delivered' : 'in_delivery'
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)
    onUpdated()
    setPrinting(false)
  }

  function formatTimer(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const timerPct = Math.min(100, (elapsed / OVEN_ALERT_SECONDS) * 100)
  const ovenPct  = Math.min(100, (ovenElapsed / OVEN_COOK_SECONDS) * 100)

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${isLate ? 'var(--danger)' : 'var(--border)'}`,
      borderRadius: 12,
      padding: 16,
      transition: 'border-color 0.3s',
    }}>

      {/* Alerta retraso */}
      {isLate && (
        <div style={{
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger)',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>⚠</span>
          <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>
            Retraso — no marcado en horno a tiempo
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--primary)',
            }}>
              #{order.order_number ?? '—'}
            </span>
            <span style={{
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 6,
              background: order.type === 'delivery' ? 'var(--info-bg)' : 'var(--success-bg)',
              color: order.type === 'delivery' ? 'var(--info)' : 'var(--success)',
              fontWeight: 600,
            }}>
              {order.type === 'delivery' ? 'Domicilio' : 'Recoger'}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
            {order.client?.name ?? 'Cliente'}
          </div>
        </div>
        <span style={{
          fontSize: 11,
          color: isLate ? 'var(--danger)' : 'var(--text-3)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 7,
          padding: '4px 9px',
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
        }}>
          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
        </span>
      </div>

      {/* Items */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '12px 0',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        marginBottom: 12,
      }}>
        {order.items?.map((item) => (
          <div key={item.id} style={{ display: 'flex', gap: 9 }}>
            <span style={{
              fontWeight: 700,
              color: 'var(--accent)',
              minWidth: 22,
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {item.quantity}×
            </span>
            <div>
              <span style={{ fontSize: 14, color: 'var(--text-1)' }}>{item.product?.name}</span>
              {item.extras && item.extras.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  + {item.extras.map((e: any) => e.ingredient?.name).join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Timer preparando */}
      {order.status === 'preparing' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Sin hornear
            </span>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: isLate ? 'var(--timer-warn)' : 'var(--timer-ok)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {formatTimer(elapsed)} min
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2 }}>
            <div style={{
              height: 4,
              borderRadius: 2,
              background: isLate ? 'var(--danger)' : 'var(--warning)',
              width: `${timerPct}%`,
              transition: 'width 1s linear',
            }} />
          </div>
        </div>
      )}

      {/* Timer horno — automático */}
      {order.status === 'in_oven' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              En horno — listo automático
            </span>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--info)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {formatTimer(Math.max(0, OVEN_COOK_SECONDS - ovenElapsed))} min
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2 }}>
            <div style={{
              height: 4,
              borderRadius: 2,
              background: 'var(--info)',
              width: `${ovenPct}%`,
              transition: 'width 1s linear',
            }} />
          </div>
        </div>
      )}

      {/* Contador pizzas en horno */}
      {order.status === 'in_oven' && totalPizzas > 1 && (
        <div style={{
          background: 'var(--info-bg)',
          border: '1px solid var(--info)',
          borderRadius: 8,
          padding: '8px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <span style={{ fontSize: 11, color: 'var(--info)', fontWeight: 500 }}>
            Pizzas listas: {order.pizzas_completed}/{totalPizzas}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={decrementCompleted}
              disabled={loading || order.pizzas_completed <= 0}
              style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--info-bg)', border: '1px solid var(--info)', color: 'var(--info)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
            >−</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)', fontFamily: "'JetBrains Mono', monospace" }}>
              {order.pizzas_completed}
            </span>
            <button
              onClick={incrementCompleted}
              disabled={loading || order.pizzas_completed >= totalPizzas}
              style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--info-bg)', border: '1px solid var(--info)', color: 'var(--info)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
            >+</button>
          </div>
        </div>
      )}

      {/* Acción: solo marcar en horno */}
      {order.status === 'preparing' && (
        <button
          onClick={() => updateStatus('in_oven')}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
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
          Marcar en horno
        </button>
      )}

      {/* En horno — sin botón, timer automático */}
      {order.status === 'in_oven' && (
        <div style={{
          padding: '10px',
          background: 'var(--info-bg)',
          border: '1px solid var(--info)',
          borderRadius: 9,
          textAlign: 'center' as const,
          fontSize: 12,
          color: 'var(--info)',
          fontWeight: 500,
        }}>
          🔥 Cocinando — pasará a listo automáticamente
        </div>
      )}
    </div>
  )
}

function generateTicket(order: Order): string {
  const date = new Date(order.confirmed_at)
  const dateStr = date.toLocaleDateString('es-GT')
  const timeStr = date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })

  const itemsHTML = order.items?.map((item) => {
    const extrasText = item.extras && item.extras.length > 0
      ? `<div style="padding-left:12px;font-size:11px;color:#555;margin-bottom:4px">+ ${item.extras.map((e: any) => e.ingredient?.name).join(', ')}</div>`
      : ''
    const extrasPrice = item.extras_total > 0
      ? `<div style="display:flex;justify-content:space-between;padding-left:12px;font-size:11px;margin-bottom:4px"><span>Extras</span><span>Q${item.extras_total.toFixed(2)}</span></div>`
      : ''
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:3px">
        <span>${item.quantity}x ${item.product?.name}</span>
        <span>Q${(item.unit_price * item.quantity).toFixed(2)}</span>
      </div>
      ${extrasText}
      ${extrasPrice}
    `
  }).join('') ?? ''

  const addressHTML = order.type === 'delivery' && order.address
    ? `<div style="margin-bottom:2px"><span style="color:#555;font-size:10px">Dir: </span>${(order.address as any).address}</div>`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; padding: 12px; color: #1a1a1a; }
        .center { text-align: center; }
        .logo { font-size: 15px; font-weight: 700; letter-spacing: 1px; }
        .sub { font-size: 10px; color: #666; margin-bottom: 2px; }
        .divider { border: none; border-top: 1px dashed #999; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .sm { font-size: 10px; color: #555; }
        .order-num { font-size: 28px; font-weight: 700; text-align: center; margin: 8px 0; letter-spacing: 2px; }
        .total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-top: 4px; }
        .thanks { font-size: 10px; color: #666; text-align: center; margin-top: 4px; }
        @media print { body { width: 80mm; } @page { margin: 0; size: 80mm auto; } }
      </style>
    </head>
    <body>
      <div class="center">
        <div class="logo">MR. ROMAN PIZZA</div>
        <div class="sub">Santa Lucía · 7928-8764</div>
        <div class="sub">WhatsApp: 4023-6589</div>
      </div>
      <hr class="divider">
      <div class="row"><span class="sm">Fecha:</span><span class="sm">${dateStr} ${timeStr}</span></div>
      <div class="row"><span class="sm">Tipo:</span><span class="sm">${order.type === 'delivery' ? 'Domicilio' : 'Recoger en local'}</span></div>
      <div class="row"><span class="sm">Cliente:</span><span class="sm">${order.client?.name ?? '—'}</span></div>
      <div class="row"><span class="sm">Tel:</span><span class="sm">${order.client?.phone ?? '—'}</span></div>
      ${addressHTML}
      <hr class="divider">
      <div class="order-num">#${order.order_number ?? '—'}</div>
      <hr class="divider">
      ${itemsHTML}
      <hr class="divider">
      <div class="row"><span>Subtotal</span><span>Q${order.subtotal.toFixed(2)}</span></div>
      <div class="row"><span>Envío</span><span>${order.delivery_fee === 0 ? 'GRATIS' : `Q${order.delivery_fee.toFixed(2)}`}</span></div>
      <div class="total"><span>TOTAL</span><span>Q${order.total.toFixed(2)}</span></div>
      <div class="row" style="margin-top:4px"><span class="sm">Pago:</span><span class="sm">${order.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}</span></div>
      <hr class="divider">
      <div class="thanks">¡Gracias por tu pedido!</div>
      <div class="thanks">Pizzas diferentes para gustos exigentes</div>
    </body>
    </html>
  `
}