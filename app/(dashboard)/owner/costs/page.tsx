import Topbar from '@/components/shared/Topbar'
import CostManager from '@/components/owner/CostManager'

export default function OwnerCostsPage() {
  return (
    <>
      <Topbar title="Costos y ganancias" hint="Owner · costo por pizza y margen" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <CostManager />
      </div>
    </>
  )
}