'use client'

import { useState } from 'react'
import { Client, ClientAddress, OrderType } from '@/types'
import { useOrderStore } from '@/lib/store/orderStore'
import ClientSearch from './ClientSearch'
import ClientForm from './ClientForm'
import AddressSelector from './AddressSelector'
import ClientHistory from './ClientHistory'

export default function WizardStep1() {
  const { draft, setClient, setAddress, setOrderType, setStep } = useOrderStore()
  const [mode, setMode] = useState<'search' | 'create'>('search')
  const [noZone, setNoZone] = useState(false)

  function handleOrderType(type: OrderType) {
    setOrderType(type)
    if (type === 'pickup') { setAddress(null); setNoZone(false) }
  }

  function handleNoZone() {
    setNoZone(true)
    setOrderType('pickup')
    setAddress(null)
  }

  const canContinue =
    draft.client &&
    (draft.order_type === 'pickup' ||
      (draft.order_type === 'delivery' && draft.address))

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      padding: 24,
      maxWidth: 560,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Búsqueda / creación */}
        {!draft.client ? (
          mode === 'search' ? (
            <ClientSearch
              onClientFound={(client) => setClient(client)}
              onCreateNew={() => setMode('create')}
            />
          ) : (
            <ClientForm
              onClientCreated={(client) => { setClient(client); setMode('search') }}
              onCancel={() => setMode('search')}
            />
          )
        ) : (
          <>
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
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                  {draft.client.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {draft.client.phone}
                </div>
              </div>
              <button
                onClick={() => { useOrderStore.getState().resetDraft() }}
                style={{
                  fontSize: 11,
                  color: 'var(--text-3)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cambiar
              </button>
            </div>
            <ClientHistory clientId={draft.client.id} />
          </>
        )}

        {/* Tipo de entrega */}
        {draft.client && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
              Tipo de entrega
            </div>
            {noZone && (
              <div style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--danger)',
              }}>
                Sin cobertura para esa colonia. Solo disponible recoger en local.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { key: 'delivery' as OrderType, label: 'Domicilio', disabled: noZone },
                { key: 'pickup' as OrderType, label: 'Recoger en local', disabled: false },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => !opt.disabled && handleOrderType(opt.key)}
                  disabled={opt.disabled}
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: draft.order_type === opt.key ? 'var(--primary)' : 'var(--border)',
                    background: draft.order_type === opt.key ? 'var(--primary-bg)' : 'transparent',
                    color: draft.order_type === opt.key ? 'var(--primary)' : 'var(--text-2)',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    opacity: opt.disabled ? 0.4 : 1,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dirección */}
        {draft.client && draft.order_type === 'delivery' && (
          <AddressSelector
            client={draft.client}
            onAddressSelected={(addr) => setAddress(addr)}
            onNoZone={handleNoZone}
          />
        )}

        {/* Continuar */}
        {canContinue && (
          <button
            onClick={() => setStep(2)}
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
            Continuar a productos →
          </button>
        )}
      </div>
    </div>
  )
}