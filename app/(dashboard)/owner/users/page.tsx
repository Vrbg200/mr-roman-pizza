import Topbar from '@/components/shared/Topbar'
import UserManager from '@/components/owner/UserManager'

export default function OwnerUsersPage() {
  return (
    <>
      <Topbar title="Usuarios" hint="Owner · gestión de accesos" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <UserManager />
      </div>
    </>
  )
}