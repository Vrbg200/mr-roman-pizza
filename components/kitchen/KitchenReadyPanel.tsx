'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  orders: Order[]
  onUpdated: () => void
}

export default function KitchenReadyPanel({ orders, onUpdated }: Props) {
  const [printing, setPrinting] = useState<string | null>(null)

  async function handlePrintAndDispatch(order: Order) {
    setPrinting(order.id)

    const ticketContent = generateTicket(order)
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (printWindow) {
      printWindow.document.write(ticketContent)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }

    const supabase = createClient()
    const newStatus = order.type === 'pickup' ? 'delivered' : 'in_delivery'
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)
    onUpdated()
    setPrinting(null)
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
        <div style={{ fontSize: 40 }}>✓</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Sin pedidos listos por despachar</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {orders.map((order) => (
        <div key={order.id} style={{
          background: 'var(--surface)',
          border: '2px solid var(--success)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 22,
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
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
              </div>
            </div>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--success-bg)',
              border: '1px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}>
              ✓
            </div>
          </div>

          {/* Items */}
          <div style={{
            padding: '10px 0',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
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
                  <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{item.product?.name}</span>
                  {item.extras && item.extras.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                      + {item.extras.map((e: any) => e.ingredient?.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {order.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
            </span>
            <span style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--accent)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Q{order.total.toFixed(2)}
            </span>
          </div>

          {/* Botón despachar */}
          <button
            onClick={() => handlePrintAndDispatch(order)}
            disabled={printing === order.id}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: 9,
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {printing === order.id ? 'Imprimiendo...' : '🖨 Imprimir y despachar'}
          </button>
        </div>
      ))}
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
      ${extrasText}${extrasPrice}
    `
  }).join('') ?? ''

  const addressHTML = order.type === 'delivery' && order.address
    ? `<div style="margin-bottom:2px"><span style="color:#555;font-size:10px">Dir: </span>${(order.address as any).address}</div>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',monospace;font-size:12px;width:280px;padding:12px;color:#1a1a1a}
      .center{text-align:center}.logo{font-size:15px;font-weight:700;letter-spacing:1px}
      .sub{font-size:10px;color:#666;margin-bottom:2px}
      .divider{border:none;border-top:1px dashed #999;margin:8px 0}
      .row{display:flex;justify-content:space-between;margin-bottom:3px}
      .sm{font-size:10px;color:#555}
      .order-num{font-size:28px;font-weight:700;text-align:center;margin:8px 0;letter-spacing:2px}
      .total{display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-top:4px}
      .thanks{font-size:10px;color:#666;text-align:center;margin-top:4px}
      @media print{body{width:80mm}@page{margin:0;size:80mm auto}}
    </style></head><body>
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
  </body></html>`
}