import Topbar from '@/components/shared/Topbar'
import OwnerOrdersClient from '@/components/owner/OwnerOrdersClient'

export default function OwnerOrdersPage() {
  return (
    <>
      <Topbar title="Pedidos" hint="Owner · todos los pedidos activos" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <OwnerOrdersClient />
      </div>
    </>
  )
}