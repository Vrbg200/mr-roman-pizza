import Topbar from '@/components/shared/Topbar'
import CashHistory from '@/components/owner/CashHistory'

export default function OwnerCashPage() {
  return (
    <>
      <Topbar title="Caja" hint="Owner · historial de cierres" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <CashHistory />
      </div>
    </>
  )
}