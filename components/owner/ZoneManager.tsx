'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zone, ZoneSector, ZoneLabel } from '@/types'

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

export default function ZoneManager() {
  const [zones, setZones] = useState<(Zone & { sectors: ZoneSector[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [newSector, setNewSector] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  async function fetchZones() {
    const supabase = createClient()
    const { data } = await supabase
      .from('zones')
      .select('*, sectors:zone_sectors(*)')
      .order('label')
    setZones((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchZones() }, [])

  async function handleAddSector(zoneId: string) {
    const sector = newSector[zoneId]?.trim()
    if (!sector) return
    setSaving(zoneId)
    const supabase = createClient()
    await supabase.from('zone_sectors').insert({ zone_id: zoneId, sector_name: sector })
    setNewSector({ ...newSector, [zoneId]: '' })
    fetchZones()
    setSaving(null)
  }

  async function handleDeleteSector(sectorId: string) {
    const supabase = createClient()
    await supabase.from('zone_sectors').delete().eq('id', sectorId)
    fetchZones()
  }

  if (loading) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando zonas...</div>

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {zones.map((zone) => (
        <div key={zone.id} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: ZONE_BG[zone.label as ZoneLabel],
              border: `1px solid ${ZONE_COLORS[zone.label as ZoneLabel]}`,
              color: ZONE_COLORS[zone.label as ZoneLabel],
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {zone.label}
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{zone.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Envío: Q{zone.delivery_fee} · {zone.sectors.length} colonias
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {zone.sectors.map((sector) => (
              <div key={sector.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '4px 10px',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{sector.sector_name}</span>
                <button
                  onClick={() => handleDeleteSector(sector.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-3)',
                    cursor: 'pointer',
                    fontSize: 13,
                    lineHeight: 1,
                    padding: 0,
                    marginLeft: 2,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {zone.sectors.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin colonias asignadas</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newSector[zone.id] ?? ''}
              onChange={(e) => setNewSector({ ...newSector, [zone.id]: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSector(zone.id)}
              placeholder="Nueva colonia o sector"
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-1)',
                fontFamily: 'inherit',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleAddSector(zone.id)}
              disabled={saving === zone.id}
              style={{
                padding: '8px 14px',
                background: 'var(--primary)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {saving === zone.id ? '...' : 'Agregar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}