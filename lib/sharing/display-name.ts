import type { Profile } from '@/lib/supabase/auth'

export function memberFirstName(profile: Pick<Profile, 'first_name' | 'full_name'> | null | undefined): string {
  const first = profile?.first_name?.trim()
  if (first) return first
  const fromFull = profile?.full_name?.trim().split(/\s+/)[0]
  if (fromFull) return fromFull
  return 'Membre'
}
