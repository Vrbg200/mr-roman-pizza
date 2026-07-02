import Topbar from '@/components/shared/Topbar'
import InventoryPanel from '@/components/owner/InventoryPanel'

export default function OwnerInventoryPage() {
  return (
    <>
      <Topbar title="Inventario" hint="Owner · control de ingredientes" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <InventoryPanel />
      </div>
    </>
  )
}