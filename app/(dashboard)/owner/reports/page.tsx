import Topbar from '@/components/shared/Topbar'
import PurchaseProjection from '@/components/owner/PurchaseProjection'
import WasteReport from '@/components/owner/WasteReport'

export default function OwnerReportsPage() {
  return (
    <>
      <Topbar title="Reportes" hint="Owner · proyecciones y merma" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PurchaseProjection />
        <WasteReport />
      </div>
    </>
  )
}