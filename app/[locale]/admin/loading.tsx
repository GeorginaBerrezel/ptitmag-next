import { InlineStatus } from '@/components/ui/InlineStatus'

export default function AdminLoading() {
  return (
    <div className="admin-page">
      <InlineStatus message="Chargement…" centered live="polite" />
    </div>
  )
}
