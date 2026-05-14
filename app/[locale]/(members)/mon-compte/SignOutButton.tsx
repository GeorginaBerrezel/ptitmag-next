'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/fr/connexion')
    router.refresh()
  }

  return (
    <button onClick={handleSignOut} className="btn">
      Se déconnecter
    </button>
  )
}
