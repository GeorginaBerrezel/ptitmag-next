-- Clôture commande : avoir déduit à la clôture, commande figée.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

COMMENT ON COLUMN orders.closed_at IS 'Date de clôture admin — total et avoir définitifs.';
COMMENT ON COLUMN orders.credit_applied IS 'Avoir déduit à la clôture (CHF), 0 avant clôture.';

CREATE INDEX IF NOT EXISTS idx_orders_closed_at ON orders (closed_at);
