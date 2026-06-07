import { Link } from '@/i18n/navigation'

type Item = {
  label: string
  href?: `/${string}`
}

export default function AdminBreadcrumb({ items }: { items: Item[] }) {
  return (
    <nav aria-label="Fil d'ariane" className="admin-breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="admin-breadcrumb__segment">
          {index > 0 ? <span aria-hidden className="admin-breadcrumb__sep">›</span> : null}
          {item.href ? (
            <Link href={item.href} className="admin-breadcrumb__link">
              {item.label}
            </Link>
          ) : (
            <span className="admin-breadcrumb__current" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
