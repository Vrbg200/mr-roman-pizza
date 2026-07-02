'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Client, ClientAddress, Zone, ZoneLabel } from '@/types'

interface Props {
  client: Client
  onAddressSelected: (address: ClientAddress) => void
  onNoZone: () => void
}

export default function AddressSelector({ client, onAddressSelected, onNoZone }: Props) {
  const [showNew, setShowNew] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [newSector, setNewSector] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [zones, setZones] = useState<Zone[]>([])
  const [showZonePicker, setShowZonePicker] = useState(false)
  const [pendingSector, setPendingSector] = useState('')

  const addresses = client.addresses ?? []

  async function resolveZone(sector: string): Promise<string | null> {
    const supabase = createClient()
    const { data } = await supabase
      .from('zone_sectors')
      .select('zone_id')
      .ilike('sector_name', sector.trim())
      .single()
    return data?.zone_id ?? null
  }

  async function fetchZones() {
    const supabase = createClient()
    const { data } = await supabase.from('zones').select('*').order('label')
    setZones(data ?? [])
  }

  async function handleSelectExisting(address: ClientAddress) {
    if (!address.zone_id) { onNoZone(); return }
    onAddressSelected(address)
  }

  async function handleSaveNew() {
    if (!newAddress.trim() || !newSector.trim()) return
    setLoading(true)
    setError('')

    const zone_id = await resolveZone(newSector)

    if (!zone_id) {
      // Colonia no existe — mostrar picker de zona
      await fetchZones()
      setPendingSector(newSector.trim())
      setShowZonePicker(true)
      setLoading(false)
      return
    }

    await saveAddress(zone_id)
  }

  async function handleAssignZone(zone: Zone) {
    setLoading(true)
    setShowZonePicker(false)

    const supabase = createClient()

    // Registrar la colonia en el catálogo
    await supabase.from('zone_sectors').insert({
      zone_id: zone.id,
      sector_name: pendingSector,
    })

    await saveAddress(zone.id)
  }

  async function saveAddress(zone_id: string) {
    const supabase = createClient()

    const { data, error: dbError } = await supabase
      .from('client_addresses')
      .insert({
        client_id: client.id,
        address: newAddress.trim(),
        sector: pendingSector || newSector.trim(),
        zone_id,
        is_default: addresses.length === 0,
      })
      .select('*, zone:zones(*)')
      .single()

    if (dbError || !data) {
      setError('Error al guardar la dirección')
      setLoading(false)
      return
    }

    onAddressSelected(data as ClientAddress)
    setLoading(false)
    setShowNew(false)
    setNewAddress('')
    setNewSector('')
    setPendingSector('')
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-1)',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
  }

  const ZONE_COLORS: Record<ZoneLabel, string> = {
    A: 'var(--success)',
    B: 'var(--info)',
    C: 'var(--warning)',
  }

  const ZONE_BG: Record<ZoneLabel, string> = {
    A: 'var(--success-bg)',
    B: 'var(--info-bg)',
    C: 'var(--warning-bg)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
        Dirección de entrega
      </div>

      {/* Direcciones existentes */}
      {addresses.map((addr) => (
        <button
          key={addr.id}
          onClick={() => handleSelectExisting(addr)}
          style={{
            textAlign: 'left',
            padding: '12px 14px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
            {addr.address}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{addr.sector}</span>
            {addr.zone && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: ZONE_COLORS[(addr as any).zone?.label as ZoneLabel],
                background: ZONE_BG[(addr as any).zone?.label as ZoneLabel],
                padding: '1px 7px',
                borderRadius: 6,
              }}>
                Zona {(addr as any).zone?.label}
              </span>
            )}
          </div>
        </button>
      ))}

      {/* Picker de zona — colonia no encontrada */}
      {showZonePicker && (
        <div style={{
          background: 'var(--warning-bg)',
          border: '1px solid var(--warning)',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
              Colonia no registrada
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              "{pendingSector}" no está en el catálogo. ¿A qué zona pertenece?
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => handleAssignZone(zone)}
                style={{
                  padding: '12px 8px',
                  borderRadius: 8,
                  border: `1px solid ${ZONE_COLORS[zone.label as ZoneLabel]}`,
                  background: ZONE_BG[zone.label as ZoneLabel],
                  color: ZONE_COLORS[zone.label as ZoneLabel],
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center' as const,
                }}
              >
                Zona {zone.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setShowZonePicker(false)
              onNoZone()
            }}
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            Sin cobertura — solo recoger en local
          </button>
        </div>
      )}

      {/* Formulario nueva dirección */}
      {!showNew && !showZonePicker && (
        <button
          onClick={() => setShowNew(true)}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--primary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left' as const,
            padding: 0,
          }}
        >
          + Agregar nueva dirección
        </button>
      )}

      {showNew && !showZonePicker && (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Dirección (calle, número, referencia)"
            style={inputStyle}
          />
          <input
            type="text"
            value={newSector}
            onChange={(e) => setNewSector(e.target.value)}
            placeholder="Colonia / Sector"
            style={inputStyle}
          />
          {error && (
            <div style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSaveNew}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px',
                background: 'var(--primary)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Verificando...' : 'Confirmar'}
            </button>
            <button
              onClick={() => { setShowNew(false); setError('') }}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-3)',
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}