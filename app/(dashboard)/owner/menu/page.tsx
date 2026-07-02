import Topbar from '@/components/shared/Topbar'
import MenuManager from '@/components/owner/MenuManager'

export default function OwnerMenuPage() {
  return (
    <>
      <Topbar title="Menú" hint="Owner · gestión de productos" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <MenuManager />
      </div>
    </>
  )
}