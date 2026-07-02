import Topbar from '@/components/shared/Topbar'
import KitchenInventoryInput from '@/components/kitchen/KitchenInventoryInput'

export default function KitchenInventoryPage() {
  return (
    <>
      <Topbar title="Inventario" hint="Cocina · registro físico de ingredientes" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <KitchenInventoryInput />
      </div>
    </>
  )
}