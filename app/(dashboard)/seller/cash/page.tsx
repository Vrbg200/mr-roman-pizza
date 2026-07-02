import Topbar from '@/components/shared/Topbar'
import CashRegister from '@/components/seller/CashRegister'
import { createClient } from '@/lib/supabase/server'

export default async function SellerCashPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <Topbar title="Caja" hint="Vendedor · apertura y cierre" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <CashRegister userId={user!.id} />
      </div>
    </>
  )
}