-- Autoriser le statut « closed » (clôture admin après livraison).

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('confirmed', 'delivered', 'closed', 'cancelled'));
