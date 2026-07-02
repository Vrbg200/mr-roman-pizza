import Topbar from '@/components/shared/Topbar'
import ZoneManager from '@/components/owner/ZoneManager'

export default function OwnerZonesPage() {
  return (
    <>
      <Topbar title="Zonas" hint="Owner · colonias y cobertura" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <ZoneManager />
      </div>
    </>
  )
}