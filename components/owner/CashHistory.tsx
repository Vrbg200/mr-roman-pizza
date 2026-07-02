'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CashSession {
  id: string
  opened_at: string
  closed_at: string
  estimated_total: number
  opened_by_user: { name: string }
  closed_by_user: { name: string } | null
  payment_summary: {
    cash: number
    card: number
    physical_cash?: number
    physical_card?: number
    diff_cash?: number
    diff_card?: number
    notes?: string
    orders_count?: number
  }
}

export default function CashHistory() {
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSessions() {
      const supabase = createClient()
      const { data } = await supabase
        .from('cash_sessions')
        .select(`
          *,
          opened_by_user:users!cash_sessions_opened_by_fkey(name),
          closed_by_user:users!cash_sessions_closed_by_fkey(name)
        `)
        .not('closed_at', 'is', null)
        .order('opened_at', { ascending: false })
        .limit(30)
      setSessions((data as CashSession[]) ?? [])
      setLoading(false)
    }
    fetchSessions()
  }, [])

  if (loading) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando historial...</div>

  if (sessions.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 40,
        textAlign: 'center' as const,
        fontSize: 13,
        color: 'var(--text-3)',
      }}>
        Sin cierres de caja registrados
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sessions.map((session) => {
        const summary = session.payment_summary
        const isExpanded = expanded === session.id
        const hasDisc = (summary.diff_cash ?? 0) < 0 || (summary.diff_card ?? 0) < 0

        return (
          <div key={session.id} style={{
            background: 'var(--surface)',
            border: `1px solid ${hasDisc ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setExpanded(isExpanded ? null : session.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left' as const,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                  {format(new Date(session.opened_at), "dd 'de' MMM yyyy", { locale: es })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {format(new Date(session.opened_at), 'HH:mm')} →{' '}
                  {format(new Date(session.closed_at), 'HH:mm')} ·{' '}
                  {summary.orders_count ?? 0} pedidos
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {hasDisc && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--danger)',
                    background: 'var(--danger-bg)',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}>
                    Diferencia
                  </span>
                )}
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  Q{session.estimated_total.toFixed(2)}
                </span>
                <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div style={{
                borderTop: '1px solid var(--border)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Efectivo', value: summary.cash, physical: summary.physical_cash, diff: summary.diff_cash, color: 'var(--success)', bg: 'var(--success-bg)' },
                    { label: 'Tarjeta',  value: summary.card, physical: summary.physical_card, diff: summary.diff_card,  color: 'var(--info)',    bg: 'var(--info-bg)'    },
                  ].map((s) => (
                    <div key={s.label} style={{
                      background: s.bg,
                      borderRadius: 8,
                      padding: '10px 12px',
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: s.color,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        Q{s.value.toFixed(2)}
                      </div>
                      {s.physical !== undefined && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                          Contado: Q{s.physical.toFixed(2)}
                          <span style={{
                            marginLeft: 6,
                            fontWeight: 600,
                            color: (s.diff ?? 0) >= 0 ? s.color : 'var(--danger)',
                          }}>
                            ({(s.diff ?? 0) >= 0 ? '+' : ''}{(s.diff ?? 0).toFixed(2)})
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {summary.notes && (
                  <div style={{
                    background: 'var(--surface-2)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    color: 'var(--text-2)',
                  }}>
                    {summary.notes}
                  </div>
                )}

                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  Abierto por {session.opened_by_user?.name} ·
                  Cerrado por {session.closed_by_user?.name ?? 'desconocido'}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}