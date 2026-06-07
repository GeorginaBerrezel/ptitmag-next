import { InlineStatus } from '@/components/ui/InlineStatus'

export default function AdminLoading() {
  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <InlineStatus message="Chargement…" centered live="polite" />
    </div>
  )
}
