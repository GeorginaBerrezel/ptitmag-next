-- Archivage admin : masquer les anciennes commandes livrées sans les supprimer.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN orders.archived_at IS 'Date d''archivage admin (commande masquée par défaut, toujours en base).';

CREATE INDEX IF NOT EXISTS idx_orders_archived_at ON orders (archived_at);
