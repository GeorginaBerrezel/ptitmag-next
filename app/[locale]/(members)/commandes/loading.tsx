import { InlineStatus } from '@/components/ui/InlineStatus'

export default function CommandesLoading() {
  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      <InlineStatus message="Ouverture du catalogue…" centered live="polite" />
    </div>
  )
}
