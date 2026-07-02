import Topbar from '@/components/shared/Topbar'
import SellerOrdersClient from '@/components/seller/SellerOrdersClient'
import { createClient } from '@/lib/supabase/server'

export default async function SellerOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <Topbar title="Mis pedidos" hint="Vendedor · estado de órdenes activas" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <SellerOrdersClient sellerId={user!.id} />
      </div>
    </>
  )
}