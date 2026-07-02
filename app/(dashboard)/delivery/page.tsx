import Topbar from '@/components/shared/Topbar'
import DeliveryPanel from '@/components/delivery/DeliveryPanel'

export default function DeliveryPage() {
  return (
    <>
      <Topbar title="Entregas" hint="Repartidor · ruta del día" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <DeliveryPanel />
      </div>
    </>
  )
}