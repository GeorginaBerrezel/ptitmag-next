import type { Profile } from '@/lib/supabase/auth'

export function memberPublicName(
  profile: Pick<Profile, 'first_name' | 'last_name' | 'full_name'> | null | undefined,
): string {
  const first = profile?.first_name?.trim()
  const last = profile?.last_name?.trim()
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  const full = profile?.full_name?.trim()
  if (full) return full
  return 'Membre'
}

export function memberFirstName(profile: Pick<Profile, 'first_name' | 'full_name'> | null | undefined): string {
  const first = profile?.first_name?.trim()
  if (first) return first
  const fromFull = profile?.full_name?.trim().split(/\s+/)[0]
  if (fromFull) return fromFull
  return 'Membre'
}
