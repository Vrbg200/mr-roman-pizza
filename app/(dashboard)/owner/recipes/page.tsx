import Topbar from '@/components/shared/Topbar'
import RecipeManager from '@/components/owner/RecipeManager'

export default function OwnerRecipesPage() {
  return (
    <>
      <Topbar title="Recetas" hint="Owner · ingredientes por pizza" />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <RecipeManager />
      </div>
    </>
  )
}